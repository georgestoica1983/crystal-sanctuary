import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  ResponseSchema,
} from "@google/generative-ai";
import {
  DungeonFloor,
  DungeonTheme,
  EntityType,
  FloorTier,
  GridCell,
  ModifierId,
} from "@/types/game";
import {
  consumeCrafterUse,
  CRAFTER_DAILY_LIMIT,
  findEntitlementForPlayer,
  getSupabaseAdmin,
  isValidPlayerId,
} from "@/lib/server/entitlements";
import {
  generateDeterministicDungeon,
  getTodayDateKey,
  hashStringToSeed,
  MODIFIER_REGISTRY,
  applyBossBlinds,
  mulberry32,
  validateAndRepairFloorGrid,
} from "@/lib/engine";

const DUNGEON_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description:
        "Cozy garden title (e.g., 'The Frosted Greenhouse', 'The Mirror Pond').",
    },
    lore: {
      type: SchemaType.STRING,
      description:
        "1-2 sentence atmospheric tactical flavor text describing the dungeon's hazard and mood.",
    },
    modifierId: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [
        "MIRROR_VERTICAL",
        "BLOOD_GOLD",
        "GLASS_ARMOR",
        "MOMENTUM",
        "ORTHOGONAL_ONLY",
      ],
      description: "Mechanical rule modifier governing all 3 floors.",
    },
    floors: {
      type: SchemaType.ARRAY,
      description:
        "Exactly 3 dungeon floors: Floor 1 (Skirmish), Floor 2 (Gauntlet), Floor 3 (Boss Room).",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          floorNumber: {
            type: SchemaType.INTEGER,
            description: "1, 2, or 3",
          },
          title: {
            type: SchemaType.STRING,
            description:
              "Floor title, e.g., 'Floor 1: Skirmish', 'Floor 2: Gauntlet', 'Floor 3: Boss Room'.",
          },
          subtitle: {
            type: SchemaType.STRING,
            description: "Short tactical subtitle for this floor.",
          },
          cells: {
            type: SchemaType.ARRAY,
            description:
              "25 cells representing the 5x5 grid in row-major order (row 0..4, col 0..4). Must include exactly 1 HERO and 1 EXIT.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                row: { type: SchemaType.INTEGER },
                col: { type: SchemaType.INTEGER },
                type: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: [
                    "HERO",
                    "ENEMY",
                    "SHIELD",
                    "POTION",
                    "WEAPON",
                    "GOLD",
                    "TRAP",
                    "EXIT",
                  ],
                },
                value: {
                  type: SchemaType.INTEGER,
                  description:
                    "Integer value: ENEMY (3-9), SHIELD (2-5), POTION (2-5), WEAPON (3-6), GOLD (2-6), TRAP (2-4), HERO (10), EXIT (0).",
                },
                label: {
                  type: SchemaType.STRING,
                  description: "Optional short label for boss/elite cells.",
                },
              },
              required: ["row", "col", "type", "value"],
            },
          },
        },
        required: ["floorNumber", "title", "subtitle", "cells"],
      },
    },
  },
  required: ["title", "lore", "modifierId", "floors"],
};

interface RawGeneratedDungeon {
  title: string;
  lore: string;
  modifierId: ModifierId;
  floors: Array<{
    floorNumber: number;
    title: string;
    subtitle: string;
    cells: Array<{
      row: number;
      col: number;
      type: EntityType;
      value: number;
      label?: string;
    }>;
  }>;
}

async function generateWithGemini(params: {
  seedKey: string;
  dateKey: string;
  customPrompt?: string;
  preferredModifier?: ModifierId;
}): Promise<DungeonTheme | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: DUNGEON_RESPONSE_SCHEMA,
        temperature: 0.75,
      },
    });

    const promptInstruction = params.customPrompt
      ? `Create a custom 3-floor dungeon based on the user's theme prompt: "${params.customPrompt}".`
      : `Create today's Daily Dungeon for date seed "${params.dateKey}" (seed key: "${params.seedKey}").`;

    const modifierConstraint = params.preferredModifier
      ? `You MUST select modifierId: "${params.preferredModifier}".`
      : `Choose the most fitting modifierId from: MIRROR_VERTICAL, BLOOD_GOLD, GLASS_ARMOR, MOMENTUM, ORTHOGONAL_ONLY.`;

    const systemPrompt = `You are the level designer for "Bloomline", a cozy 5x5 one-line garden puzzle (internally modelled as a path-drawing grid game). Give gardens warm, gentle names and lore.
${promptInstruction}
${modifierConstraint}

Design Rules:
- Every floor is a 5x5 grid (rows 0-4, cols 0-4, 25 cells total).
- Each floor MUST have exactly one HERO cell (typically near row 4) and one EXIT cell (typically near row 0).
- Fill the remaining 23 cells with a balanced tactical mix of ENEMY (values 3-9), SHIELD (values 2-5), WEAPON (values 3-6), POTION (values 2-5), GOLD (values 2-6), and TRAP (values 2-4).
- Floor 1 is "Floor 1: Skirmish", Floor 2 is "Floor 2: Gauntlet", Floor 3 is "Floor 3: Boss Room".`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as RawGeneratedDungeon;

    const validModifier: ModifierId =
      parsed.modifierId && MODIFIER_REGISTRY[parsed.modifierId]
        ? parsed.modifierId
        : params.preferredModifier ?? "GLASS_ARMOR";

    const rng = mulberry32(hashStringToSeed(params.seedKey));

    const builtFloors: [DungeonFloor, DungeonFloor, DungeonFloor] = [1, 2, 3].map(
      (num, idx) => {
        const floorTier = num as FloorTier;
        const rawFloor = parsed.floors?.[idx];
        const rawGrid: GridCell[][] = Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 5 }, (__, c) => ({
            id: `f${floorTier}-r${r}-c${c}`,
            row: r,
            col: c,
            type: "ENEMY" as EntityType,
            value: 3,
          }))
        );

        if (rawFloor?.cells && Array.isArray(rawFloor.cells)) {
          for (const cell of rawFloor.cells) {
            if (
              cell &&
              cell.row >= 0 &&
              cell.row <= 4 &&
              cell.col >= 0 &&
              cell.col <= 4
            ) {
              rawGrid[cell.row][cell.col] = {
                id: `f${floorTier}-r${cell.row}-c${cell.col}`,
                row: cell.row,
                col: cell.col,
                type: cell.type,
                value: cell.value,
                label: cell.label,
              };
            }
          }
        }

        const repairedGrid = validateAndRepairFloorGrid(
          rawGrid,
          floorTier,
          validModifier,
          rng
        );

        const defaultTitles: Record<FloorTier, string> = {
          1: "Floor 1: Skirmish",
          2: "Floor 2: Gauntlet",
          3: "Floor 3: Boss Room",
        };

        return {
          floorNumber: floorTier,
          title: rawFloor?.title || defaultTitles[floorTier],
          subtitle: rawFloor?.subtitle || "Tactical Sector",
          grid: repairedGrid,
        };
      }
    ) as [DungeonFloor, DungeonFloor, DungeonFloor];

    return {
      seedKey: params.seedKey,
      dateKey: params.dateKey,
      title: parsed.title || "The Glass Clockwork",
      lore:
        parsed.lore ||
        "Every stroke across the obsidian grid seals your fate in a single unbroken motion.",
      modifierId: validModifier,
      source: params.customPrompt ? "custom-crafter" : "gemini",
      customPrompt: params.customPrompt,
      floors: applyBossBlinds(builtFloors, validModifier, params.seedKey),
    };
  } catch {
    return null;
  }
}

/**
 * AI Garden Crafter (Expansion perk). The Daily never uses Gemini — it always
 * comes from generateDeterministicDungeon(dateKey) on the client.
 *
 * Requires an Expansion purchase and allows CRAFTER_DAILY_LIMIT crafts per
 * purchase per day. In local development without Supabase configured, the
 * checks are skipped so the crafter can be tested.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const customPrompt =
    typeof body.customPrompt === "string"
      ? body.customPrompt.trim().slice(0, 200)
      : "";
  if (!customPrompt) {
    return NextResponse.json({ error: "missing_prompt" }, { status: 400 });
  }

  let remainingToday: number | null = null;
  const dateKey = getTodayDateKey();
  const devBypass =
    process.env.NODE_ENV !== "production" && !getSupabaseAdmin();
  if (!devBypass) {
    if (!isValidPlayerId(body.playerId)) {
      return NextResponse.json({ error: "invalid_player" }, { status: 400 });
    }
    const entitlement = await findEntitlementForPlayer(body.playerId);
    if (!entitlement) {
      return NextResponse.json({ error: "expansion_required" }, { status: 402 });
    }
    remainingToday = await consumeCrafterUse(entitlement.id, dateKey);
    if (remainingToday === null) {
      return NextResponse.json(
        { error: "daily_limit", limit: CRAFTER_DAILY_LIMIT },
        { status: 429 }
      );
    }
  }

  const preferredModifier =
    body.preferredModifier &&
    MODIFIER_REGISTRY[body.preferredModifier as ModifierId]
      ? (body.preferredModifier as ModifierId)
      : undefined;
  const seedKey = `custom-${customPrompt}-${Date.now()}`;

  const geminiDungeon = await generateWithGemini({
    seedKey,
    dateKey,
    customPrompt,
    preferredModifier,
  });
  const dungeon =
    geminiDungeon ??
    generateDeterministicDungeon(seedKey, {
      customPrompt,
      preferredModifier,
      source: "custom-crafter",
    });

  return NextResponse.json({ ...dungeon, remainingToday });
}
