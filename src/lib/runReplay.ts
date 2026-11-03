// Run rules shared by the game (src/app/page.tsx) and the leaderboard server:
// the per-action rule helpers the page uses, a compact action log recorded
// during a Run, and a pure replay that rebuilds the Run from that log with the
// engine. Everything is deterministic from the run seed, so the server can
// recompute the real score instead of trusting the client's.
import {
  countCommonRelics,
  countPathBlinks,
  countPathSelfCrosses,
  addStartEditions,
  EDITION_TILE_COST,
  createRunGarden,
  TOLL_SEEDS,
  FERT_TILES,
  hashStringToSeed,
  mulberry32,
  RELIC_LIST,
  V20_RELICS,
  V22_RELICS,
  DEW_LINES,
  MAX_TOOLS,
  FERTILIZER_COST,
  calculateFloorScoreBreakdown,
  findEntityCoord,
  generateRunSeedBag,
  generateShopOffers,
  getRunGardenPosition,
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
  BossRuleId,
  RunWeather,
  DungeonFloor,
  FloorScoreBreakdown,
  GridCell,
  GridCoord,
  HeroClassId,
  HeroStats,
  GardenerGiftId,
  ModifierId,
  PathSimulationResult,
  RelicCounters,
  RelicId,
  RunGardenState,
  RunUpgrades,
  SeedTile,
  ShopOffer,
  ToolId,
  GardenUpgradeId,
  PacketId,
  BagId,
  ShopMomentId,
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

/** Rules v19+: four more Bosses (Narrow Path, Long Road, Fog, Toll) */
export const runRulesUseNewBosses = (logVersion: number) => logVersion >= 19;

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
  asc = 0,
  /** Rules v24+: the starting bag picked for the Run */
  bagId?: BagId
): {
  bag: SeedTile[];
  hero: HeroStats;
  floor: DungeonFloor;
  state: RunGardenState;
} {
  const baseBag = generateRunSeedBag(runSeed, runRulesUseBags(logVersion) ? bagId : undefined);
  const bag = runRulesUseEditions(logVersion) ? addStartEditions(baseBag, runSeed) : baseBag;
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
    gentleStart: runRulesUseGentleStart(logVersion),
    allBossRules: runRulesUseAllBosses(logVersion),
    newBosses: runRulesUseNewBosses(logVersion),
    bossV20: runRulesUseV20Bosses(logVersion),
    weather: runRulesUseWeather(logVersion),
    lateTargets: runRulesUseLateTargets(logVersion),
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
  counters: RelicCounters,
  strokesLeft: number,
  /** Rules v10+ relic sets (runRulesUseRelicSets) — required so live play and replays agree */
  relicSets: boolean,
  /** The bed's Boss rule (rules v19 Bosses change scoring and cost) */
  bossRuleId?: BossRuleId,
  /** Rules v20 Bosses (RunGardenState.bossV20): the Toll charges per tile */
  bossV20 = false,
  /** Rules v20 weather (RunGardenState.weather) */
  weather?: RunWeather,
  /** Rules v22: the Seed packet armed for this line */
  packet?: PacketId | null
): { breakdown: FloorScoreBreakdown; afterStroke: HeroStats; countersAfter: RelicCounters } {
  const breakdown = calculateFloorScoreBreakdown(sim, startHero, path.length, relics, {
    counters,
    strokesLeft,
    relicSets,
    bossRuleId,
    weather,
    packet: packet ?? undefined,
  });
  // The Toll: every line on its bed costs Seeds (rules v20: 1 for every tile past Length 10)
  const toll = bossRuleId !== "TOLL" ? 0 : bossV20 ? Math.max(0, path.length - TOLL_FREE_LENGTH) : TOLL_SEEDS;
  const gold = Math.max(0, startHero.gold - toll);
  return {
    breakdown,
    afterStroke: { ...sim.finalStats, gold },
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
  /** Garden upgrades owned (rules v18+): a higher interest cap */
  gardenUpgrades?: GardenUpgradeId[];
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
    interestBonus: upgradeInterestBonus(params.gardenUpgrades ?? []),
  });
  // Scaling relics owned while the garden bloomed grow
  const countersAfter = growRelicCountersOnBloom(params.counters ?? {}, relics, garden);
  const legendary =
    garden.kind === "BOSS" ? pickLegendaryRelic(runSeed, garden.gardenIndex + 1, relics) : null;
  const relicsAfter = legendary ? [...relics, legendary] : relics;
  const unlocked = shopUnlocks(params.logVersion ?? RUN_LOG_VERSION, getRunGardenPosition(garden.gardenIndex).season);
  return {
    payout,
    legendary,
    relicsAfter,
    countersAfter,
    statsWithPayout: { ...stats, gold: stats.gold + payout.total },
    offers: generateShopOffers(
      runSeed,
      garden.gardenIndex + 1,
      0,
      relicsAfter,
      unlocked.fertilizer ? runFertilizerCost(params.logVersion ?? RUN_LOG_VERSION, params.asc) : 0,
      unlocked.tools ? runToolExtraCost(params.logVersion ?? RUN_LOG_VERSION, params.asc) : null,
      unlocked.tiles ? runEditionTileCost(params.logVersion ?? RUN_LOG_VERSION, params.asc) : null,
      runRulesUseEcho(params.logVersion ?? RUN_LOG_VERSION),
      runRulesUseV16Relics(params.logVersion ?? RUN_LOG_VERSION),
      runRulesUseV20Relics(params.logVersion ?? RUN_LOG_VERSION),
      runRulesUseRareShops(params.logVersion ?? RUN_LOG_VERSION) && getRunGardenPosition(garden.gardenIndex).season >= RARE_SHOP_SEASON,
      runRulesUseV22Relics(params.logVersion ?? RUN_LOG_VERSION)
    ),
  };
}

/** Buys one Shop offer; null when it's sold, unaffordable or there's no relic slot */
export function applyRunShopPurchase(params: {
  stats: HeroStats;
  offer: ShopOffer;
  relics: RelicId[];
  upgrades: RunUpgrades;
  soldIds: string[];
  /** Run counters (Fertilizer levels live here) */
  counters?: RelicCounters;
  /** Garden tools held (rules v13+) */
  tools?: ToolId[];
  /** The Tile Bag (a special tile bought in v14+ joins it) */
  bag?: SeedTile[];
  /** Seed packets held (rules v22+) */
  packets?: PacketId[];
}): {
  stats: HeroStats;
  relics: RelicId[];
  upgrades: RunUpgrades;
  counters?: RelicCounters;
  tools?: ToolId[];
  bag?: SeedTile[];
  packets?: PacketId[];
} | null {
  const { stats, offer, relics, upgrades, soldIds } = params;
  if (soldIds.includes(offer.id) || stats.gold < offer.cost) return null;
  if (offer.kind === "RELIC" && (!offer.relicId || countCommonRelics(relics) >= MAX_COMMON_RELICS)) {
    return null;
  }
  const next: HeroStats = { ...stats, gold: stats.gold - offer.cost };
  if (offer.kind === "RELIC" && offer.relicId) {
    return { stats: next, relics: [...relics, offer.relicId], upgrades };
  }
  if (offer.kind === "TILE" && offer.tile) {
    return { stats: next, relics, upgrades, bag: [...(params.bag ?? []), { ...offer.tile }] };
  }
  if (offer.kind === "TOOL" && offer.tool) {
    if ((params.tools ?? []).length >= MAX_TOOLS) return null;
    return { stats: next, relics, upgrades, tools: [...(params.tools ?? []), offer.tool] };
  }
  if (offer.kind === "PACKET" && offer.packet) {
    if ((params.packets ?? []).length >= MAX_PACKETS) return null;
    return { stats: next, relics, upgrades, packets: [...(params.packets ?? []), offer.packet] };
  }
  if (offer.kind === "FERT" && offer.fert) {
    const key = `FERT_${offer.fert}` as const;
    return { stats: next, relics, upgrades, counters: { ...params.counters, [key]: (params.counters?.[key] ?? 0) + 1 } };
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
/** Rules v11+: gentler Season 1 targets (800 / 1,500 / 2,500) */
export const runRulesUseGentleStart = (logVersion: number) => logVersion >= 11;
/** Rules v12+: the Shop sells Fertilizer, levelling a tile type for the Run */
export const runRulesUseFertilizer = (logVersion: number) => logVersion >= 12;
/** Fertilizer's Shop price (0 before v12); from Ascension 2 it costs 2 more */
/** Relic Tag: the Shop after the next bloom gets a free Rare relic */
export function addTagRelicOffer(offers: ShopOffer[], runSeed: string, gardenIndex: number, owned: RelicId[]): ShopOffer[] {
  const gift = pickTagRelic(runSeed, gardenIndex, owned);
  return gift ? [...offers, { id: `f${gardenIndex + 1}-tag-relic`, kind: "RELIC", relicId: gift, cost: 0 }] : offers;
}

/**
 * Skips a Small bed (rules v17+) before its first line: its Tag pays out, and
 * the Run moves straight to the next bed — no payout, no Life back, no Shop —
 * whose target grows by half. Returns why it can't, or the new state.
 */
export function applyRunSkip(params: {
  runSeed: string;
  garden: RunGardenState;
  startHero: HeroStats;
  counters: RelicCounters;
  bag: SeedTile[];
  classId: HeroClassId;
  relics: RelicId[];
  upgrades: RunUpgrades;
  logVersion: number;
  asc?: number;
}):
  | string
  | {
      tag: SkipTag;
      counters: RelicCounters;
      bag: SeedTile[];
      next: { hero: HeroStats; floor: DungeonFloor; state: RunGardenState };
    } {
  const { runSeed, garden } = params;
  if (garden.kind !== "SMALL") return "only a Small bed can be skipped";
  if (!shopUnlocks(params.logVersion ?? RUN_LOG_VERSION, garden.season).skip) return "skipping opens in Season 2";
  if (garden.strokesLeft !== (garden.strokesTotal ?? garden.strokesLeft) || garden.score > 0) {
    return "a bed can only be skipped before its first line";
  }
  const tag = getSkipTag(runSeed, garden.gardenIndex);
  let stats = params.startHero;
  let counters = params.counters;
  let bag = params.bag;
  if (tag === "PURSE") stats = { ...stats, gold: stats.gold + 10 };
  if (tag === "FERTILE") {
    const rng = mulberry32(hashStringToSeed(`skip-fert-${runSeed}-g${garden.gardenIndex}`));
    const tile = FERT_TILES[Math.floor(rng() * FERT_TILES.length)];
    counters = { ...counters, [`FERT_${tile}`]: (counters[`FERT_${tile}`] ?? 0) + 1 };
  }
  if (tag === "GOLDEN") {
    const rng = mulberry32(hashStringToSeed(`skip-gold-${runSeed}-g${garden.gardenIndex}`));
    const plain = bag.map((t, i) => ({ t, i })).filter(({ t }) => !t.ed);
    if (plain.length > 0) {
      const { t, i } = plain[Math.floor(rng() * plain.length)];
      bag = [...bag.slice(0, i), { ...t, ed: "GOLDEN" }, ...bag.slice(i + 1)];
    }
  }
  const next = createNextRunGarden({
    stats,
    classId: params.classId,
    relics: params.relics,
    upgrades: params.upgrades,
    runSeed,
    bag,
    gardenIndex: garden.gardenIndex + 1,
    logVersion: params.logVersion,
    asc: params.asc,
    skipped: true,
  });
  // The garden grows wilder while you're away: the next bed's target is +50%
  const state = { ...next.state, target: Math.round((next.state.target * RUN_SKIP_TARGET_MULT) / 50) * 50 };
  return { tag, counters, bag, next: { ...next, state } };
}

/** Relic Tag: a seeded Rare relic you don't own yet (null if none left) */
function pickTagRelic(runSeed: string, gardenIndex: number, owned: RelicId[]): RelicId | null {
  // (never the v20 relics: older Runs must keep drawing the same Rare relic)
  const pool = RELIC_LIST.filter(
    (r) => r.rarity === "RARE" && !owned.includes(r.id) && !V20_RELICS.includes(r.id) && !V22_RELICS.includes(r.id)
  );
  if (pool.length === 0) return null;
  const rng = mulberry32(hashStringToSeed(`tag-relic-${runSeed}-g${gardenIndex}`));
  return pool[Math.floor(rng() * pool.length)].id;
}

/** Rules v13+: garden tools upgrade a bag tile for the rest of the Run */
export const runRulesUseTools = (logVersion: number) => logVersion >= 13;
/** Rules v14+: special tiles (Golden, Iridescent, Radiant) in the bag and the Shop */
export const runRulesUseEditions = (logVersion: number) => logVersion >= 14;
/** Rules v15+: Echo, a tool that makes a tile score twice */
export const runRulesUseEcho = (logVersion: number) => logVersion >= 15;
/** Rules v16+: 8 new relics (score-again and rule-benders) join the Shop */
export const runRulesUseV16Relics = (logVersion: number) => logVersion >= 16;
/** v20: relics for exact and careful lines join the Shop */
export const runRulesUseV20Relics = (logVersion: number) => logVersion >= 20;
/** Rules v22+: the relic families (Acorns, Berries, Spikes, long lines) join the Shop */
export const runRulesUseV22Relics = (logVersion: number) => logVersion >= 22;
/** v20: the Spike King walls, the Drought dries Berries, the Toll charges per tile */
export const runRulesUseV20Bosses = (logVersion: number) => logVersion >= 20;
/** v21: the Shop opens up Season by Season instead of all at once */
export const runRulesUseGradualShop = (logVersion: number) => logVersion >= 21;
/** What a Shop (or a skip) may offer during `season` under these rules */
export function shopUnlocks(logVersion: number, season: number) {
  const gradual = runRulesUseGradualShop(logVersion);
  return {
    fertilizer: !gradual || season >= 2,
    tools: !gradual || season >= 2,
    skip: !gradual || season >= 2,
    tiles: !gradual || season >= 3,
    upgrades: !gradual || season >= 3,
  };
}
/** v20: from Season 4 every Shop has at least one Rare relic */
export const runRulesUseRareShops = (logVersion: number) => logVersion >= 20;
/** v20: targets grow ×1.4 from Season 4 (the Gardener and Rare Shops make Runs stronger) */
export const runRulesUseLateTargets = (logVersion: number) => logVersion >= 20;
/** v23: the late climb keeps steepening each Season (runLateTargetMult) */
export const runRulesUseSteepTargets = (logVersion: number) => logVersion >= 23;
/** v23: the Shop can reroll the coming Boss, once per Season */
export const runRulesUseBossReroll = (logVersion: number) => logVersion >= 23;
export const BOSS_REROLL_COST = 6;
/** The Season whose Boss comes next after this bed (a Boss bed looks a Season ahead) */
export const comingBossSeason = (gardenIndex: number) => Math.floor(gardenIndex / 3) + (gardenIndex % 3 === 2 ? 2 : 1);
export const RARE_SHOP_SEASON = 4;
/** v20: Golden Hour and Thick Brambles on some Small and Big beds from Season 2 */
export const runRulesUseWeather = (logVersion: number) => logVersion >= 20;
/** The Toll (rules v20): tiles up to this Length are free, each one past it costs 1 Seed */
export const TOLL_FREE_LENGTH = 10;
/** Rules v17+: a Small or Big bed can be skipped (before any line) for a Tag */
export const runRulesAllowSkip = (logVersion: number) => logVersion >= 17;

/** Skipping a Small bed makes the Big bed after it this much harder */
export const RUN_SKIP_TARGET_MULT = 1.5;

// ── Garden upgrades (rules v18+): one per Season, two tiers, for the whole Run ──

export const runRulesUseUpgrades = (logVersion: number) => logVersion >= 18;
export const GARDEN_UPGRADE_COST = 6;
export const GARDEN_UPGRADES: Record<
  GardenUpgradeId,
  { name: string; icon: string; text: string; needs?: GardenUpgradeId }
> = {
  ROOT_CELLAR: { name: "Root Cellar", icon: "🏺", text: "Interest can reach +10 🌱 (keep 50)" },
  OLD_OAK: { name: "Old Oak", icon: "🌳", text: "Interest can reach +20 🌱 (keep 100)", needs: "ROOT_CELLAR" },
  MARKET_DAY: { name: "Market Day", icon: "🧺", text: "Everything in the Shop costs 25% less" },
  HARVEST_FAIR: { name: "Harvest Fair", icon: "🎪", text: "Everything in the Shop costs 50% less", needs: "MARKET_DAY" },
  ALMANAC: { name: "Almanac", icon: "📖", text: "Fertilizer costs 3 less" },
  OBSERVATORY: { name: "Observatory", icon: "🔭", text: "Each Fertilizer gives 2 levels", needs: "ALMANAC" },
};
const UPGRADE_IDS = Object.keys(GARDEN_UPGRADES) as GardenUpgradeId[];

/** Extra interest cap from garden upgrades */
export const upgradeInterestBonus = (owned: GardenUpgradeId[]) =>
  owned.includes("OLD_OAK") ? 15 : owned.includes("ROOT_CELLAR") ? 5 : 0;

/**
 * The Shop after garden upgrades (rules v18+): this Season's upgrade joins
 * until one is bought this Season, and prices drop with Market Day / Almanac.
 */
export function finishShopOffers(
  offers: ShopOffer[],
  params: {
    runSeed: string;
    gardenIndex: number;
    owned: GardenUpgradeId[];
    boughtThisSeason: boolean;
    /** The Run's rules version: from v21 upgrades only appear from Season 3 */
    logVersion?: number;
    /** Rerolls so far in this Shop (a Sale or Two for one only marks the first offers) */
    rerolls?: number;
  }
): ShopOffer[] {
  const { owned } = params;
  // Rules v22+: one Seed packet in every Shop
  const withPacket = runRulesUsePackets(params.logVersion ?? 0)
    ? [...offers, packetOffer(params.runSeed, params.gardenIndex, offers)]
    : offers;
  const discount = owned.includes("HARVEST_FAIR") ? 0.5 : owned.includes("MARKET_DAY") ? 0.75 : 1;
  const priced = withPacket.map((o) => {
    let cost = o.cost;
    if (o.kind === "FERT" && owned.includes("ALMANAC")) cost = Math.max(1, cost - 3);
    if (discount < 1 && cost > 0) cost = Math.max(1, Math.floor(cost * discount));
    return cost === o.cost ? o : { ...o, cost };
  });
  const moment = (params.rerolls ?? 0) === 0 ? shopMomentFor(params.runSeed, params.gardenIndex, params.logVersion ?? 0) : null;
  if (moment === "SALE" || moment === "TWO_FOR_ONE") {
    const relics = priced.filter((o) => o.kind === "RELIC").sort((a, b) => a.cost - b.cost);
    // Sale: the priciest relic at half price · Two for one: the cheaper of two relics is free
    const marked = moment === "SALE" ? relics[relics.length - 1] : relics.length >= 2 ? relics[0] : undefined;
    if (marked) {
      const cost = moment === "SALE" ? Math.max(1, Math.ceil(marked.cost / 2)) : 0;
      priced.splice(priced.indexOf(marked), 1, { ...marked, cost, wasCost: marked.cost });
    }
  }
  if (params.boughtThisSeason) return priced;
  if (!shopUnlocks(params.logVersion ?? 0, getRunGardenPosition(params.gardenIndex).season).upgrades) return priced;
  const season = Math.floor(params.gardenIndex / 3);
  const available = UPGRADE_IDS.filter((id) => !owned.includes(id) && (!GARDEN_UPGRADES[id].needs || owned.includes(GARDEN_UPGRADES[id].needs!)));
  if (available.length === 0) return priced;
  const rng = mulberry32(hashStringToSeed(`upgrade-${params.runSeed}-s${season}-${owned.length}`));
  const upgrade = available[Math.floor(rng() * available.length)];
  return [...priced, { id: `s${season}-upgrade-${upgrade}`, kind: "UPGRADE", upgrade, cost: GARDEN_UPGRADE_COST }];
}

// ── Starting bags and rare Shop moments (rules v24+) ─────────────────────────

/** v24: a starting bag picked on the New Run sheet (never in the Daily Garden) */
export const runRulesUseBags = (logVersion: number) => logVersion >= 24;
export const STARTING_BAGS: Record<BagId, { name: string; text: string }> = {
  THORNY: { name: "Thorny bag", text: "More and stronger Thorns, more Shears, fewer Acorns." },
  ACORN: { name: "Acorn bag", text: "Twice the Acorns, fewer Thorns and Berries." },
  BERRY: { name: "Berry bag", text: "Twice the Berries for long lines, fewer Acorns and Gloves." },
  LEAN: { name: "Lean bag", text: "Only 30 tiles. Gloves, Shears, Berries and Acorns are 2 stronger. No room to Prune." },
};
export const BAG_IDS = Object.keys(STARTING_BAGS) as BagId[];

/** v24: from Season 2, about one Shop in five has a rare moment */
export const runRulesUseShopMoments = (logVersion: number) => logVersion >= 24;
export const SHOP_MOMENT_CHANCE = 0.2;
export const SHOP_MOMENTS: Record<ShopMomentId, { name: string; text: string }> = {
  SALE: { name: "Sale", text: "The priciest relic is half price." },
  FREE_REROLL: { name: "Free reroll", text: "Your first reroll here is free." },
  TWO_FOR_ONE: { name: "Two for one", text: "One of the relics is free." },
};
const MOMENT_IDS = Object.keys(SHOP_MOMENTS) as ShopMomentId[];

/** The rare moment of the Shop after this bed, if any (from the Run's seed) */
export function shopMomentFor(runSeed: string, gardenIndex: number, logVersion: number): ShopMomentId | null {
  if (!runRulesUseShopMoments(logVersion) || getRunGardenPosition(gardenIndex).season < 2) return null;
  const rng = mulberry32(hashStringToSeed(`moment-${runSeed}-g${gardenIndex}`));
  if (rng() >= SHOP_MOMENT_CHANCE) return null;
  return MOMENT_IDS[Math.floor(rng() * MOMENT_IDS.length)];
}

// ── Seed packets (rules v22+): one-use items, held two at a time ─────────────

export const runRulesUsePackets = (logVersion: number) => logVersion >= 22;
export const MAX_PACKETS = 2;
export const PACKET_COST = 4;
/** Clean Sweep and Golden Touch sizes */
const GOLDEN_TOUCH_TILES = 2;
const RAIN_DANCE_LIFE = 5;
const ROSE_CHARM_SHEARS = 3;

export const SEED_PACKETS: Record<PacketId, { name: string; short: string; text: string; nextLine: boolean }> = {
  LONG_ROOT: { name: "Long Root", short: "Length ×2 on your next line", text: "Your next line's Length counts double.", nextLine: true },
  ROSE_CHARM: { name: "Rose Charm", short: "+3 ✂️ Shears now", text: `Gives you ${ROSE_CHARM_SHEARS} ✂️ Shears: your next ${ROSE_CHARM_SHEARS} Thorns are cut free.`, nextLine: false },
  ACORN_ECHO: { name: "Acorn Echo", short: "🌰 score 3× on your next line", text: "On your next line every Acorn counts its number three times.", nextLine: true },
  CUTTING: { name: "Cutting", short: "Best tile scores twice next line", text: "On your next line, its highest-number tile counts twice.", nextLine: true },
  RAIN_DANCE: { name: "Rain Dance", short: `+${RAIN_DANCE_LIFE} ❤️ Life now`, text: `Gives back ${RAIN_DANCE_LIFE} ❤️ Life, up to your maximum.`, nextLine: false },
  GOLDEN_TOUCH: { name: "Golden Touch", short: `${GOLDEN_TOUCH_TILES} bag tiles turn Golden`, text: `${GOLDEN_TOUCH_TILES} tiles in your bag turn Golden (+30 Value each, for the rest of the Run).`, nextLine: false },
  SECOND_WIND: { name: "Second Wind", short: "+1 line in this bed", text: "This Garden Bed gets one more line.", nextLine: false },
  CLEAN_SWEEP: { name: "Clean Sweep", short: "Swap every Spike now", text: "Every Spike on the board is swapped for a new tile from your bag.", nextLine: false },
};
export const PACKET_IDS = Object.keys(SEED_PACKETS) as PacketId[];

/** The Shop's Seed packet (one per Shop and reroll, seeded) */
function packetOffer(runSeed: string, gardenIndex: number, offers: ShopOffer[]): ShopOffer {
  const key = offers.map((o) => o.id).join(",");
  const rng = mulberry32(hashStringToSeed(`packet-${runSeed}-g${gardenIndex}-${key}`));
  const packet = PACKET_IDS[Math.floor(rng() * PACKET_IDS.length)];
  return { id: `${offers[0]?.id ?? `g${gardenIndex}`}-packet`, kind: "PACKET", packet, cost: PACKET_COST };
}

/**
 * Uses held Seed packet `packet`. Immediate packets change the board, the bag
 * or your stats now; the others are armed for the next line (one at a time).
 * Returns why it can't be used, or the new state. The same for live play,
 * saves and replays.
 */
export function applySeedPacket(params: {
  packet: PacketId;
  runSeed: string;
  grid: GridCell[][];
  garden: RunGardenState;
  hero: HeroStats;
  bag: SeedTile[];
  armed: PacketId | null;
}): { grid: GridCell[][]; garden: RunGardenState; hero: HeroStats; bag: SeedTile[]; armed: PacketId | null } | string {
  const { packet, runSeed } = params;
  let { grid, garden, hero, bag, armed } = params;
  if (SEED_PACKETS[packet].nextLine) {
    if (armed) return "a packet is already waiting for the next line";
    armed = packet;
  } else if (packet === "ROSE_CHARM") {
    hero = { ...hero, weapon: hero.weapon + ROSE_CHARM_SHEARS };
  } else if (packet === "RAIN_DANCE") {
    if (hero.hp >= hero.maxHp) return "Life is already full";
    hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + RAIN_DANCE_LIFE) };
  } else if (packet === "GOLDEN_TOUCH") {
    const rng = mulberry32(hashStringToSeed(`packet-gold-${runSeed}-g${garden.gardenIndex}-${garden.strokesLeft}`));
    const plain = bag.map((t, i) => ({ t, i })).filter(({ t }) => !t.ed);
    if (plain.length === 0) return "no plain tiles left in the bag";
    const chosen = plain
      .map((x) => ({ ...x, k: rng() }))
      .sort((a, b) => a.k - b.k)
      .slice(0, GOLDEN_TOUCH_TILES)
      .map((x) => x.i);
    bag = bag.map((t, i) => (chosen.includes(i) ? { ...t, ed: "GOLDEN" as const } : t));
  } else if (packet === "SECOND_WIND") {
    garden = { ...garden, strokesLeft: garden.strokesLeft + 1, strokesTotal: (garden.strokesTotal ?? garden.strokesLeft) + 1 };
  } else if (packet === "CLEAN_SWEEP") {
    const spikes: GridCoord[] = [];
    grid.forEach((row) => row.forEach((c) => c.type === "TRAP" && spikes.push({ row: c.row, col: c.col })));
    if (spikes.length === 0) return "no Spikes on the board";
    const refill = refillRunGarden(grid, spikes, garden, runSeed);
    grid = refill.grid;
    garden = refill.state;
  }
  return { grid, garden, hero, bag, armed };
}

export type SkipTag = "FERTILE" | "GOLDEN" | "PURSE" | "RELIC";
export const SKIP_TAGS: Record<SkipTag, { name: string; icon: string; text: string }> = {
  FERTILE: { name: "Fertile Tag", icon: "🌱", text: "A free Fertilizer level for one tile type" },
  GOLDEN: { name: "Golden Tag", icon: "✨", text: "A tile in your bag turns Golden (+30 Value)" },
  PURSE: { name: "Purse Tag", icon: "👛", text: "+10 Seeds now" },
  RELIC: { name: "Relic Tag", icon: "🎁", text: "The next Shop has a free Rare relic" },
};
const SKIP_TAG_IDS = Object.keys(SKIP_TAGS) as SkipTag[];

/** The Tag a bed offers for skipping it (seeded, the same for everyone on this Run) */
export function getSkipTag(runSeed: string, gardenIndex: number): SkipTag {
  const rng = mulberry32(hashStringToSeed(`skip-tag-${runSeed}-g${gardenIndex}`));
  return SKIP_TAG_IDS[Math.floor(rng() * SKIP_TAG_IDS.length)];
}
/** A special tile's Shop price: 8 Seeds, 10 from Ascension 2 (null = none in these rules) */
export const runEditionTileCost = (logVersion: number, asc = 0): number | null =>
  runRulesUseEditions(logVersion) ? EDITION_TILE_COST + (runAscensionFor(logVersion, asc) >= 2 ? 2 : 0) : null;
/** Garden tools cost 2 more from Ascension 2 (null = no tools in these rules) */
export const runToolExtraCost = (logVersion: number, asc = 0): number | null =>
  runRulesUseTools(logVersion) ? (runAscensionFor(logVersion, asc) >= 2 ? 2 : 0) : null;

/**
 * Uses a garden tool on a board tile: the upgrade goes onto the tile's bag
 * entry, so it comes back with the tile in every later bed. null when the
 * tile can't take it (home, Exit, or already upgraded).
 */
export function applyGardenTool(params: {
  grid: GridCell[][];
  bag: SeedTile[];
  coord: GridCoord;
  tool: ToolId;
}): { grid: GridCell[][]; bag: SeedTile[] } | null {
  const cell = params.grid[params.coord.row]?.[params.coord.col];
  const tile = cell?.bagTile;
  if (!cell || !tile || cell.type === "HERO" || cell.type === "EXIT" || cell.type === "VOID") return null;
  // Echo is its own layer (rules v15+): it can join a tool upgrade, but only once per tile
  if (params.tool === "ECHO" ? tile.echo : tile.enh) return null;
  const upgraded: SeedTile =
    params.tool === "ECHO"
      ? { ...tile, echo: true }
      : { ...tile, enh: params.tool, dew: params.tool === "DEW" ? DEW_LINES : undefined };
  const index = params.bag.indexOf(tile);
  const bag = index >= 0 ? [...params.bag.slice(0, index), upgraded, ...params.bag.slice(index + 1)] : params.bag;
  const grid = params.grid.map((row) => [...row]);
  grid[params.coord.row][params.coord.col] = { ...cell, bagTile: upgraded };
  return { grid, bag };
}

/** After a scored line: each Dewy tile it passed loses one line of Dew (dry tiles lose the upgrade) */
export function dryDewAfterStroke(
  grid: GridCell[][],
  bag: SeedTile[],
  path: GridCoord[]
): { grid: GridCell[][]; bag: SeedTile[] } {
  let nextGrid = grid;
  let nextBag = bag;
  for (const c of path) {
    const cell = nextGrid[c.row]?.[c.col];
    const tile = cell?.bagTile;
    if (!tile || tile.enh !== "DEW") continue;
    const left = (tile.dew ?? 0) - 1;
    const dried: SeedTile = left > 0 ? { ...tile, dew: left } : { type: tile.type, value: tile.value };
    const index = nextBag.indexOf(tile);
    if (index >= 0) nextBag = [...nextBag.slice(0, index), dried, ...nextBag.slice(index + 1)];
    if (nextGrid === grid) nextGrid = grid.map((row) => [...row]);
    nextGrid[c.row][c.col] = { ...cell, bagTile: dried };
  }
  return { grid: nextGrid, bag: nextBag };
}

export const runFertilizerCost = (logVersion: number, asc = 0) =>
  runRulesUseFertilizer(logVersion) ? FERTILIZER_COST + (runAscensionFor(logVersion, asc) >= 2 ? 2 : 0) : 0;

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
  logVersion?: number;
  asc?: number;
}): { stats: HeroStats; rerolls: number; offers: ShopOffer[]; cost: number } | null {
  const freeMoment =
    params.rerolls === 0 && shopMomentFor(params.runSeed, params.floorNumber - 1, params.logVersion ?? RUN_LOG_VERSION) === "FREE_REROLL";
  const cost = freeMoment ? 0 : getRunRerollCost(params.rerolls, params.relics);
  if (params.stats.gold < cost) return null;
  const rerolls = params.rerolls + 1;
  const unlocked = shopUnlocks(params.logVersion ?? RUN_LOG_VERSION, getRunGardenPosition(params.floorNumber - 1).season);
  return {
    stats: { ...params.stats, gold: params.stats.gold - cost },
    rerolls,
    offers: generateShopOffers(
      params.runSeed,
      params.floorNumber,
      rerolls,
      params.relics,
      unlocked.fertilizer ? runFertilizerCost(params.logVersion ?? RUN_LOG_VERSION, params.asc) : 0,
      unlocked.tools ? runToolExtraCost(params.logVersion ?? RUN_LOG_VERSION, params.asc) : null,
      unlocked.tiles ? runEditionTileCost(params.logVersion ?? RUN_LOG_VERSION, params.asc) : null,
      runRulesUseEcho(params.logVersion ?? RUN_LOG_VERSION),
      runRulesUseV16Relics(params.logVersion ?? RUN_LOG_VERSION),
      runRulesUseV20Relics(params.logVersion ?? RUN_LOG_VERSION),
      runRulesUseRareShops(params.logVersion ?? RUN_LOG_VERSION) && getRunGardenPosition(params.floorNumber - 1).season >= RARE_SHOP_SEASON,
      runRulesUseV22Relics(params.logVersion ?? RUN_LOG_VERSION)
    ),
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
  /** Rules v17+: the bed before was skipped, so no Life comes back */
  skipped?: boolean;
  /** Rules v23+: Seasons whose Boss was rerolled */
  bossRerolls?: number[];
}): { hero: HeroStats; floor: DungeonFloor; state: RunGardenState } {
  const v = params.logVersion ?? RUN_LOG_VERSION;
  const rules = ascensionRules(runAscensionFor(v, params.asc));
  const hero = getNextFloorHeroStats(
    params.stats,
    params.classId,
    params.relics,
    params.upgrades,
    runModifierFor(v),
    params.skipped ? 0 : runClearLifeFor(v, params.asc)
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
    gentleStart: runRulesUseGentleStart(v),
    allBossRules: runRulesUseAllBosses(v),
    newBosses: runRulesUseNewBosses(v),
    bossV20: runRulesUseV20Bosses(v),
    weather: runRulesUseWeather(v),
    lateTargets: runRulesUseLateTargets(v),
    steepTargets: runRulesUseSteepTargets(v),
    bossRerolled: Boolean(params.bossRerolls?.includes(getRunGardenPosition(params.gardenIndex).season)),
    ...ascensionGardenParams(rules),
  });
  // Rules v20: the Wandering Gardener waits at the start of Seasons 4 and 6
  if (runRulesUseGardener(v) && GARDENER_BEDS.includes(params.gardenIndex)) {
    const gift = gardenerOffers(params.runSeed, params.gardenIndex, params.relics);
    return { hero, ...next, state: { ...next.state, gift } };
  }
  return { hero, ...next };
}

// ── The Wandering Gardener (rules v20): one gift at the start of Seasons 4 and 6 ──

export const runRulesUseGardener = (logVersion: number) => logVersion >= 20;
/** First beds of Season 4 and Season 6 */
export const GARDENER_BEDS = [9, 15];
export const GARDENER_SEEDS = 15;
export const GARDENER_LIFE = 2;
export const GARDENER_GOLDEN = 3;
export const GARDENER_GIFTS: Record<GardenerGiftId, { name: string; icon: string; text: string }> = {
  RARE_RELIC: { name: "A Rare relic", icon: "🎁", text: "A Rare relic you don't have yet, free." },
  GOLDEN_TILES: { name: "Golden tiles", icon: "✨", text: `${GARDENER_GOLDEN} tiles in your bag turn Golden (+30 Value each).` },
  MAX_LIFE: { name: "Stronger roots", icon: "❤️", text: `+${GARDENER_LIFE} max ❤️ Life for the rest of the Run.` },
  SEEDS: { name: "A purse of Seeds", icon: "🌱", text: `+${GARDENER_SEEDS} 🌱 Seeds right now.` },
};

/** A seeded Rare relic for the Gardener (null if none left) */
export function gardenerRelic(runSeed: string, gardenIndex: number, owned: RelicId[]): RelicId | null {
  // The v22 families stay out, so older Runs keep the same gift
  const pool = RELIC_LIST.filter((r) => r.rarity === "RARE" && !owned.includes(r.id) && !V22_RELICS.includes(r.id));
  if (pool.length === 0) return null;
  const rng = mulberry32(hashStringToSeed(`gardener-relic-${runSeed}-g${gardenIndex}`));
  return pool[Math.floor(rng() * pool.length)].id;
}

/** The three gifts on offer (a relic only when there is room for one) */
export function gardenerOffers(runSeed: string, gardenIndex: number, relics: RelicId[]): GardenerGiftId[] {
  const roomForRelic =
    countCommonRelics(relics) < MAX_COMMON_RELICS && gardenerRelic(runSeed, gardenIndex, relics) !== null;
  const pool: GardenerGiftId[] = ["GOLDEN_TILES", "MAX_LIFE", "SEEDS", ...(roomForRelic ? (["RARE_RELIC"] as const) : [])];
  const rng = mulberry32(hashStringToSeed(`gardener-${runSeed}-g${gardenIndex}`));
  return pool
    .map((id) => ({ id, k: rng() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 3)
    .map((x) => x.id);
}

/** What one gift does: the same for live play, saves and replays */
export function applyGardenerGift(params: {
  gift: GardenerGiftId;
  runSeed: string;
  gardenIndex: number;
  relics: RelicId[];
  bag: SeedTile[];
  hero: HeroStats;
}): { relics: RelicId[]; bag: SeedTile[]; hero: HeroStats; relic: RelicId | null } {
  const { gift, runSeed, gardenIndex } = params;
  let { relics, bag, hero } = params;
  let relic: RelicId | null = null;
  if (gift === "RARE_RELIC") {
    relic = gardenerRelic(runSeed, gardenIndex, relics);
    if (relic) relics = [...relics, relic];
  } else if (gift === "GOLDEN_TILES") {
    const rng = mulberry32(hashStringToSeed(`gardener-gold-${runSeed}-g${gardenIndex}`));
    const plain = bag.map((t, i) => ({ t, i })).filter(({ t }) => !t.ed);
    const chosen = plain
      .map((x) => ({ ...x, k: rng() }))
      .sort((a, b) => a.k - b.k)
      .slice(0, GARDENER_GOLDEN)
      .map((x) => x.i);
    bag = bag.map((t, i) => (chosen.includes(i) ? { ...t, ed: "GOLDEN" as const } : t));
  } else if (gift === "MAX_LIFE") {
    hero = { ...hero, maxHp: hero.maxHp + GARDENER_LIFE, hp: hero.hp + GARDENER_LIFE };
  } else if (gift === "SEEDS") {
    hero = { ...hero, gold: hero.gold + GARDENER_SEEDS };
  }
  return { relics, bag, hero, relic };
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
 * v11: a gentler first Season (targets 800 / 1,500 / 2,500).
 * v21: the Shop opens up by Season (Season 1: relics, boosts, Prune; Season
 *      2: + Fertilizer, garden tools and skipping a bed; Season 3: + special
 *      tiles and garden upgrades).
 * v20: six relics for exact and careful lines (Seven Stones, Short Cut,
 *      Straight Furrow, Light Step, Thornless Path, Even Rows) join the Shop.
 * v22: relic families (Acorn Pouch, Twin Acorns, Acorn Hoard, Berry Jam,
 *      Bramble Wine, Iron Moss, Lodestone, Garden Path Map) join the Shop, and
 *      Seed packets: one-use items bought in the Shop, held two at a time.
 * v23: a steeper climb (targets grow +0.25× each Season from Season 4, and
 *      faster still in Endless), and the Shop can reroll the coming Boss
 *      once per Season for Seeds.
 * v24: starting bags (Thorny, Acorn, Berry, Lean; the log's `bag`) and rare
 *      Shop moments from Season 2 (a Sale, a free reroll, two for one).
 * Older logs still replay with their own rules.
 */
export const RUN_LOG_VERSION = 24;
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
  /** Rules v13+: use held garden tool `i` on board tile `c` */
  | { k: "u"; i: number; c: number }
  /** Rules v17+: skip this Small or Big bed for its Tag */
  | { k: "k" }
  /** Rules v20+: take the Wandering Gardener's gift `i` */
  | { k: "g"; i: number }
  /** Rules v22+: use held Seed packet `i` */
  | { k: "c"; i: number }
  /** Rules v23+: reroll the coming Boss (in the Shop, once per Season) */
  | { k: "o" }
  | { k: "l"; h: HeroClassId };

export interface RunActionLog {
  v: number;
  seed: string;
  hero: HeroClassId;
  /** Ascension level (rules v8+); missing = 0 */
  asc?: number;
  /** Daily Garden for this date (YYYY-MM-DD): seed `daily-<date>`, the Keeper, Ascension 0, ends after Season 3 */
  d?: string;
  /** Rules v24+: the starting bag (missing = the usual Garden bag; never on a Daily) */
  bag?: BagId;
  a: RunLogAction[];
}

/** The Daily Garden ends once this bed (the Season 3 Boss) blooms */
export const RUN_DAILY_LAST_BED = 8;
export const dailyRunSeed = (dateKey: string) => `daily-${dateKey}`;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const packCoord = (c: GridCoord): number => c.row * 5 + c.col;
export const packCoords = (coords: GridCoord[]): number[] => coords.map(packCoord);
const unpackCoord = (n: number): GridCoord => ({ row: Math.floor(n / 5), col: n % 5 });

export function createRunLog(seed: string, hero: HeroClassId, asc = 0, daily?: string, bag?: BagId): RunActionLog {
  const log: RunActionLog = asc > 0 ? { v: RUN_LOG_VERSION, seed, hero, asc, a: [] } : { v: RUN_LOG_VERSION, seed, hero, a: [] };
  if (daily) return { ...log, d: daily };
  return bag ? { ...log, bag } : log;
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
  if (
    log.d !== undefined &&
    (typeof log.d !== "string" || !DATE_KEY.test(log.d) || log.seed !== dailyRunSeed(log.d) || log.hero !== "KNIGHT" || log.asc)
  ) {
    return null;
  }
  if (
    log.bag !== undefined &&
    (typeof log.bag !== "string" || !BAG_IDS.includes(log.bag as BagId) || log.v < 24 || log.d !== undefined)
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
    if (a.k === "k" && log.v >= 17) continue;
    if (a.k === "g" && log.v >= 20 && typeof a.i === "number" && Number.isInteger(a.i) && a.i >= 0 && a.i < 3) continue;
    if (a.k === "o" && log.v >= 23) continue;
    if (a.k === "c" && log.v >= 22 && typeof a.i === "number" && Number.isInteger(a.i) && a.i >= 0 && a.i < MAX_PACKETS) continue;
    if (
      a.k === "u" &&
      log.v >= 13 &&
      typeof a.i === "number" && Number.isInteger(a.i) && a.i >= 0 && a.i < MAX_TOOLS &&
      typeof a.c === "number" && Number.isInteger(a.c) && a.c >= 0 && a.c < 25
    ) {
      continue;
    }
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
  /** Garden tools held (rules v13+) */
  tools: ToolId[];
  /** Rules v22+: Seed packets held, and the one armed for the next line */
  packets: PacketId[];
  armedPacket: PacketId | null;
  /** Rules v23+: Seasons whose Boss was rerolled */
  bossRerolls: number[];
  /** Rules v17+: Tags taken by skipping beds, and a free Rare relic waiting for the next Shop */
  tags: SkipTag[];
  freeRelicNext: boolean;
  /** Rules v18+: garden upgrades owned, and the Seasons one was bought in */
  gardenUpgrades: GardenUpgradeId[];
  upgradeSeasons: number[];
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
  asc = 0,
  /** A Daily Garden: nothing more can happen once the Season 3 Boss blooms */
  daily = false,
  /** Rules v24+: the starting bag */
  bagId?: BagId
) {
  const first = startRunGarden(runSeed, heroClassId, logVersion, asc, bagId);
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
    tools: [],
    packets: [],
    armedPacket: null,
    bossRerolls: [],
    tags: [],
    freeRelicNext: false,
    gardenUpgrades: [],
    upgradeSeasons: [],
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
    if (daily && s.gardensBloomed > RUN_DAILY_LAST_BED) return "the Daily Garden ends after Season 3";

    // The Wandering Gardener (rules v20): a gift is picked before anything else
    if (action.k === "g") {
      const gifts = s.garden.gift;
      if (s.phase !== "PLAY" || !gifts) return "no gift waiting";
      const gift = gifts[action.i];
      if (!gift) return "unknown gift";
      const got = applyGardenerGift({
        gift,
        runSeed,
        gardenIndex: s.garden.gardenIndex,
        relics: s.relics,
        bag: s.bag,
        hero: s.startHero,
      });
      s.relics = got.relics;
      s.bag = got.bag;
      s.startHero = got.hero;
      s.garden = { ...s.garden, gift: undefined };
      return null;
    }
    if (s.garden.gift && s.phase === "PLAY") return "pick the Gardener's gift first";

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
        runRulesUseRelicSets(logVersion),
        s.garden.bossRuleId,
        Boolean(s.garden.bossV20),
        s.garden.weather,
        s.armedPacket
      );
      s.counters = countersAfter;
      s.armedPacket = null;
      if (runRulesUseTools(logVersion)) {
        const dried = dryDewAfterStroke(s.grid, s.bag, path);
        s.grid = dried.grid;
        s.bag = dried.bag;
      }
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
          gardenUpgrades: s.gardenUpgrades,
        });
        s.relics = bloom.relicsAfter;
        s.counters = bloom.countersAfter;
        s.garden = scored;
        const tagged = s.freeRelicNext ? addTagRelicOffer(bloom.offers, runSeed, scored.gardenIndex, s.relics) : bloom.offers;
        s.freeRelicNext = false;
        const offers = runRulesUseUpgrades(logVersion)
          ? finishShopOffers(tagged, {
              runSeed,
              gardenIndex: scored.gardenIndex,
              owned: s.gardenUpgrades,
              boughtThisSeason: s.upgradeSeasons.includes(Math.floor(scored.gardenIndex / 3)),
              logVersion,
            })
          : tagged;
        s.shop = { stats: bloom.statsWithPayout, offers, soldIds: [], rerolls: 0, pruned: false };
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
      if (offer.kind === "UPGRADE" && offer.upgrade) {
        if (s.shop.soldIds.includes(offer.id) || s.shop.stats.gold < offer.cost) return "purchase not allowed";
        s.gardenUpgrades = [...s.gardenUpgrades, offer.upgrade];
        s.upgradeSeasons = [...s.upgradeSeasons, Math.floor(s.garden.gardenIndex / 3)];
        s.shop = { ...s.shop, stats: { ...s.shop.stats, gold: s.shop.stats.gold - offer.cost }, soldIds: [...s.shop.soldIds, offer.id] };
        return null;
      }
      const bought = applyRunShopPurchase({
        stats: s.shop.stats,
        offer,
        relics: s.relics,
        upgrades: s.upgrades,
        soldIds: s.shop.soldIds,
        counters: s.counters,
        tools: s.tools,
        bag: s.bag,
        packets: s.packets,
      });
      if (!bought) return "purchase not allowed";
      if (bought.tools) s.tools = bought.tools;
      if (bought.packets) s.packets = bought.packets;
      if (offer.kind === "FERT" && offer.fert && s.gardenUpgrades.includes("OBSERVATORY") && bought.counters) {
        // Observatory: each Fertilizer gives a second level
        const key = `FERT_${offer.fert}` as const;
        bought.counters = { ...bought.counters, [key]: (bought.counters[key] ?? 0) + 1 };
      }
      if (bought.bag) s.bag = bought.bag;
      s.relics = bought.relics;
      if (bought.counters) s.counters = bought.counters;
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
        logVersion,
        asc,
      });
      if (!reroll) return "reroll not affordable";
      const rerolled = runRulesUseUpgrades(logVersion)
        ? finishShopOffers(reroll.offers, {
            runSeed,
            gardenIndex: s.garden.gardenIndex,
            owned: s.gardenUpgrades,
            boughtThisSeason: s.upgradeSeasons.includes(Math.floor(s.garden.gardenIndex / 3)),
            logVersion,
            rerolls: reroll.rerolls,
          })
        : reroll.offers;
      s.shop = { ...s.shop, stats: reroll.stats, offers: rerolled, soldIds: [], rerolls: reroll.rerolls };
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

    if (action.k === "u") {
      if (!runRulesUseTools(logVersion)) return "no garden tools in these rules";
      if (s.phase !== "PLAY") return "tool used outside a garden";
      const tool = s.tools[action.i];
      if (!tool) return "no such tool";
      const used = applyGardenTool({ grid: s.grid, bag: s.bag, coord: unpackCoord(action.c), tool });
      if (!used) return "tool can't go on that tile";
      s.grid = used.grid;
      s.bag = used.bag;
      s.tools = [...s.tools.slice(0, action.i), ...s.tools.slice(action.i + 1)];
      return null;
    }

    if (action.k === "c") {
      if (!runRulesUsePackets(logVersion)) return "no Seed packets in these rules";
      if (s.phase !== "PLAY") return "packet used outside a garden";
      const packet = s.packets[action.i];
      if (!packet) return "no such packet";
      const used = applySeedPacket({
        packet,
        runSeed,
        grid: s.grid,
        garden: s.garden,
        hero: s.startHero,
        bag: s.bag,
        armed: s.armedPacket,
      });
      if (typeof used === "string") return used;
      s.grid = used.grid;
      s.garden = used.garden;
      s.startHero = used.hero;
      s.bag = used.bag;
      s.armedPacket = used.armed;
      s.packets = [...s.packets.slice(0, action.i), ...s.packets.slice(action.i + 1)];
      if (packet === "CLEAN_SWEEP") checkSafeLine();
      return null;
    }

    if (action.k === "o") {
      if (!runRulesUseBossReroll(logVersion)) return "no Boss rerolls in these rules";
      if (s.phase !== "SHOP") return "Boss reroll outside the Shop";
      const season = comingBossSeason(s.garden.gardenIndex);
      if (s.bossRerolls.includes(season)) return "this Season's Boss was already rerolled";
      if (s.shop.stats.gold < BOSS_REROLL_COST) return "Boss reroll not affordable";
      s.bossRerolls = [...s.bossRerolls, season];
      s.shop = { ...s.shop, stats: { ...s.shop.stats, gold: s.shop.stats.gold - BOSS_REROLL_COST } };
      return null;
    }

    if (action.k === "k") {
      if (!runRulesAllowSkip(logVersion)) return "no skipping in these rules";
      if (s.phase !== "PLAY") return "skip outside a garden";
      const skip = applyRunSkip({
        runSeed,
        garden: s.garden,
        startHero: s.startHero,
        counters: s.counters,
        bag: s.bag,
        classId: s.classId,
        relics: s.relics,
        upgrades: s.upgrades,
        logVersion,
        asc,
      });
      if (typeof skip === "string") return skip;
      s.counters = skip.counters;
      s.bag = skip.bag;
      if (skip.tag === "RELIC") s.freeRelicNext = true;
      s.tags = [...s.tags, skip.tag];
      s.floor = skip.next.floor;
      s.grid = skip.next.floor.grid;
      s.garden = skip.next.state;
      s.startHero = skip.next.hero;
      checkSafeLine();
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
      bossRerolls: s.bossRerolls,
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
  const run = createRunReplayer(log.seed, log.hero, log.v, log.asc ?? 0, Boolean(log.d), log.bag);
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
