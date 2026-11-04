import type { ShopOffer } from "@/types/game";
import { MAX_COMMON_RELICS, MAX_TOOLS, RUN_INTEREST_MAX, RUN_INTEREST_STEP, RUN_REROLL_BASE_COST } from "@/lib/engine";
import { RELIC_SET_X } from "@/lib/relicTags";
import { BOSS_REROLL_COST, MAX_PACKETS, RUN_BAG_MIN_SIZE, RUN_PRUNE_COST } from "@/lib/runReplay";

/**
 * What every kind of Shop offer does and how to use it: the first-time card
 * (one per Shop visit) and the Shop guide behind the ? both read from here.
 */

export type ShopGuideKind = ShopOffer["kind"] | "PRUNE";

export interface ShopGuideEntry {
  name: string;
  /** What it is, in one or two sentences */
  what: string;
  /** How to use it */
  how: string;
  /** An example offer, for its picture */
  sample?: ShopOffer;
}

export const SHOP_GUIDE: Record<ShopGuideKind, ShopGuideEntry> = {
  RELIC: {
    name: "Relics",
    what: "Lasting powers for the whole Run. Some add to every line, others reward lines that follow their rule.",
    how: `Hold up to ${MAX_COMMON_RELICS}. Tap one under Your relics to sell it for Seeds. Three relics of one family score every line ×${RELIC_SET_X}.`,
    sample: { id: "guide-relic", kind: "RELIC", relicId: "LADYBUG" as ShopOffer["relicId"], cost: 0 },
  },
  STAT: {
    name: "Boosts",
    what: "Upgrades for your Companion: more Max ❤️ Life, or 🧤 Gloves at the start of every bed.",
    how: "They work as soon as you buy them and last the whole Run.",
    sample: { id: "guide-stat", kind: "STAT", stat: "MAX_MAGIC", cost: 0 },
  },
  FERT: {
    name: "Fertilizer",
    what: "Levels up one tile type for the whole Run: every tile of that type on a line adds more Value. It stacks.",
    how: "The green +N on a tile shows what Fertilizer adds to it.",
    sample: { id: "guide-fert", kind: "FERT", fert: "POTION" as ShopOffer["fert"], cost: 0 },
  },
  TOOL: {
    name: "Garden tools",
    what: "Upgrade one tile in your bag for the rest of the Run.",
    how: `Hold up to ${MAX_TOOLS}. Under the board, tap the tool, then tap a tile.`,
    sample: { id: "guide-tool", kind: "TOOL", tool: "SUNLIT" as ShopOffer["tool"], cost: 0 },
  },
  TILE: {
    name: "Special tiles",
    what: "A shimmering tile for your bag: Golden +30 Value, Iridescent +2 Length, Radiant ×1.25 on any line through it.",
    how: "It joins your bag and turns up on later boards.",
    sample: { id: "guide-tile", kind: "TILE", tile: { type: "GOLD", value: 4, ed: "GOLDEN" }, cost: 0 },
  },
  PACKET: {
    name: "Seed packets",
    what: "One-use helpers: Life back, an extra line, a stronger next line and more.",
    how: `Hold up to ${MAX_PACKETS}. Under the board, tap a packet, then Use it.`,
    sample: { id: "guide-packet", kind: "PACKET", packet: "LONG_ROOT", cost: 0 },
  },
  UPGRADE: {
    name: "Garden upgrades",
    what: "One each Season, lasting the whole Run: a bigger interest cap, cheaper Shops or stronger Fertilizer.",
    how: "Each has a second, stronger tier that can come later.",
    sample: { id: "guide-upgrade", kind: "UPGRADE", upgrade: "MARKET_DAY" as ShopOffer["upgrade"], cost: 0 },
  },
  PRUNE: {
    name: "Prune a tile",
    what: "Take one weak tile out of your bag, so the good ones come up more often.",
    how: `Once per Shop, for ${RUN_PRUNE_COST} 🌱. Your bag never goes below ${RUN_BAG_MIN_SIZE} tiles.`,
  },
};

/** Guide order, and the order new kinds get their first-time card */
export const SHOP_GUIDE_ORDER: ShopGuideKind[] = ["RELIC", "STAT", "PACKET", "PRUNE", "FERT", "TOOL", "TILE", "UPGRADE"];

/** The rest of the Shop, in one line each */
export const SHOP_GUIDE_MORE: Array<{ name: string; text: string }> = [
  { name: "Seeds and interest", text: `Clear beds to earn 🌱. Seeds you keep earn +1 for every ${RUN_INTEREST_STEP}, up to +${RUN_INTEREST_MAX} after each bed.` },
  { name: "Reroll", text: `New offers for ${RUN_REROLL_BASE_COST} 🌱, then 1 more each time in the same Shop.` },
  { name: "New Boss", text: `Don't like the coming Boss? Swap it once per Season for ${BOSS_REROLL_COST} 🌱.` },
  { name: "Rare Shops", text: "From Season 2 a Shop is sometimes rare: a Sale, a free reroll, or a relic for free." },
];

const EXPLAINED_KEY = "ost_shop_kinds_explained_v1";

/** The first kind in this Shop that hasn't had its card yet (one per Shop visit) */
export function nextUnexplainedKind(present: ShopGuideKind[]): ShopGuideKind | null {
  let seen: string[] = [];
  try {
    seen = JSON.parse(window.localStorage.getItem(EXPLAINED_KEY) ?? "[]");
    if (!Array.isArray(seen)) seen = [];
  } catch {
    return null;
  }
  return SHOP_GUIDE_ORDER.find((k) => present.includes(k) && !seen.includes(k)) ?? null;
}

export function markKindExplained(kind: ShopGuideKind): void {
  try {
    const seen: string[] = JSON.parse(window.localStorage.getItem(EXPLAINED_KEY) ?? "[]");
    if (!seen.includes(kind)) window.localStorage.setItem(EXPLAINED_KEY, JSON.stringify([...seen, kind]));
  } catch {
    // Ignore storage errors
  }
}
