/**
 * Line tiers: names and colours for how long a stroke is, so players can see
 * a line "grow". Purely visual — scoring is still Chips × Mult.
 */
export interface LineTier {
  level: number;
  name: string;
  minTiles: number;
  color: string;
}

export const LINE_TIERS: LineTier[] = [
  { level: 0, name: "Seedling", minTiles: 0, color: "#A5B4FC" },
  { level: 1, name: "Sprout", minTiles: 6, color: "#34D399" },
  { level: 2, name: "Vine", minTiles: 10, color: "#2DD4BF" },
  { level: 3, name: "Bloom", minTiles: 15, color: "#F472B6" },
  { level: 4, name: "Grand garden", minTiles: 20, color: "#FBBF24" },
];

export function getLineTier(tiles: number): LineTier {
  let tier = LINE_TIERS[0];
  for (const t of LINE_TIERS) if (tiles >= t.minTiles) tier = t;
  return tier;
}

export function getNextLineTier(tiles: number): LineTier | null {
  return LINE_TIERS.find((t) => t.minTiles > tiles) ?? null;
}

/**
 * One-line introductions shown the first time each tile type appears on a
 * player's board (plain words; the tile picture is shown next to it).
 */
export const TILE_INTRO_ORDER = ["ENEMY", "GOLD", "WEAPON", "POTION", "SHIELD", "TRAP"] as const;
export type IntroTileType = (typeof TILE_INTRO_ORDER)[number];
export const TILE_INTROS: Record<IntroTileType, { name: string; text: string }> = {
  ENEMY: { name: "Thorn", text: "costs ❤️ Life — the number shows how much." },
  GOLD: { name: "Seed", text: "adds its number to your points." },
  WEAPON: { name: "Shears", text: "cut the next Thorn completely — no Life lost." },
  POTION: { name: "Berries", text: "give back ❤️ Life." },
  SHIELD: { name: "Gloves", text: "block that much Thorn damage, and they last." },
  TRAP: { name: "Spike", text: "costs ❤️ Life — unless you step on it diagonally ↗." },
};
export const SEEN_TILE_INTROS_KEY = "ost_seen_tile_intros_v1";
/** Until the first line is walked, home and the Exit pulse */
export const FIRST_LINE_DONE_KEY = "ost_first_line_done_v1";

/** A stroke this long counts as "learned long lines" for first-time tips */
export const LONG_LINE_LEARNED_TILES = 12;
export const LONG_LINE_LEARNED_KEY = "ost_long_line_learned_v1";
/** Lines shorter than this that reach the Archway get a first-time nudge */
export const SHORT_LINE_NUDGE_TILES = 10;
