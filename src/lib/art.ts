import type { EntityType, HeroClassId, RelicId, SanctuaryCompanionId } from "@/types/game";
import type { RelicTag } from "@/lib/relicTags";

/**
 * Illustrated icons (public/art/icons, cut from the Gemini icon sheet by
 * scripts/cut-icon-sheet.cjs). Each helper returns the image path, or null
 * when the thing has no illustration yet and keeps its drawn SVG.
 */
export const icon = (name: string) => `/art/icons/${name}.webp`;

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
// Seeds use the brown seed badge, the same coin everywhere
export const statArt = (id: StatArtId) => icon(id === "seeds" ? "badge-seed" : `stat-${id}`);

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

/** relic-<id in kebab case>, e.g. GOLDEN_BEE → relic-golden-bee */
/** Relics still waiting for their illustrated icon: shown as their emoji until the art lands */
const RELICS_PENDING_ART: RelicId[] = [];
export const relicHasArt = (id: RelicId) => !RELICS_PENDING_ART.includes(id);
export const relicArt = (id: RelicId) => icon(`relic-${id.toLowerCase().replace(/_/g, "-")}`);

/** My Garden plant art, by species name (public/art/icons/garden-*.webp) */
export const gardenArt = (species: string) =>
  icon(`garden-${species.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`);
/** My Garden decorations (public/art/icons/decor-*.webp) */
export const decorArt = (name: string) => icon(`decor-${name}`);
/** Boss portraits (public/art/icons/boss-*.webp), e.g. ACORN_THIEF → boss-acorn-thief */
export const bossArt = (id: string) => icon(`boss-${id.toLowerCase().replace(/_/g, "-")}`);
/** Garden visitors (public/art/icons/visitor-*.webp) */
export const visitorArt = (kind: string) => icon(`visitor-${kind}`);
/** Shop supplies (public/art/icons/tool-*, upgrade-*, tag-*), e.g. RICH_SOIL → tool-rich-soil */
const kebab = (id: string) => id.toLowerCase().replace(/_/g, "-");
export const toolArt = (id: string) => icon(`tool-${kebab(id)}`);
export const upgradeArt = (id: string) => icon(`upgrade-${kebab(id)}`);
export const tagArt = (id: string) => icon(`tag-${kebab(id)}`);
/** Small badges (public/art/icons/badge-*.webp) shown next to text and numbers */
export type BadgeId = "star" | "crown" | "flame" | "lock" | "golden" | "iridescent" | "radiant" | "seed";
export const badgeArt = (id: BadgeId) => icon(`badge-${id}`);
/** Garden moments (public/art/icons/misc-*.webp): the Gardener, Swap, the Journal, Today's garden… */
export type MiscArtId = "gardener" | "swap" | "no-safe-line" | "journal" | "daily" | "music" | "hint" | "rotate-phone" | "boss-reroll"
  | "full-bloom" | "wilder" | "seedling" | "level-cleared" | "pocket" | "shop-guide";
export const miscArt = (id: MiscArtId) => icon(`misc-${id}`);
/** Bed weather (public/art/icons/weather-*.webp), e.g. GOLDEN_HOUR → weather-golden-hour */
export const weatherArt = (id: string) => icon(`weather-${kebab(id)}`);
/** Painted art for an unlock (ranks, board looks, the Botanist title, companions); null for line colours */
const UNLOCK_ART: Record<string, string> = {
  "r-seedling": "rank-seedling",
  "r-sprout": "rank-sprout",
  "r-gardener": "rank-gardener",
  "r-head": "rank-head-gardener",
  "r-star": "rank-star-gardener",
  "r-master": "rank-master-of-seasons",
  "r-endless": "rank-endless-gardener",
  "b-spring": "board-moss",
  "b-autumn": "board-autumn",
  "b-night": "board-night",
  "b-winter": "board-winter",
  "b-golden": "board-golden",
  "b-royal": "board-royal",
  "j-herbarium": "board-herbarium",
  "j-botanist": "title-botanist",
  "c-cat": "companion-keeper",
  "c-otter": "companion-otter",
  "c-butterfly": "companion-sprite",
  "c-fox": "companion-fox",
  "g-thorny": "bag-thorny",
  "g-acorn": "bag-acorn",
  "g-berry": "bag-berry",
  "g-lean": "bag-lean",
};
/** Starting bags (rules v24+), e.g. THORNY → bag-thorny */
export const bagArt = (id: string) => icon(`bag-${kebab(id)}`);
/** Rare Shop moments (rules v24+), e.g. FREE_REROLL → shop-free-reroll; a Sale is shop-sale */
export const shopMomentArt = (id: string) => icon(`shop-${kebab(id)}`);
export const unlockArt = (id: string): string | null => (UNLOCK_ART[id] ? icon(UNLOCK_ART[id]) : null);
/** A tile once the line has passed it (an opened acorn, eaten berries, a cut or wilted Thorn…) */
export type TileAfterId =
  | "acorn-gathered" | "berry-eaten" | "gloves-used" | "shears-used"
  | "spike-crossed" | "exit-open" | "thorn-cut" | "thorn-wilted";
export const tileAfterArt = (id: TileAfterId) => icon(`tile-${id}`);
/** Seed packets (rules v22+), e.g. LONG_ROOT → packet-long-root */
export const packetArt = (id: string) => icon(`packet-${kebab(id)}`);
/** The Daily grid's flowers: 3, 2 or 1 star(s), or the bed where the try stopped */
export const dailyArt = (cell: 3 | 2 | 1 | "stopped") => icon(cell === "stopped" ? "daily-stopped" : `daily-bloom-${cell}`);
