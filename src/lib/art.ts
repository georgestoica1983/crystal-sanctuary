import type { EntityType, HeroClassId, SanctuaryCompanionId } from "@/types/game";
import type { RelicTag } from "@/lib/relicTags";

/**
 * Illustrated icons (public/art/icons, cut from the Gemini icon sheet by
 * scripts/cut-icon-sheet.cjs). Each helper returns the image path, or null
 * when the thing has no illustration yet and keeps its drawn SVG.
 */
const icon = (name: string) => `/art/icons/${name}.png`;

const TILE_ART: Partial<Record<EntityType, string>> = {
  ENEMY: "tile-thorn",
  TRAP: "tile-spike",
  WEAPON: "tile-shears",
  SHIELD: "tile-gloves",
  POTION: "tile-berry",
  GOLD: "tile-acorn",
  EXIT: "tile-exit",
};

export function tileArt(type: EntityType | "POISON_POTION", opts: { bloomed?: boolean } = {}): string | null {
  if (type === "ENEMY" && opts.bloomed) return icon("tile-thorn-bloomed");
  const name = TILE_ART[type as EntityType];
  return name ? icon(name) : null;
}

const COMPANION_ART: Record<HeroClassId | SanctuaryCompanionId, string> = {
  KNIGHT: "companion-keeper",
  CAT: "companion-keeper",
  ROGUE: "companion-otter",
  OTTER: "companion-otter",
  MAGE: "companion-fox",
  FOX: "companion-fox",
  VAMPIRE: "companion-sprite",
  BUTTERFLY: "companion-sprite",
};

export const companionArt = (id: HeroClassId | SanctuaryCompanionId = "KNIGHT") =>
  icon(COMPANION_ART[id] ?? "companion-keeper");

export type StatArtId = "life" | "gloves" | "shears" | "seeds";
export const statArt = (id: StatArtId) => icon(`stat-${id}`);

const THEME_ART: Record<RelicTag, string> = {
  THORNS: "theme-thorns",
  ACORNS: "theme-acorns",
  CARE: "theme-berries-gloves",
  SHEARS: "theme-shears",
  LONG: "theme-long-lines",
  CAREFUL: "theme-careful",
  GROWING: "theme-growing",
  SEEDS: "theme-seeds",
  ANY: "theme-any",
};
export const themeArt = (tag: RelicTag) => icon(THEME_ART[tag]);
