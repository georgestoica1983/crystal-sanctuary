import { RelicId } from "@/types/game";

/**
 * Build themes for relics (display only — no rule changes): what a line goes
 * after. Relics sharing a theme tag "fit" together; "Any build" relics help
 * every line and never count as a match.
 */
export type RelicTag =
  | "THORNS"
  | "ACORNS"
  | "CARE"
  | "SHEARS"
  | "LONG"
  | "CAREFUL"
  | "GROWING"
  | "SEEDS"
  | "ANY";

export const RELIC_TAG_INFO: Record<RelicTag, { icon: string; name: string; className: string }> = {
  THORNS: { icon: "🌺", name: "Thorns", className: "bg-rose-400/15 text-rose-100" },
  ACORNS: { icon: "🌰", name: "Acorns", className: "bg-amber-500/15 text-amber-100" },
  CARE: { icon: "🍓", name: "Berries & Gloves", className: "bg-pink-400/15 text-pink-100" },
  SHEARS: { icon: "✂️", name: "Shears", className: "bg-sky-400/15 text-sky-100" },
  LONG: { icon: "📏", name: "Long lines", className: "bg-violet-400/15 text-violet-100" },
  CAREFUL: { icon: "🛡️", name: "Careful", className: "bg-teal-400/15 text-teal-100" },
  GROWING: { icon: "🌳", name: "Growing", className: "bg-emerald-400/15 text-emerald-100" },
  SEEDS: { icon: "🌱", name: "Seeds", className: "bg-lime-400/15 text-lime-100" },
  ANY: { icon: "⭐", name: "Any build", className: "bg-white/10 text-white/75" },
};

export const RELIC_TAGS: Record<RelicId, RelicTag[]> = {
  BRIAR_PRESS: ["THORNS"],
  COMPOST_HEAP: ["THORNS", "GROWING"],
  BRAMBLE_HEART: ["THORNS"],
  THORN_CROWN: ["THORNS"],
  GILDED_AEGIS: ["ACORNS"],
  GREED_CROWN: ["ACORNS"],
  GOLDEN_BEE: ["ACORNS"],
  ALCHEMIST_FLASK: ["CARE", "CAREFUL"],
  GLASS_WATERING_CAN: ["CARE"],
  DEW_LENS: ["CARE"],
  BERRY_BASKET: ["CARE"],
  VORPAL_EDGE: ["SHEARS"],
  SPIKED_BOOTS: ["SHEARS"],
  SUN_PRISM: ["SHEARS"],
  SUNFLOWER: ["SHEARS"],
  LONG_STRIDE: ["LONG"],
  STARLIGHT_COMPASS: ["LONG"],
  HARVEST_MOON: ["LONG"],
  ZIGZAG_KITE: ["LONG"],
  THISTLE_WALTZ: ["LONG"],
  QUIET_SNAIL: ["CAREFUL"],
  DEEP_TAPROOT: ["CAREFUL"],
  ETERNAL_SPRING: ["CAREFUL"],
  OAK_SAPLING: ["GROWING"],
  RAIN_BARREL: ["GROWING"],
  ELDER_TREE: ["GROWING"],
  MAGPIE_NEST: ["SEEDS"],
  SQUIRREL_STASH: ["SEEDS"],
  SEED_PURSE: ["SEEDS"],
  SUN_HAT: ["SEEDS"],
  WISHING_WELL: ["SEEDS"],
  MOSSY_STONE: ["ANY"],
  LADYBUG: ["ANY"],
  DAWN_CHORUS: ["ANY"],
  EVENING_LANTERN: ["ANY"],
  RAINBOW_HEART: ["ANY"],
};

export const getRelicTags = (id: RelicId): RelicTag[] => RELIC_TAGS[id] ?? ["ANY"];

/** Theme tags an offered relic shares with the relics you own (never "Any build") */
export function sharedBuildTags(id: RelicId, owned: RelicId[]): RelicTag[] {
  const mine = new Set(owned.filter((o) => o !== id).flatMap(getRelicTags));
  return getRelicTags(id).filter((t) => t !== "ANY" && mine.has(t));
}

/** Your build so far: theme tags of owned relics, most common first */
export function summarizeBuild(owned: RelicId[]): Array<{ tag: RelicTag; count: number }> {
  const counts = new Map<RelicTag, number>();
  for (const id of owned) {
    for (const t of getRelicTags(id)) if (t !== "ANY") counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

/** Relic sets (rules v10+): owning this many relics with one theme tag scores every line ×RELIC_SET_X */
export const RELIC_SET_SIZE = 3;
export const RELIC_SET_X = 1.25;

/** Theme tags with a full set among the relics you own (each set counts once) */
export function completedRelicSets(owned: RelicId[]): RelicTag[] {
  return summarizeBuild(owned)
    .filter((b) => b.count >= RELIC_SET_SIZE)
    .map((b) => b.tag);
}
