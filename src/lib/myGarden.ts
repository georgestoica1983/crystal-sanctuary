// My Garden: a permanent garden on this device that only grows. Every Garden
// Bed you clear plants a flower (a Boss plants a rare one, a full Season a
// tree, a first relic set a special flower). Nothing is ever lost — after a
// few days away it only looks sleepy. Cosmetic: it never changes scoring.
import type { BossRuleId, RunGardenKind } from "@/types/game";
import type { RelicTag } from "@/lib/relicTags";
import { tileArt } from "@/lib/art";

const GARDEN_KEY = "ost_garden_v1";
const GARDEN_INTRO_KEY = "ost_garden_intro_v1";

export type PlantKind = "SMALL" | "BIG" | "BOSS" | "SEASON" | "SET";

export interface Plant {
  /** Unique per Run and bed, so a reload never plants twice */
  id: string;
  kind: PlantKind;
  species: string;
  golden?: boolean;
  from: { season: number; bed: number; score: number };
  /** When it was planted (ms) */
  at: number;
}

export interface MyGarden {
  plants: Plant[];
  /** Relic set themes already celebrated with a special flower */
  setsDone: RelicTag[];
  lastVisit?: number;
}

/** Flowers each kind of bed can plant (picked by the bed, so a Run looks varied) */
const SPECIES: Record<Exclude<PlantKind, "BOSS" | "SET">, string[]> = {
  SMALL: ["Daisy", "Clover", "Buttercup", "Violet"],
  BIG: ["Tulip", "Iris", "Foxglove", "Lily"],
  SEASON: ["Young Oak", "Lilac Bush", "Rowan", "Cherry Tree"],
};
const BOSS_SPECIES: Partial<Record<BossRuleId, string>> = {
  THISTLE_KING: "Silver Thistle",
  BRIAR_QUEEN: "Queen Rose",
  DROUGHT: "Desert Bloom",
  ECLIPSE: "Moonflower",
  FROST: "Snowdrop",
  ACORN_THIEF: "Hazel Bloom",
  SPIKE_BLOOM: "Cactus Flower",
  EVEN_GARDEN: "Twin Lily",
  NARROW_PATH: "Path Poppy",
  LONG_ROAD: "Wayfarer Aster",
  FOG: "Mist Orchid",
  TOLL: "Coin Marigold",
};

/** A soft colour shift per species, until each has its own illustration */
const SPECIES_HUE: Record<string, number> = {
  Daisy: 40, Clover: 120, Buttercup: 55, Violet: 270,
  Tulip: 0, Iris: 240, Foxglove: 300, Lily: 20,
  "Young Oak": 100, "Lilac Bush": 280, Rowan: 10, "Cherry Tree": 330,
};

/** How a plant is drawn for now: the bloom illustration, tinted */
export function plantLook(p: Plant): { src: string; filter: string } {
  const src = tileArt("ENEMY", { bloomed: true }) ?? "";
  if (p.golden) return { src, filter: "sepia(1) saturate(3) hue-rotate(5deg) brightness(1.15)" };
  const hue = SPECIES_HUE[p.species] ?? (p.kind === "BOSS" ? 200 : p.kind === "SET" ? 160 : 0);
  return { src, filter: `hue-rotate(${hue}deg)${p.kind === "BOSS" ? " saturate(1.4)" : ""}` };
}

export function loadMyGarden(): MyGarden {
  try {
    const raw = JSON.parse(window.localStorage.getItem(GARDEN_KEY) ?? "null");
    if (raw && Array.isArray(raw.plants)) return { plants: raw.plants, setsDone: raw.setsDone ?? [], lastVisit: raw.lastVisit };
  } catch {
    // Ignore storage errors
  }
  return { plants: [], setsDone: [] };
}

function saveMyGarden(g: MyGarden): void {
  try {
    window.localStorage.setItem(GARDEN_KEY, JSON.stringify(g));
  } catch {
    // Ignore storage errors
  }
}

/** Adds plants that aren't in the garden yet; returns the ones actually planted */
function addPlants(plants: Plant[], sets: RelicTag[] = []): Plant[] {
  const g = loadMyGarden();
  const have = new Set(g.plants.map((p) => p.id));
  const fresh = plants.filter((p) => !have.has(p.id));
  if (fresh.length === 0 && sets.every((t) => g.setsDone.includes(t))) return [];
  saveMyGarden({
    ...g,
    plants: [...g.plants, ...fresh],
    setsDone: Array.from(new Set([...g.setsDone, ...sets])),
  });
  return fresh;
}

/**
 * A Garden Bed bloomed: its flower (golden with 3 stars), plus a tree when it
 * finished the Season (a Boss bed).
 */
export function plantForBed(params: {
  runSeed: string;
  gardenIndex: number;
  season: number;
  kind: RunGardenKind;
  score: number;
  stars: number;
  bossRuleId?: BossRuleId;
}): Plant[] {
  const { runSeed, gardenIndex, season, kind, score } = params;
  const at = Date.now();
  const from = { season, bed: gardenIndex, score };
  const pick = (list: string[]) => list[(gardenIndex * 7 + runSeed.length) % list.length];
  const plants: Plant[] = [
    {
      id: `${runSeed}-g${gardenIndex}`,
      kind: kind === "BOSS" ? "BOSS" : kind,
      species:
        kind === "BOSS"
          ? BOSS_SPECIES[params.bossRuleId ?? "BRIAR_QUEEN"] ?? "Queen Rose"
          : pick(SPECIES[kind]),
      golden: params.stars >= 3,
      from,
      at,
    },
  ];
  if (kind === "BOSS") {
    plants.push({ id: `${runSeed}-s${season}`, kind: "SEASON", species: pick(SPECIES.SEASON), from, at });
  }
  return addPlants(plants);
}

/** A relic set completed for the first time ever: a special flower in its theme */
export function plantForSet(runSeed: string, tag: RelicTag, themeName: string, season: number): Plant[] {
  if (loadMyGarden().setsDone.includes(tag)) return [];
  return addPlants(
    [{ id: `${runSeed}-set-${tag}`, kind: "SET", species: `${themeName} Bloom`, from: { season, bed: -1, score: 0 }, at: Date.now() }],
    [tag]
  );
}

/** Plants grown during one Run (its ids start with the Run's seed) */
export function plantsFromRun(runSeed: string): Plant[] {
  return loadMyGarden().plants.filter((p) => p.id.startsWith(`${runSeed}-`));
}

/** The first time a garden is mentioned, one sentence explains it (once per device) */
export function takeGardenIntro(): boolean {
  try {
    if (window.localStorage.getItem(GARDEN_INTRO_KEY)) return false;
    window.localStorage.setItem(GARDEN_INTRO_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/** Short label for a planting line, e.g. "🌷 Tulip" or "✨ golden Daisy" */
export function plantLabel(p: Plant): string {
  const icon = p.kind === "SEASON" ? "🌳" : p.kind === "BOSS" ? "🌺" : p.kind === "SET" ? "💮" : "🌷";
  return `${icon} ${p.golden ? "golden " : ""}${p.species}`;
}

/** After this long away the garden looks sleepy (it never wilts or loses anything) */
export const SLEEPY_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

/** Opening the garden: was it sleepy, and remember this visit */
export function visitMyGarden(now = Date.now()): { garden: MyGarden; wasSleepy: boolean } {
  const garden = loadMyGarden();
  const wasSleepy = garden.plants.length > 0 && garden.lastVisit !== undefined && now - garden.lastVisit > SLEEPY_AFTER_MS;
  saveMyGarden({ ...garden, lastVisit: now });
  return { garden, wasSleepy };
}

/** Decorations that appear as the garden grows */
export const GARDEN_MILESTONES: Array<{ at: number; name: string; icon: string }> = [
  { at: 10, name: "a bench", icon: "🪑" },
  { at: 25, name: "a pond", icon: "💧" },
  { at: 50, name: "lanterns", icon: "🏮" },
  { at: 100, name: "a flower arch", icon: "🌸" },
];

/** A stable spot for a plant (0–1 across, 0–1 deep), so the garden looks the same every visit */
export function plantSpot(id: string): { x: number; y: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const a = ((h >>> 0) % 10000) / 10000;
  const b = (((h >>> 0) / 10000) % 10000) / 10000;
  return { x: 0.06 + a * 0.88, y: 0.08 + (b % 1) * 0.84 };
}

/** "3 days ago", "today" */
export function plantedAgo(at: number, now = Date.now()): string {
  const days = Math.floor((now - at) / (24 * 60 * 60 * 1000));
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}
