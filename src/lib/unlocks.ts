import { HeroClassId, SanctuaryCompanionId, TrailSkinId } from "@/types/game";
import { loadBestStars, totalBestStars } from "@/lib/runStars";

/**
 * Looks earned by playing (never by paying): companions, line colours and
 * Gardener ranks. Purely cosmetic — rules and scores are the same for all.
 */

export interface UnlockProgress {
  /** Best stars collected across all Garden Beds */
  stars: number;
  /** Highest Garden Bed reached (0-based run position: 3 = Season 2 Small) */
  highestBed: number;
  /** At least one Garden Bed cleared with ⭐⭐⭐ */
  hasThreeStar: boolean;
}

interface Need {
  stars?: number;
  season?: number;
  threeStar?: boolean;
}

export type UnlockItem =
  | { id: string; kind: "COMPANION"; target: SanctuaryCompanionId; icon: string; name: string; need: Need; needText: string }
  | { id: string; kind: "TRAIL"; target: TrailSkinId; icon: string; name: string; need: Need; needText: string }
  | { id: string; kind: "RANK"; icon: string; name: string; need: Need; needText: string };

export const UNLOCKS: UnlockItem[] = [
  { id: "c-cat", kind: "COMPANION", target: "CAT", icon: "🐱", name: "Cozy Cat", need: {}, needText: "From the start" },
  { id: "c-otter", kind: "COMPANION", target: "OTTER", icon: "🦦", name: "River Otter", need: { stars: 5 }, needText: "5 ⭐" },
  { id: "c-butterfly", kind: "COMPANION", target: "BUTTERFLY", icon: "🦋", name: "Crystal Butterfly", need: { season: 2 }, needText: "Reach Season 2" },
  { id: "c-fox", kind: "COMPANION", target: "FOX", icon: "🦊", name: "Starlight Fox", need: { stars: 20 }, needText: "20 ⭐" },
  { id: "t-cyan", kind: "TRAIL", target: "CYBER_CYAN", icon: "💠", name: "Cyan line", need: {}, needText: "From the start" },
  { id: "t-gold", kind: "TRAIL", target: "SOLAR_GOLD", icon: "☀️", name: "Solar Gold line", need: { threeStar: true }, needText: "A ⭐⭐⭐ Garden Bed" },
  { id: "t-emerald", kind: "TRAIL", target: "EMERALD_FLAME", icon: "🌿", name: "Emerald Flame line", need: { season: 3 }, needText: "Reach Season 3" },
  { id: "t-violet", kind: "TRAIL", target: "PLASMA_VIOLET", icon: "💜", name: "Plasma Violet line", need: { stars: 40 }, needText: "40 ⭐" },
  { id: "t-rainbow", kind: "TRAIL", target: "RAINBOW", icon: "🌈", name: "Rainbow line", need: { season: 9 }, needText: "Reach Endless (Season 9)" },
  { id: "r-seedling", kind: "RANK", icon: "🌱", name: "Seedling", need: {}, needText: "From the start" },
  { id: "r-sprout", kind: "RANK", icon: "🌿", name: "Sprout", need: { stars: 10 }, needText: "10 ⭐" },
  { id: "r-gardener", kind: "RANK", icon: "🧑‍🌾", name: "Gardener", need: { stars: 25 }, needText: "25 ⭐" },
  { id: "r-head", kind: "RANK", icon: "🏡", name: "Head Gardener", need: { stars: 50 }, needText: "50 ⭐" },
  { id: "r-master", kind: "RANK", icon: "👑", name: "Master of Seasons", need: { season: 9 }, needText: "Clear Season 8" },
  { id: "r-endless", kind: "RANK", icon: "🌌", name: "Endless Gardener", need: { season: 10 }, needText: "Reach Season 10" },
];

const HIGHEST_BED_KEY = "ost_highest_bed_v1";
const SEEN_UNLOCKS_KEY = "ost_unlocks_seen_v1";

export function isUnlocked(item: UnlockItem, p: UnlockProgress): boolean {
  const { stars, season, threeStar } = item.need;
  if (stars !== undefined && p.stars < stars) return false;
  if (season !== undefined && Math.floor(p.highestBed / 3) + 1 < season) return false;
  if (threeStar && !p.hasThreeStar) return false;
  return true;
}

export function loadUnlockProgress(): UnlockProgress {
  const best = loadBestStars();
  let highestBed = 0;
  try {
    highestBed = Number(window.localStorage.getItem(HIGHEST_BED_KEY)) || 0;
  } catch {
    // Ignore storage errors
  }
  return {
    stars: totalBestStars(best),
    highestBed,
    hasThreeStar: Object.values(best).some((n) => n >= 3),
  };
}

/** A Garden Bed was cleared: the next one (gardenIndex + 1) has been reached */
export function recordBedReached(nextGardenIndex: number): void {
  try {
    const before = Number(window.localStorage.getItem(HIGHEST_BED_KEY)) || 0;
    if (nextGardenIndex > before) window.localStorage.setItem(HIGHEST_BED_KEY, String(nextGardenIndex));
  } catch {
    // Ignore storage errors
  }
}

/** Unlocks earned since the last check (start items never count as new) */
export function takeNewUnlocks(p: UnlockProgress = loadUnlockProgress()): UnlockItem[] {
  let seen: string[] = [];
  try {
    seen = JSON.parse(window.localStorage.getItem(SEEN_UNLOCKS_KEY) || "[]");
    if (!Array.isArray(seen)) seen = [];
  } catch {
    seen = [];
  }
  const fresh = UNLOCKS.filter(
    (u) => Object.keys(u.need).length > 0 && isUnlocked(u, p) && !seen.includes(u.id)
  );
  if (fresh.length > 0) {
    try {
      window.localStorage.setItem(SEEN_UNLOCKS_KEY, JSON.stringify([...seen, ...fresh.map((u) => u.id)]));
    } catch {
      // Ignore storage errors
    }
  }
  return fresh;
}

/** Current Gardener rank and the next one to aim for */
export function getGardenerRank(p: UnlockProgress = loadUnlockProgress()): {
  rank: UnlockItem;
  next: UnlockItem | null;
} {
  const ranks = UNLOCKS.filter((u) => u.kind === "RANK");
  const earned = ranks.filter((r) => isUnlocked(r, p));
  const rank = earned[earned.length - 1] ?? ranks[0];
  const next = ranks.find((r) => !isUnlocked(r, p)) ?? null;
  return { rank, next };
}

// ── Companions in Garden Runs: each animal plays by its own rule ──

/** The Run companion (rules class) behind each animal */
export const COMPANION_CLASS: Record<SanctuaryCompanionId, HeroClassId> = {
  CAT: "KNIGHT",
  OTTER: "ROGUE",
  BUTTERFLY: "VAMPIRE",
  FOX: "MAGE",
};
export const CLASS_COMPANION: Record<HeroClassId, SanctuaryCompanionId> = {
  KNIGHT: "CAT",
  ROGUE: "OTTER",
  VAMPIRE: "BUTTERFLY",
  MAGE: "FOX",
};
/** Order shown in the New Garden Run sheet */
export const RUN_COMPANION_ORDER: HeroClassId[] = ["KNIGHT", "ROGUE", "VAMPIRE", "MAGE"];

const CHOSEN_COMPANION_KEY = "ost_run_companion_v1";

export function companionUnlockFor(classId: HeroClassId): UnlockItem {
  const target = CLASS_COMPANION[classId];
  return UNLOCKS.find((u) => u.kind === "COMPANION" && u.target === target) ?? UNLOCKS[0];
}

export function isCompanionUnlocked(classId: HeroClassId, p: UnlockProgress = loadUnlockProgress()): boolean {
  return classId === "KNIGHT" || isUnlocked(companionUnlockFor(classId), p);
}

/** Companions this device has earned (the Keeper always) */
export function unlockedRunCompanions(p: UnlockProgress = loadUnlockProgress()): HeroClassId[] {
  return RUN_COMPANION_ORDER.filter((c) => isCompanionUnlocked(c, p));
}

/** Last companion picked for a Garden Run (falls back to the Keeper if it's locked) */
export function loadChosenCompanion(fallback?: SanctuaryCompanionId): HeroClassId {
  let id: string | null = null;
  try {
    id = window.localStorage.getItem(CHOSEN_COMPANION_KEY);
  } catch {
    // Ignore storage errors
  }
  const fromLooks = fallback ? COMPANION_CLASS[fallback] : undefined;
  const pick = (RUN_COMPANION_ORDER as string[]).includes(id ?? "") ? (id as HeroClassId) : fromLooks ?? "KNIGHT";
  return isCompanionUnlocked(pick) ? pick : "KNIGHT";
}

export function saveChosenCompanion(classId: HeroClassId): void {
  try {
    window.localStorage.setItem(CHOSEN_COMPANION_KEY, classId);
  } catch {
    // Ignore storage errors
  }
}
