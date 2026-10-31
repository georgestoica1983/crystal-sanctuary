// Run rules shared by the game (src/app/page.tsx) and the leaderboard server:
// the per-action rule helpers the page uses, a compact action log recorded
// during a Run, and a pure replay that rebuilds the Run from that log with the
// engine. Everything is deterministic from the run seed, so the server can
// recompute the real score instead of trusting the client's.
import {
  countCommonRelics,
  countPathBlinks,
  countPathSelfCrosses,
  createRunGarden,
  calculateFloorScoreBreakdown,
  findEntityCoord,
  generateRunSeedBag,
  generateShopOffers,
  getInitialHeroStatsForClass,
  getNextFloorHeroStats,
  getRunClearPayout,
  getRelicSellValue,
  getRunRerollCost,
  growRelicCountersAfterStroke,
  growRelicCountersOnBloom,
  hasSurvivableRunLine,
  HERO_CLASS_REGISTRY,
  isSameCoord,
  isValidStep,
  MAX_COMMON_RELICS,
  NO_RUN_UPGRADES,
  pickLegendaryRelic,
  refillRunGarden,
  RELIC_REGISTRY,
  RUN_WEEDOUT_MAX_TILES,
  simulatePath,
} from "@/lib/engine";
import type {
  DungeonFloor,
  FloorScoreBreakdown,
  GridCell,
  GridCoord,
  HeroClassId,
  HeroStats,
  ModifierId,
  PathSimulationResult,
  RelicCounters,
  RelicId,
  RunGardenState,
  RunUpgrades,
  SeedTile,
  ShopOffer,
} from "@/types/game";

/**
 * The rule set a Run is played with. v4+: ✂️ Shears — each Shears tile is one
 * cut and the next Thorn is cut completely. Older Runs keep their own rules.
 */
export function runModifierFor(logVersion: number): ModifierId {
  return logVersion >= 4 ? "SHEARS" : "NONE";
}

// ── Shared rule helpers (the page calls these; the replay calls them too) ──

/** Lays out the first garden of a Run for a seed and Companion */
/** Life restored after each cleared garden, from rules v5 (up to max Life) */
export const RUN_CLEAR_LIFE = 3;
export const runClearLifeFor = (logVersion: number, asc = 0) =>
  logVersion >= 5 ? ascensionRules(runAscensionFor(logVersion, asc)).clearLife : 0;

/** Extra Seeds for clearing a Run's first garden, from rules v6 */
export const RUN_WELCOME_BONUS = 4;
export const runWelcomeBonusFor = (logVersion: number, gardenIndex: number, asc = 0) =>
  logVersion >= 6 && gardenIndex === 0 && ascensionRules(runAscensionFor(logVersion, asc)).welcomeBonus
    ? RUN_WELCOME_BONUS
    : 0;

/** Rules v7+: Boss gardens use all eight Boss rules */
export const runRulesUseAllBosses = (logVersion: number) => logVersion >= 7;

// ── Ascension (rules v8+): harder levels, each adding to the ones below ──

export const RUN_MAX_ASCENSION = 6;

export interface AscensionRules {
  targetMult: number;
  welcomeBonus: boolean;
  /** Base interest cap (relics still raise it) */
  interestBase: number | undefined;
  thornBonus: number;
  weedOuts: number | undefined;
  /** Starting Life (out of the usual max) */
  startHp: number | undefined;
  clearLife: number;
  bossLines: number | undefined;
}

export const ASCENSION_LEVELS: Array<{ level: number; icon: string; adds: string }> = [
  { level: 0, icon: "🌱", adds: "The normal game" },
  { level: 1, icon: "🌿", adds: "Score targets +25%" },
  { level: 2, icon: "🌾", adds: "No welcome bonus · interest max +3" },
  { level: 3, icon: "🌺", adds: "Thorns +1" },
  { level: 4, icon: "🍃", adds: "2 Swaps per Garden Bed" },
  { level: 5, icon: "❄️", adds: "Start with 8 ❤️ · +2 ❤️ per cleared bed" },
  { level: 6, icon: "👑", adds: "Boss Garden Beds give 3 lines" },
];

/** What a level changes (0 = the normal game); only for rules v8+ logs */
export function ascensionRules(asc: number): AscensionRules {
  const a = Math.max(0, Math.min(RUN_MAX_ASCENSION, Math.floor(asc)));
  return {
    targetMult: a >= 1 ? 1.25 : 1,
    welcomeBonus: a < 2,
    interestBase: a >= 2 ? 3 : undefined,
    thornBonus: a >= 3 ? 1 : 0,
    weedOuts: a >= 4 ? 2 : undefined,
    startHp: a >= 5 ? 8 : undefined,
    clearLife: a >= 5 ? 2 : RUN_CLEAR_LIFE,
    bossLines: a >= 6 ? 3 : undefined,
  };
}

/** Ascension only exists from rules v8; older logs always play level 0 */
export const runAscensionFor = (logVersion: number, asc = 0) => (logVersion >= 8 ? asc : 0);

/** The garden-layout part of a level's rules */
const ascensionGardenParams = (r: AscensionRules) => ({
  targetMult: r.targetMult,
  thornBonus: r.thornBonus,
  weedOuts: r.weedOuts,
  bossLines: r.bossLines,
});

/** Rules v3+ introduce tiles gradually in the first gardens */
export const runRulesUseIntroTiles = (logVersion: number) => logVersion >= 3;

export function startRunGarden(
  runSeed: string,
  classId: HeroClassId,
  logVersion: number = RUN_LOG_VERSION,
  asc = 0
): {
  bag: SeedTile[];
  hero: HeroStats;
  floor: DungeonFloor;
  state: RunGardenState;
} {
  const bag = generateRunSeedBag(runSeed);
  const base = getInitialHeroStatsForClass(classId);
  // Shears rule: a starting Power counts as one cut
  const shearsHero =
    runModifierFor(logVersion) === "SHEARS" ? { ...base, weapon: Math.min(base.weapon, 1) } : base;
  const rules = ascensionRules(runAscensionFor(logVersion, asc));
  const hero = rules.startHp !== undefined ? { ...shearsHero, hp: Math.min(shearsHero.hp, rules.startHp) } : shearsHero;
  const first = createRunGarden({
    runSeed,
    bag,
    gardenIndex: 0,
    modifierId: runModifierFor(logVersion),
    hero,
    heroClassId: classId,
    activeRelics: [],
    introTiles: runRulesUseIntroTiles(logVersion),
    allBossRules: runRulesUseAllBosses(logVersion),
    ...ascensionGardenParams(rules),
  });
  return { bag, hero, ...first };
}

/**
 * Scores a resolved Run stroke. Gems picked up on the board only score (as
 * Chips); the purse stays as it was when the stroke started. Scaling relics
 * score with their growth so far, then grow (`countersAfter`).
 */
export function scoreRunStroke(
  sim: PathSimulationResult,
  startHero: HeroStats,
  path: GridCoord[],
  relics: RelicId[],
  counters: RelicCounters = {},
  strokesLeft?: number,
  relicSets = false
): { breakdown: FloorScoreBreakdown; afterStroke: HeroStats; countersAfter: RelicCounters } {
  const breakdown = calculateFloorScoreBreakdown(sim, startHero, path.length, relics, {
    counters,
    strokesLeft,
    relicSets,
  });
  return {
    breakdown,
    afterStroke: { ...sim.finalStats, gold: startHero.gold },
    countersAfter: growRelicCountersAfterStroke(counters, relics, sim),
  };
}

/** A garden reached its target: payout (+ interest), a Legendary for a Boss, the Shop's offers */
export function getRunBloomResult(params: {
  garden: RunGardenState;
  stats: HeroStats;
  runSeed: string;
  relics: RelicId[];
  counters?: RelicCounters;
  /** Rules version of the Run's log (defaults to the current one) */
  logVersion?: number;
  /** Ascension level of the Run (rules v8+) */
  asc?: number;
}): {
  payout: ReturnType<typeof getRunClearPayout>;
  legendary: RelicId | null;
  relicsAfter: RelicId[];
  countersAfter: RelicCounters;
  statsWithPayout: HeroStats;
  offers: ShopOffer[];
} {
  const { garden, stats, runSeed, relics } = params;
  const payout = getRunClearPayout({
    kind: garden.kind,
    strokesLeft: garden.strokesLeft,
    gemsHeld: stats.gold,
    relics,
    welcomeBonus: runWelcomeBonusFor(params.logVersion ?? RUN_LOG_VERSION, garden.gardenIndex, params.asc),
    interestBase: ascensionRules(runAscensionFor(params.logVersion ?? RUN_LOG_VERSION, params.asc)).interestBase,
  });
  // Scaling relics owned while the garden bloomed grow
  const countersAfter = growRelicCountersOnBloom(params.counters ?? {}, relics, garden);
  const legendary =
    garden.kind === "BOSS" ? pickLegendaryRelic(runSeed, garden.gardenIndex + 1, relics) : null;
  const relicsAfter = legendary ? [...relics, legendary] : relics;
  return {
    payout,
    legendary,
    relicsAfter,
    countersAfter,
    statsWithPayout: { ...stats, gold: stats.gold + payout.total },
    offers: generateShopOffers(runSeed, garden.gardenIndex + 1, 0, relicsAfter),
  };
}

/** Buys one Shop offer; null when it's sold, unaffordable or there's no relic slot */
export function applyRunShopPurchase(params: {
  stats: HeroStats;
  offer: ShopOffer;
  relics: RelicId[];
  upgrades: RunUpgrades;
  soldIds: string[];
}): { stats: HeroStats; relics: RelicId[]; upgrades: RunUpgrades } | null {
  const { stats, offer, relics, upgrades, soldIds } = params;
  if (soldIds.includes(offer.id) || stats.gold < offer.cost) return null;
  if (offer.kind === "RELIC" && (!offer.relicId || countCommonRelics(relics) >= MAX_COMMON_RELICS)) {
    return null;
  }
  const next: HeroStats = { ...stats, gold: stats.gold - offer.cost };
  if (offer.kind === "RELIC" && offer.relicId) {
    return { stats: next, relics: [...relics, offer.relicId], upgrades };
  }
  if (offer.stat === "MAX_MAGIC") {
    next.maxHp += 2;
    next.hp += 2;
    return { stats: next, relics, upgrades: { ...upgrades, bonusMaxMagic: upgrades.bonusMaxMagic + 2 } };
  }
  if (offer.stat === "START_DEW") {
    return { stats: next, relics, upgrades: { ...upgrades, bonusStartDew: upgrades.bonusStartDew + 1 } };
  }
  return { stats: next, relics, upgrades };
}

/**
 * Sells an owned common relic for half its price (rounded down, min 1 💎).
 * Its growth is lost. null when it isn't owned or is Legendary.
 */
export function applyRunShopSell(params: {
  stats: HeroStats;
  relics: RelicId[];
  counters: RelicCounters;
  relicId: RelicId;
}): { stats: HeroStats; relics: RelicId[]; counters: RelicCounters; value: number } | null {
  const { stats, relics, counters, relicId } = params;
  const index = relics.indexOf(relicId);
  const value = getRelicSellValue(relicId);
  if (index < 0 || value === null) return null;
  const nextCounters = { ...counters };
  delete nextCounters[relicId];
  return {
    stats: { ...stats, gold: stats.gold + value },
    relics: [...relics.slice(0, index), ...relics.slice(index + 1)],
    counters: nextCounters,
    value,
  };
}

// ── Pruning Shears (rules v9+): remove one tile from the Tile Bag ──

export const RUN_PRUNE_COST = 4;
/** Pruning never takes the bag below this many tiles (a bed needs 23) */
export const RUN_BAG_MIN_SIZE = 30;
export const runRulesAllowPrune = (logVersion: number) => logVersion >= 9;
/** Rules v10+: 3 relics with one theme tag score every line ×1.25 */
export const runRulesUseRelicSets = (logVersion: number) => logVersion >= 10;

/**
 * Removes the bag tile at `index` for the rest of the Run (once per Shop
 * visit). null when it's not allowed or the purse can't cover it.
 */
export function applyRunShopPrune(params: {
  stats: HeroStats;
  bag: SeedTile[];
  index: number;
  prunedThisShop: boolean;
}): { stats: HeroStats; bag: SeedTile[]; tile: SeedTile } | null {
  const { stats, bag, index } = params;
  if (params.prunedThisShop || stats.gold < RUN_PRUNE_COST) return null;
  if (bag.length <= RUN_BAG_MIN_SIZE || !Number.isInteger(index) || index < 0 || index >= bag.length) {
    return null;
  }
  return {
    stats: { ...stats, gold: stats.gold - RUN_PRUNE_COST },
    bag: [...bag.slice(0, index), ...bag.slice(index + 1)],
    tile: bag[index],
  };
}

/** Pays for a Shop reroll (cost rises each time); null if the purse can't cover it */
export function applyRunShopReroll(params: {
  stats: HeroStats;
  rerolls: number;
  runSeed: string;
  floorNumber: number;
  relics: RelicId[];
}): { stats: HeroStats; rerolls: number; offers: ShopOffer[]; cost: number } | null {
  const cost = getRunRerollCost(params.rerolls, params.relics);
  if (params.stats.gold < cost) return null;
  const rerolls = params.rerolls + 1;
  return {
    stats: { ...params.stats, gold: params.stats.gold - cost },
    rerolls,
    offers: generateShopOffers(params.runSeed, params.floorNumber, rerolls, params.relics),
    cost,
  };
}

/** Leaving the Shop: the Companion's stats for the next garden and its layout */
export function createNextRunGarden(params: {
  stats: HeroStats;
  classId: HeroClassId;
  relics: RelicId[];
  upgrades: RunUpgrades;
  runSeed: string;
  bag: SeedTile[];
  gardenIndex: number;
  /** Rules version of the Run's log (defaults to the current one) */
  logVersion?: number;
  /** Ascension level of the Run (rules v8+) */
  asc?: number;
}): { hero: HeroStats; floor: DungeonFloor; state: RunGardenState } {
  const v = params.logVersion ?? RUN_LOG_VERSION;
  const rules = ascensionRules(runAscensionFor(v, params.asc));
  const hero = getNextFloorHeroStats(
    params.stats,
    params.classId,
    params.relics,
    params.upgrades,
    runModifierFor(v),
    runClearLifeFor(v, params.asc)
  );
  const next = createRunGarden({
    runSeed: params.runSeed,
    bag: params.bag,
    gardenIndex: params.gardenIndex,
    modifierId: runModifierFor(params.logVersion ?? RUN_LOG_VERSION),
    hero,
    heroClassId: params.classId,
    activeRelics: params.relics,
    introTiles: runRulesUseIntroTiles(v),
    allBossRules: runRulesUseAllBosses(v),
    ...ascensionGardenParams(rules),
  });
  return { hero, ...next };
}

/**
 * Whether `path` could have been drawn on this board (mirrors GridCanvas):
 * starts on the Companion, every step legal (Fox's one self-cross, Owl's one
 * blink), no Void tiles. Returns the reason it's illegal, or null.
 */
export function getRunPathError(
  grid: GridCell[][],
  path: GridCoord[],
  classId: HeroClassId,
  modifierId: ModifierId = RUN_MODIFIER
): string | null {
  if (path.length < 2) return "stroke is too short";
  const start = findEntityCoord(grid, "HERO");
  if (!start || !isSameCoord(path[0], start)) return "stroke doesn't start on the Companion";
  for (let i = 1; i < path.length; i++) {
    const coord = path[i];
    const cell = grid[coord.row]?.[coord.col];
    if (!cell || cell.type === "VOID") return `step ${i} leaves the board`;
    const before = path.slice(0, i);
    const blinkUsed = countPathBlinks(before) >= 1;
    if (!isValidStep(path[i - 1], coord, modifierId, classId, blinkUsed)) {
      return `step ${i} is not a legal move`;
    }
    if (before.some((pt) => isSameCoord(pt, coord))) {
      const selfCrossAllowed =
        classId === "ROGUE" && countPathSelfCrosses(before) === 0 && cell.type !== "EXIT";
      if (!selfCrossAllowed) return `step ${i} crosses the line`;
    }
  }
  return null;
}

// ── Action log ──────────────────────────────────────────────────────────────

/**
 * v2: 5 relic slots, selling, the larger relic pool and rarity-weighted Shops.
 * v3: the first gardens introduce tiles gradually.
 * v4: ✂️ Shears cut the next Thorn completely (the "SHEARS" rule set).
 * v5: clearing a garden restores ❤️ Life (RUN_CLEAR_LIFE) for the next one.
 * v6: the first garden pays a welcome bonus (RUN_WELCOME_BONUS).
 * v7: Boss gardens draw from eight Boss rules instead of four.
 * v8: Ascension levels (the log's `asc`, 0–6).
 * v9: ✂️ Pruning Shears in the Shop remove a tile from the bag (action "p").
 * v10: relic sets — 3 relics with one theme tag score every line ×1.25.
 * Older logs still replay with their own rules.
 */
export const RUN_LOG_VERSION = 10;
export const RUN_LOG_MIN_VERSION = 2;
/** Rule set of new Runs (the current version) */
export const RUN_MODIFIER: ModifierId = runModifierFor(RUN_LOG_VERSION);

/**
 * One player action, kept small: coords are packed as row * 5 + col.
 * s = stroke path · w = weed-out tiles · b = buy offer · r = reroll ·
 * x = sell relic · p = prune bag tile i · l = leave the Shop (h = Companion
 * for the next garden).
 */
export type RunLogAction =
  | { k: "s"; p: number[] }
  | { k: "w"; c: number[] }
  | { k: "b"; o: string }
  | { k: "r" }
  | { k: "x"; r: RelicId }
  | { k: "p"; i: number }
  | { k: "l"; h: HeroClassId };

export interface RunActionLog {
  v: number;
  seed: string;
  hero: HeroClassId;
  /** Ascension level (rules v8+); missing = 0 */
  asc?: number;
  a: RunLogAction[];
}

export const packCoord = (c: GridCoord): number => c.row * 5 + c.col;
export const packCoords = (coords: GridCoord[]): number[] => coords.map(packCoord);
const unpackCoord = (n: number): GridCoord => ({ row: Math.floor(n / 5), col: n % 5 });

export function createRunLog(seed: string, hero: HeroClassId, asc = 0): RunActionLog {
  return asc > 0 ? { v: RUN_LOG_VERSION, seed, hero, asc, a: [] } : { v: RUN_LOG_VERSION, seed, hero, a: [] };
}

// ── Replay ──────────────────────────────────────────────────────────────────

/** Guards against oversized or abusive logs */
export const RUN_LOG_MAX_ACTIONS = 4000;
const MAX_PATH_LENGTH = 40;
const MAX_SEED_LENGTH = 80;

export type RunReplayResult =
  | {
      ok: true;
      /** Sum of every scored stroke */
      score: number;
      /** Gardens bloomed so far */
      gardenIndex: number;
      strokes: number;
      /** The Run can't continue (out of strokes or no safe line left) */
      over: boolean;
    }
  | { ok: false; error: string; actionIndex: number | null };

const isCoordList = (v: unknown, max: number): v is number[] =>
  Array.isArray(v) &&
  v.length <= max &&
  v.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 25);

const isHeroClass = (v: unknown): v is HeroClassId =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(HERO_CLASS_REGISTRY, v);

const isRelicId = (v: unknown): v is RelicId =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(RELIC_REGISTRY, v);

/** Checks the log's shape (not its legality); returns it typed or null */
export function parseRunLog(raw: unknown): RunActionLog | null {
  if (!raw || typeof raw !== "object") return null;
  const log = raw as Record<string, unknown>;
  if (
    typeof log.v !== "number" ||
    !Number.isInteger(log.v) ||
    log.v < RUN_LOG_MIN_VERSION ||
    log.v > RUN_LOG_VERSION
  ) {
    return null;
  }
  if (typeof log.seed !== "string" || log.seed.length === 0 || log.seed.length > MAX_SEED_LENGTH) {
    return null;
  }
  if (!isHeroClass(log.hero)) return null;
  if (
    log.asc !== undefined &&
    (typeof log.asc !== "number" || !Number.isInteger(log.asc) || log.asc < 0 || log.asc > RUN_MAX_ASCENSION || log.v < 8)
  ) {
    return null;
  }
  if (!Array.isArray(log.a) || log.a.length > RUN_LOG_MAX_ACTIONS) return null;
  for (const item of log.a) {
    if (!item || typeof item !== "object") return null;
    const a = item as Record<string, unknown>;
    if (a.k === "s" && isCoordList(a.p, MAX_PATH_LENGTH)) continue;
    if (a.k === "w" && isCoordList(a.c, RUN_WEEDOUT_MAX_TILES)) continue;
    if (a.k === "b" && typeof a.o === "string" && a.o.length <= 40) continue;
    if (a.k === "r") continue;
    if (a.k === "x" && isRelicId(a.r)) continue;
    if (a.k === "p" && log.v >= 9 && typeof a.i === "number" && Number.isInteger(a.i) && a.i >= 0 && a.i < 100) {
      continue;
    }
    if (a.k === "l" && isHeroClass(a.h)) continue;
    return null;
  }
  return log as unknown as RunActionLog;
}

/** Where a replay stands after some actions (read-only view) */
export interface RunReplayState {
  runSeed: string;
  classId: HeroClassId;
  phase: "PLAY" | "SHOP" | "OVER";
  /** The garden being played (its grid is `grid`, which refills as you go) */
  floor: DungeonFloor;
  grid: GridCell[][];
  garden: RunGardenState;
  /** The Tile Bag (smaller after Pruning Shears) */
  bag: SeedTile[];
  /** Companion at the start of the next stroke */
  startHero: HeroStats;
  relics: RelicId[];
  /** Growth of scaling relics */
  counters: RelicCounters;
  upgrades: RunUpgrades;
  shop: { stats: HeroStats; offers: ShopOffer[]; soldIds: string[]; rerolls: number; pruned: boolean };
  score: number;
  gardensBloomed: number;
  strokes: number;
}

/**
 * Steps a Run forward one action at a time with the same rules the game uses.
 * `apply` returns why an action is impossible (leaving the state untouched),
 * or null once it's been applied.
 */
export function createRunReplayer(
  runSeed: string,
  heroClassId: HeroClassId,
  logVersion: number = RUN_LOG_VERSION,
  asc = 0
) {
  const first = startRunGarden(runSeed, heroClassId, logVersion, asc);
  const modifier = runModifierFor(logVersion);
  const s: RunReplayState = {
    runSeed,
    classId: heroClassId,
    phase: "PLAY",
    floor: first.floor,
    grid: first.floor.grid,
    garden: first.state,
    bag: first.bag,
    startHero: first.hero,
    relics: [],
    counters: {},
    upgrades: NO_RUN_UPGRADES,
    shop: { stats: first.hero, offers: [], soldIds: [], rerolls: 0, pruned: false },
    score: 0,
    gardensBloomed: 0,
    strokes: 0,
  };

  /** After a refill: no line left and no Weed-out to fix it ends the Run */
  const checkSafeLine = () => {
    if (s.garden.weedOutsLeft > 0) return;
    if (!hasSurvivableRunLine(s.grid, s.startHero, modifier, s.classId, s.relics)) {
      s.phase = "OVER";
    }
  };

  const apply = (action: RunLogAction): string | null => {
    if (s.phase === "OVER") return "action after the Run ended";

    if (action.k === "s") {
      if (s.phase !== "PLAY") return "stroke outside a garden";
      if (s.garden.strokesLeft <= 0) return "no strokes left";
      const path = action.p.map(unpackCoord);
      const pathError = getRunPathError(s.grid, path, s.classId, modifier);
      if (pathError) return pathError;
      const sim = simulatePath(s.grid, path, s.startHero, modifier, s.classId, s.relics);
      if (!sim.canCommit) return "line doesn't reach the Archway alive";
      const { breakdown, afterStroke, countersAfter } = scoreRunStroke(
        sim,
        s.startHero,
        path,
        s.relics,
        s.counters,
        s.garden.strokesLeft,
        runRulesUseRelicSets(logVersion)
      );
      s.counters = countersAfter;
      s.strokes++;
      s.score += breakdown.total;
      const scored: RunGardenState = {
        ...s.garden,
        score: s.garden.score + breakdown.total,
        strokesLeft: s.garden.strokesLeft - 1,
        bestStars: Math.max(s.garden.bestStars, sim.stars.totalStars),
      };
      if (scored.score >= scored.target) {
        s.gardensBloomed++;
        const bloom = getRunBloomResult({
          garden: scored,
          stats: afterStroke,
          runSeed,
          relics: s.relics,
          counters: s.counters,
          logVersion,
          asc,
        });
        s.relics = bloom.relicsAfter;
        s.counters = bloom.countersAfter;
        s.garden = scored;
        s.shop = { stats: bloom.statsWithPayout, offers: bloom.offers, soldIds: [], rerolls: 0, pruned: false };
        s.phase = "SHOP";
      } else if (scored.strokesLeft <= 0) {
        s.garden = scored;
        s.phase = "OVER";
      } else {
        const refill = refillRunGarden(s.grid, path, scored, runSeed);
        s.grid = refill.grid;
        s.garden = refill.state;
        s.startHero = afterStroke;
        checkSafeLine();
      }
      return null;
    }

    if (action.k === "w") {
      if (s.phase !== "PLAY") return "weed-out outside a garden";
      if (s.garden.weedOutsLeft <= 0) return "no weed-outs left";
      if (action.c.length === 0) return "empty weed-out";
      if (new Set(action.c).size !== action.c.length) return "repeated weed-out tile";
      const spent = { ...s.garden, weedOutsLeft: s.garden.weedOutsLeft - 1 };
      const refill = refillRunGarden(s.grid, action.c.map(unpackCoord), spent, runSeed);
      s.grid = refill.grid;
      s.garden = refill.state;
      checkSafeLine();
      return null;
    }

    if (action.k === "b") {
      if (s.phase !== "SHOP") return "purchase outside the Shop";
      const offer = s.shop.offers.find((o) => o.id === action.o);
      if (!offer) return "unknown Shop offer";
      const bought = applyRunShopPurchase({
        stats: s.shop.stats,
        offer,
        relics: s.relics,
        upgrades: s.upgrades,
        soldIds: s.shop.soldIds,
      });
      if (!bought) return "purchase not allowed";
      s.relics = bought.relics;
      s.upgrades = bought.upgrades;
      s.shop = { ...s.shop, stats: bought.stats, soldIds: [...s.shop.soldIds, offer.id] };
      return null;
    }

    if (action.k === "x") {
      if (s.phase !== "SHOP") return "sale outside the Shop";
      const sold = applyRunShopSell({
        stats: s.shop.stats,
        relics: s.relics,
        counters: s.counters,
        relicId: action.r,
      });
      if (!sold) return "sale not allowed";
      s.relics = sold.relics;
      s.counters = sold.counters;
      s.shop = { ...s.shop, stats: sold.stats };
      return null;
    }

    if (action.k === "r") {
      if (s.phase !== "SHOP") return "reroll outside the Shop";
      const reroll = applyRunShopReroll({
        stats: s.shop.stats,
        rerolls: s.shop.rerolls,
        runSeed,
        floorNumber: s.garden.gardenIndex + 1,
        relics: s.relics,
      });
      if (!reroll) return "reroll not affordable";
      s.shop = { ...s.shop, stats: reroll.stats, offers: reroll.offers, soldIds: [], rerolls: reroll.rerolls };
      return null;
    }

    if (action.k === "p") {
      if (s.phase !== "SHOP") return "prune outside the Shop";
      if (!runRulesAllowPrune(logVersion)) return "no Pruning Shears in these rules";
      const pruned = applyRunShopPrune({
        stats: s.shop.stats,
        bag: s.bag,
        index: action.i,
        prunedThisShop: s.shop.pruned,
      });
      if (!pruned) return "prune not allowed";
      s.bag = pruned.bag;
      s.shop = { ...s.shop, stats: pruned.stats, pruned: true };
      return null;
    }

    if (s.phase !== "SHOP") return "left a Shop that wasn't open";
    // A Companion only changes when a free trial garden ends (back to the Keeper)
    if (action.h !== s.classId && action.h !== "KNIGHT") return "Companion changed mid-run";
    s.classId = action.h;
    const next = createNextRunGarden({
      stats: s.shop.stats,
      classId: s.classId,
      relics: s.relics,
      upgrades: s.upgrades,
      runSeed,
      bag: s.bag,
      gardenIndex: s.garden.gardenIndex + 1,
      logVersion,
      asc,
    });
    s.floor = next.floor;
    s.grid = next.floor.grid;
    s.garden = next.state;
    s.startHero = next.hero;
    s.phase = "PLAY";
    return null;
  };

  return { state: s as Readonly<RunReplayState>, apply };
}

/**
 * Rebuilds a Run from its action log with the engine and returns the real
 * score, or why the log is impossible.
 */
export function replayRun(raw: unknown): RunReplayResult {
  const log = parseRunLog(raw);
  if (!log) return { ok: false, error: "malformed log", actionIndex: null };
  const run = createRunReplayer(log.seed, log.hero, log.v, log.asc ?? 0);
  for (let i = 0; i < log.a.length; i++) {
    const error = run.apply(log.a[i]);
    if (error) return { ok: false, error, actionIndex: i };
  }
  const s = run.state;
  return {
    ok: true,
    score: s.score,
    gardenIndex: s.gardensBloomed,
    strokes: s.strokes,
    over: s.phase === "OVER",
  };
}
