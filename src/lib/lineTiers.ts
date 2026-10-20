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

/** A stroke this long counts as "learned long lines" for first-time tips */
export const LONG_LINE_LEARNED_TILES = 12;
export const LONG_LINE_LEARNED_KEY = "ost_long_line_learned_v1";
/** Lines shorter than this that reach the Archway get a first-time nudge */
export const SHORT_LINE_NUDGE_TILES = 10;
