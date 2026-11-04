import { BagId, BoardThemeId, HeroClassId, SanctuaryCompanionId, TrailSkinId } from "@/types/game";
import { loadBestStars, totalBestStars } from "@/lib/runStars";
import { getRunGardenLabel, V22_RELICS } from "@/lib/engine";
import { ASCENSION_UNLOCK_BED, loadBestClearedAscension, loadUnlockedAscension } from "@/lib/ascension";
import { journalPercent } from "@/lib/journalProgress";
import { dailyArt, unlockArt } from "@/lib/art";

/**
 * Earned by playing (never by paying): companions (each with its own rule),
 * line colours, board themes and Gardener ranks.
 */

export interface UnlockProgress {
  /** Best stars collected across all Garden Beds */
  stars: number;
  /** Highest Garden Bed reached (0-based run position: 3 = Season 2 Small) */
  highestBed: number;
  /** At least one Garden Bed cleared with ⭐⭐⭐ */
  hasThreeStar: boolean;
  /** Highest Ascension level whose Season 3 Boss was beaten */
  bestAsc: number;
  /** How much of the Garden Journal is filled (0–100) */
  journalPct: number;
}

interface Need {
  stars?: number;
  season?: number;
  threeStar?: boolean;
  /** Beat the Season 3 Boss on this Ascension level */
  asc?: number;
  /** Fill this much of the Garden Journal (percent) */
  journal?: number;
}

/** The requirement in two words, for small tiles (the full needText says it in a sentence) */
export function shortNeedText(item: { need: Need; needText: string }): string {
  const n = item.need;
  if (n.stars) return `${n.stars}\u00a0⭐`;
  if (n.asc) return `Ascension ${n.asc}`;
  if (n.journal) return `Journal ${n.journal}%`;
  if (n.threeStar) return "⭐⭐⭐\u00a0bed";
  if (n.season) return n.season >= 9 ? "Endless" : `Season ${n.season}`;
  return item.needText;
}

export type UnlockItem =
  | { id: string; kind: "COMPANION"; target: SanctuaryCompanionId; icon: string; name: string; need: Need; needText: string }
  | { id: string; kind: "TRAIL"; target: TrailSkinId; icon: string; name: string; need: Need; needText: string }
  | { id: string; kind: "BOARD"; target: BoardThemeId; icon: string; name: string; need: Need; needText: string }
  | { id: string; kind: "RANK"; icon: string; name: string; need: Need; needText: string }
  | { id: string; kind: "TITLE"; icon: string; name: string; need: Need; needText: string }
  /** Rules v24+: a starting bag for new Runs */
  | { id: string; kind: "BAG"; target: BagId; icon: string; name: string; need: Need; needText: string };

export const UNLOCKS: UnlockItem[] = [
  { id: "c-cat", kind: "COMPANION", target: "CAT", icon: "🐱", name: "Cozy Cat", need: {}, needText: "From the start" },
  { id: "c-otter", kind: "COMPANION", target: "OTTER", icon: "🦦", name: "River Otter", need: { stars: 5 }, needText: "5 ⭐" },
  { id: "c-butterfly", kind: "COMPANION", target: "BUTTERFLY", icon: "🦋", name: "Crystal Butterfly", need: { season: 2 }, needText: "Reach Season 2" },
  { id: "c-fox", kind: "COMPANION", target: "FOX", icon: "🦊", name: "Starlight Fox", need: { stars: 20 }, needText: "20 ⭐" },
  { id: "t-cyan", kind: "TRAIL", target: "CYBER_CYAN", icon: "🌿", name: "Moss glow line", need: {}, needText: "From the start" },
  { id: "t-gold", kind: "TRAIL", target: "SOLAR_GOLD", icon: "☀️", name: "Solar Gold line", need: { threeStar: true }, needText: "A ⭐⭐⭐ bed" },
  { id: "t-emerald", kind: "TRAIL", target: "EMERALD_FLAME", icon: "🌿", name: "Emerald Flame line", need: { season: 3 }, needText: "Reach Season 3" },
  { id: "t-violet", kind: "TRAIL", target: "PLASMA_VIOLET", icon: "💜", name: "Plasma Violet line", need: { stars: 40 }, needText: "40 ⭐" },
  { id: "t-rainbow", kind: "TRAIL", target: "RAINBOW", icon: "🌈", name: "Rainbow line", need: { season: 9 }, needText: "Reach Endless (Season 9)" },
  { id: "t-blossom", kind: "TRAIL", target: "BLOSSOM", icon: "🌸", name: "Blossom line", need: { stars: 15 }, needText: "15 ⭐" },
  { id: "t-sunset", kind: "TRAIL", target: "SUNSET", icon: "🌅", name: "Sunset line", need: { stars: 35 }, needText: "35 ⭐" },
  { id: "t-starlight", kind: "TRAIL", target: "STARLIGHT", icon: "🌟", name: "Starlight line", need: { stars: 70 }, needText: "70 ⭐" },
  { id: "t-ember", kind: "TRAIL", target: "EMBER", icon: "🔥", name: "Ember line", need: { asc: 3 }, needText: "Beat the Season 3 Boss on Ascension 3" },
  { id: "b-spring", kind: "BOARD", target: "SPRING", icon: "🌿", name: "Moss board", need: {}, needText: "From the start" },
  { id: "b-autumn", kind: "BOARD", target: "AUTUMN", icon: "🍂", name: "Autumn board", need: { stars: 10 }, needText: "10 ⭐" },
  { id: "b-night", kind: "BOARD", target: "NIGHT", icon: "🌙", name: "Night Garden board", need: { stars: 30 }, needText: "30 ⭐" },
  { id: "b-winter", kind: "BOARD", target: "WINTER", icon: "❄️", name: "Winter Frost board", need: { stars: 50 }, needText: "50 ⭐" },
  { id: "b-golden", kind: "BOARD", target: "GOLDEN", icon: "🌾", name: "Golden Hour board", need: { stars: 60 }, needText: "60 ⭐" },
  { id: "b-royal", kind: "BOARD", target: "ROYAL", icon: "👑", name: "Royal Garden board", need: { asc: 6 }, needText: "Beat the Season 3 Boss on Ascension 6" },
  { id: "r-seedling", kind: "RANK", icon: "🌱", name: "Seedling", need: {}, needText: "From the start" },
  { id: "r-sprout", kind: "RANK", icon: "🌿", name: "Sprout", need: { stars: 10 }, needText: "10 ⭐" },
  { id: "r-gardener", kind: "RANK", icon: "🧑‍🌾", name: "Gardener", need: { stars: 25 }, needText: "25 ⭐" },
  { id: "r-head", kind: "RANK", icon: "🏡", name: "Head Gardener", need: { stars: 50 }, needText: "50 ⭐" },
  { id: "r-star", kind: "RANK", icon: "✨", name: "Star Gardener", need: { stars: 70 }, needText: "70 ⭐" },
  { id: "r-master", kind: "RANK", icon: "👑", name: "Master of Seasons", need: { season: 9 }, needText: "Clear Season 8" },
  { id: "r-endless", kind: "RANK", icon: "🌌", name: "Endless Gardener", need: { season: 10 }, needText: "Reach Season 10" },
  // Starting bags (rules v24+)
  { id: "g-thorny", kind: "BAG", target: "THORNY", icon: "🌹", name: "Thorny bag", need: { stars: 10 }, needText: "10 ⭐" },
  { id: "g-acorn", kind: "BAG", target: "ACORN", icon: "🌰", name: "Acorn bag", need: { season: 3 }, needText: "Reach Season 3" },
  { id: "g-berry", kind: "BAG", target: "BERRY", icon: "🫐", name: "Berry bag", need: { stars: 30 }, needText: "30 ⭐" },
  { id: "g-lean", kind: "BAG", target: "LEAN", icon: "🌱", name: "Lean bag", need: { asc: 1 }, needText: "Beat the Season 3 Boss on Ascension 1" },
  // Garden Journal rewards
  { id: "j-botanist", kind: "TITLE", icon: "📖", name: "Botanist title", need: { journal: 25 }, needText: "Fill 25% of the Garden Journal" },
  { id: "j-petal", kind: "TRAIL", target: "PRESSED_PETAL", icon: "🌸", name: "Pressed Petal line", need: { journal: 50 }, needText: "Fill 50% of the Garden Journal" },
  { id: "j-herbarium", kind: "BOARD", target: "HERBARIUM", icon: "📖", name: "Herbarium board", need: { journal: 75 }, needText: "Fill 75% of the Garden Journal" },
  { id: "j-golden", kind: "TRAIL", target: "GOLDEN_LEAF", icon: "🍂", name: "Golden Leaf line", need: { journal: 100 }, needText: "Fill the whole Garden Journal" },
];

const HIGHEST_BED_KEY = "ost_highest_bed_v1";
const SEEN_UNLOCKS_KEY = "ost_unlocks_seen_v1";

export function isUnlocked(item: UnlockItem, p: UnlockProgress): boolean {
  const { stars, season, threeStar, asc } = item.need;
  if (stars !== undefined && p.stars < stars) return false;
  if (season !== undefined && Math.floor(p.highestBed / 3) + 1 < season) return false;
  if (threeStar && !p.hasThreeStar) return false;
  if (asc !== undefined && p.bestAsc < asc) return false;
  if (item.need.journal !== undefined && p.journalPct < item.need.journal) return false;
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
    bestAsc: loadBestClearedAscension(),
    journalPct: bestJournalPercent(),
  };
}

/**
 * The highest Journal fill ever reached: new entries (new relics in a later
 * update) lower today's percentage, but a reward once earned stays earned
 */
const JOURNAL_BEST_KEY = "ost_journal_best_pct_v1";
function bestJournalPercent(): number {
  // As it was before the rules-v22 relics joined the Journal, so their arrival never takes a reward away
  const now = Math.max(journalPercent(), journalPercent(V22_RELICS));
  try {
    const best = Number(window.localStorage.getItem(JOURNAL_BEST_KEY)) || 0;
    if (now > best) window.localStorage.setItem(JOURNAL_BEST_KEY, String(now));
    return Math.max(now, best);
  } catch {
    return now;
  }
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

/** The next star reward(s): everything unlocked at the lowest star count still ahead */
export function getNextStarUnlocks(p: UnlockProgress = loadUnlockProgress()): { stars: number; items: UnlockItem[] } | null {
  const ahead = UNLOCKS.filter((u) => u.need.stars !== undefined && u.need.stars > p.stars);
  if (ahead.length === 0) return null;
  const stars = Math.min(...ahead.map((u) => u.need.stars!));
  return { stars, items: ahead.filter((u) => u.need.stars === stars) };
}

/** The one goal the end screen points at: the nearest reward still ahead */
export interface NextGoal {
  icon: string;
  /** Painted art for the icon, when there is one */
  art?: string | null;
  title: string;
  detail: string;
  /** Filled bar for star goals */
  have?: number;
  need?: number;
}

/** Stars this close count as "nearly there" and win over a far Season goal */
const NEAR_STARS = 3;
/** A Season goal this many beds past the furthest reached still feels close */
const NEAR_BEDS = 3;

/**
 * Picks one next goal after a Run: a star reward that's nearly earned, then the
 * next Season that wakes something, then a higher Ascension, then beating the
 * furthest bed reached (a far-off Season is too distant to aim at), and
 * finally the next star reward however far.
 */
export function pickNextGoal(asc = 0, p: UnlockProgress = loadUnlockProgress()): NextGoal | null {
  const reached = p.highestBed;
  const stars = getNextStarUnlocks(p);
  const starGoal = (): NextGoal | null =>
    stars && {
      icon: stars.items[0].icon,
      art: unlockArt(stars.items[0].id),
      title: `${stars.stars - p.stars} more ⭐ for ${stars.items.map((u) => u.name).join(" and ")}`,
      detail: "Clear a bed with a line to spare for ⭐⭐, and reach 1.5× its target too for ⭐⭐⭐.",
      have: p.stars,
      need: stars.stars,
    };
  if (stars && stars.stars - p.stars <= NEAR_STARS) return starGoal();

  // Seasons that wake something, and beating the Season 3 Boss for Ascension
  const seasonGoals: Array<{ bed: number; icon: string; art?: string | null; title: string; detail: string }> = UNLOCKS.filter(
    (u) => u.need.season !== undefined && !isUnlocked(u, p)
  ).map((u) => ({
    bed: (u.need.season! - 1) * 3,
    icon: u.icon,
    art: unlockArt(u.id),
    title: `Reach Season ${u.need.season}`,
    detail: `Earns the ${u.name}.`,
  }));
  if (loadUnlockedAscension() === 0)
    seasonGoals.push({
      bed: ASCENSION_UNLOCK_BED + 1,
      icon: "🔥",
      title: "Beat the Season 3 Boss",
      detail: "Opens Ascension: harder Runs that earn new bags and looks.",
    });
  const season = seasonGoals.filter((g) => g.bed > reached).sort((a, b) => a.bed - b.bed)[0];
  if (season && season.bed - reached <= NEAR_BEDS) return season;

  const openAsc = loadUnlockedAscension();
  if (openAsc > asc) {
    return {
      icon: "🔥",
      title: `Try Ascension ${openAsc}`,
      detail: "You've opened it. Pick it when you plant your next Run.",
    };
  }
  if (reached > 0) {
    return {
      icon: "🌸",
      art: dailyArt(3),
      title: `Get past ${getRunGardenLabel(reached)}`,
      detail: "That's the furthest bed you've reached. One more bed beats it.",
    };
  }
  return starGoal();
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

// ── Starting bags (rules v24+): unlocked by playing, picked on the New Run sheet ──

export const RUN_BAG_ORDER: BagId[] = ["THORNY", "ACORN", "BERRY", "LEAN"];
const CHOSEN_BAG_KEY = "ost_run_bag_v1";

export function bagUnlockFor(id: BagId): UnlockItem {
  return UNLOCKS.find((u) => u.kind === "BAG" && u.target === id)!;
}

/** Starting bags this device has earned */
export function unlockedRunBags(p: UnlockProgress = loadUnlockProgress()): BagId[] {
  return RUN_BAG_ORDER.filter((b) => isUnlocked(bagUnlockFor(b), p));
}

/** Last bag picked for a Garden Run (null = the usual Garden bag, or a locked one) */
export function loadChosenBag(): BagId | null {
  let id: string | null = null;
  try {
    id = window.localStorage.getItem(CHOSEN_BAG_KEY);
  } catch {
    // Ignore storage errors
  }
  const pick = (RUN_BAG_ORDER as string[]).includes(id ?? "") ? (id as BagId) : null;
  return pick && unlockedRunBags().includes(pick) ? pick : null;
}

export function saveChosenBag(id: BagId | null): void {
  try {
    if (id) window.localStorage.setItem(CHOSEN_BAG_KEY, id);
    else window.localStorage.removeItem(CHOSEN_BAG_KEY);
  } catch {
    // Ignore storage errors
  }
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
