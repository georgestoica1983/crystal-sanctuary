export type EntityType =
  | "HERO"
  | "ENEMY"
  | "SHIELD"
  | "POTION"
  | "WEAPON"
  | "GOLD"
  | "TRAP"
  | "EXIT"
  | "VOID";

export type ModifierId =
  | "MIRROR_VERTICAL"
  | "BLOOD_GOLD"
  | "GLASS_ARMOR"
  | "MOMENTUM"
  | "ORTHOGONAL_ONLY"
  | "NONE";

export interface ModifierDefinition {
  id: ModifierId;
  name: string;
  shortTag: string;
  description: string;
  tacticalHint: string;
  accentColor: string;
}

export type HeroClassId = "KNIGHT" | "ROGUE" | "MAGE" | "VAMPIRE";

export interface HeroClassDefinition {
  id: HeroClassId;
  name: string;
  shortName: string;
  title: string;
  emblem: string;
  accentColor: string;
  startingHp: number;
  maxHp: number;
  startingShield: number;
  startingWeapon: number;
  passiveName: string;
  passiveSummary: string;
  ruleOverrideDesc: string;
  isFreeDefault: boolean;
  sanctuaryName?: string;
  sanctuaryShortName?: string;
  sanctuaryTitle?: string;
  sanctuaryEmblem?: string;
  sanctuaryPassiveName?: string;
  sanctuaryPassiveSummary?: string;
}

export type RelicId =
  | "GILDED_AEGIS"
  | "VORPAL_EDGE"
  | "ALCHEMIST_FLASK"
  | "SPIKED_BOOTS"
  | "LONG_STRIDE"
  | "GREED_CROWN"
  // Sanctuary Shop relics (score)
  | "GLASS_WATERING_CAN"
  | "GOLDEN_BEE"
  | "STARLIGHT_COMPASS"
  // Run relics (Phase 2): Chips
  | "MOSSY_STONE"
  | "BRIAR_PRESS"
  | "BRAMBLE_HEART"
  | "MAGPIE_NEST"
  | "COMPOST_HEAP"
  // +Mult
  | "LADYBUG"
  | "THISTLE_WALTZ"
  | "DEW_LENS"
  | "BERRY_BASKET"
  | "ZIGZAG_KITE"
  | "DAWN_CHORUS"
  | "OAK_SAPLING"
  | "RAIN_BARREL"
  // ×Mult
  | "SUN_PRISM"
  | "QUIET_SNAIL"
  | "EVENING_LANTERN"
  | "HARVEST_MOON"
  | "ELDER_TREE"
  // Economy
  | "SQUIRREL_STASH"
  | "SEED_PURSE"
  | "SUN_HAT"
  | "WISHING_WELL"
  // Magic / defence
  | "DEEP_TAPROOT"
  | "SUNFLOWER"
  // Legendary relics (Boss Garden rewards)
  | "THORN_CROWN"
  | "RAINBOW_HEART"
  | "ETERNAL_SPRING";

/** COMMON / UNCOMMON / RARE weight how often a relic shows up in the Shop */
export type RelicRarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY";

/** What a relic mainly does (groups the How-to-play list) */
export type RelicCategory = "CHIPS" | "MULT" | "XMULT" | "ECONOMY" | "MAGIC";

/** Growth kept in the Run for scaling relics (e.g. blooms while owned) */
export type RelicCounters = Partial<Record<RelicId, number>>;

/** Run facts some relics score on, beyond the line itself */
export interface RelicScoreContext {
  counters?: RelicCounters;
  /** Strokes left in the garden before this one (4 = first, 1 = last) */
  strokesLeft?: number;
}

export interface RelicDefinition {
  id: RelicId;
  name: string;
  icon: string;
  shortTag: string;
  description: string;
  accentColor: string;
  rarity?: RelicRarity; // COMMON when omitted
  cost?: number; // Shop price in Gems (common relics)
  category?: RelicCategory;
  /** Grows during the Run (its counter lives in RelicCounters) */
  scaling?: boolean;
}

/** Boss Garden twists, baked into the board's tile values when generated */
export type BossRuleId = "THISTLE_KING" | "BRIAR_QUEEN" | "DROUGHT" | "ECLIPSE";

export interface BossRuleDefinition {
  id: BossRuleId;
  name: string;
  icon: string;
  description: string;
}

/** Permanent stat boosts bought in the Sanctuary Shop for the rest of a run */
export interface RunUpgrades {
  bonusMaxMagic: number;
  bonusStartDew: number;
}

export type ShopStatId = "MAX_MAGIC" | "START_DEW";

export interface ShopOffer {
  id: string;
  kind: "RELIC" | "STAT";
  relicId?: RelicId;
  stat?: ShopStatId;
  cost: number;
}

/** Chips × Mult breakdown of one garden's score */
export interface FloorScoreBreakdown {
  gemChips: number;
  tileChips: number;
  chipSources: Array<{ label: string; value: number }>;
  chips: number;
  pathMult: number;
  multSources: Array<{ label: string; value: number }>;
  mult: number;
  xMultSources: Array<{ label: string; value: number }>;
  xMult: number;
  total: number;
}

export interface GridCoord {
  row: number;
  col: number;
}

export interface GridCell {
  id: string;
  row: number;
  col: number;
  type: EntityType;
  value: number;
  label?: string;
  bagTile?: SeedTile; // Run mode: the Seed Bag tile before any boss twist
}

export interface HeroStats {
  hp: number;
  maxHp: number;
  shield: number;
  weapon: number;
  gold: number;
}

export interface PathStepSimulation {
  stepIndex: number;
  coord: GridCoord;
  cell: GridCell;
  direction: { dr: number; dc: number } | null;
  hpBefore: number;
  hpAfter: number;
  hpDelta: number;
  shieldBefore: number;
  shieldAfter: number;
  shieldDelta: number;
  weaponBefore: number;
  weaponAfter: number;
  weaponDelta: number;
  goldBefore: number;
  goldAfter: number;
  goldDelta: number;
  isDead: boolean;
  isFirstDeathStep: boolean;
  shatteredShield: boolean;
  momentumTriggered: boolean;
  trapDodgedDiagonally: boolean;
  mirrorBonusApplied?: "VERTICAL_PENALTY" | "HORIZONTAL_DISCOUNT" | null;
  goldComboCount: number;
  isBlinkStep?: boolean;
  isShadowStepCross?: boolean;
  backstabApplied?: boolean;
  vampireHealApplied?: number;
  vampireTransmuteWeapon?: number;
  spikedBootsTriggered?: boolean;
  vorpalRetainedWeapon?: number;
  note: string;
}

export interface FloorStarBreakdown {
  star1Survivor: boolean; // Reach EXIT with HP >= 1
  star2Greed: boolean; // Collect at least 80% of GOLD nodes on the floor
  star3Flawless: boolean; // Finish floor with HP >= 80% of effective max HP OR visit 14+ cells in the single stroke
  totalStars: number; // 0..3
  goldNodesCollected: number;
  totalGoldNodesOnFloor: number;
}

export interface PathSimulationResult {
  steps: PathStepSimulation[];
  finalStats: HeroStats;
  projectedHp: number;
  projectedGold: number;
  projectedShield: number;
  projectedWeapon: number;
  firstDeathStepIndex: number | null;
  firstDeathCoord: GridCoord | null;
  endsOnExit: boolean;
  survives: boolean;
  canCommit: boolean;
  stars: FloorStarBreakdown;
  blinkUsedCount: number;
  selfCrossUsedCount: number;
  /** Sunbeam tiles on the board when the line was drawn */
  boardSunbeams: number;
}

export type FloorTier = number;

export interface DungeonFloor {
  floorNumber: FloorTier;
  title: string;
  subtitle: string;
  grid: GridCell[][];
  bossRuleId?: BossRuleId; // Boss Garden (every 3rd floor)
}

export interface DungeonTheme {
  seedKey: string;
  dateKey: string;
  title: string;
  lore: string;
  modifierId: ModifierId;
  source: "gemini" | "deterministic-fallback" | "custom-crafter";
  customPrompt?: string;
  floors: DungeonFloor[];
}

export type GamePhase =
  | "PLANNING"
  | "RESOLVING"
  | "FLOOR_CLEARED"
  | "RELIC_DRAFT"
  | "SHOP"
  | "VICTORY"
  | "DEFEAT";

export type GameMode =
  | "DAILY"
  | "SANDBOX"
  | "GAUNTLET"
  | "ARCHIVE"
  | "CUSTOM"
  | "RUN";

/** Run mode: each Season has a Small, a Big and a Boss Garden */
export type RunGardenKind = "SMALL" | "BIG" | "BOSS";

/** One tile in the run's Seed Bag (refills the board as strokes use tiles) */
export interface SeedTile {
  type: EntityType;
  value: number;
}

/** Live state of the garden being played in Run mode */
export interface RunGardenState {
  gardenIndex: number; // 0-based across the whole run
  season: number; // 1-based; > RUN_FINAL_SEASON is Endless
  kind: RunGardenKind;
  target: number;
  score: number;
  strokesLeft: number;
  weedOutsLeft: number;
  drawPile: SeedTile[];
  discardPile: SeedTile[];
  reshuffles: number;
  tileSerial: number; // keeps refilled tile ids unique
  bossRuleId?: BossRuleId;
  bestStars: number;
}

export interface FloorHistoryRecord {
  floorNumber: FloorTier;
  path: GridCoord[];
  gridSnapshot: GridCell[][];
  steps: PathStepSimulation[];
  endStats: HeroStats;
  cleared: boolean;
  stars?: FloorStarBreakdown;
  floorScore?: number; // This floor's score in isolation (see calculateFloorScore)
  parScore?: number; // Solver's best floor score from the same starting stats
  scoreBreakdown?: FloorScoreBreakdown;
}

export interface RunState {
  mode: GameMode;
  dungeon: DungeonTheme;
  currentFloorIndex: number;
  hero: HeroStats;
  floorStartHero: HeroStats;
  heroClassId: HeroClassId;
  activeRelics: RelicId[];
  drawnPath: GridCoord[];
  activeResolutionStep: number | null;
  phase: GamePhase;
  totalCellsVisited: number;
  floorHistory: FloorHistoryRecord[];
  finalScore: number;
}

export interface MonetizationState {
  expansionUnlocked: boolean; // $3.99 TACTICIAN_EXPANSION one-time unlock
  weekendPassExpiresAt: number | null; // legacy compatibility
  lifetimePassUnlocked: boolean; // legacy compatibility
  devSimulatePass: boolean;
}

export type HeroEmblemId = "CLASSIC_H" | "CROWN" | "LIGHTNING" | "SHIELD_STAR";

export type TrailSkinId =
  | "CYBER_CYAN"
  | "SOLAR_GOLD"
  | "EMERALD_FLAME"
  | "PLASMA_VIOLET";

export type VisualThemeMode = "SANCTUARY" | "TACTICIAN";

export type SanctuaryCompanionId = "CAT" | "OTTER" | "BUTTERFLY" | "FOX";

export interface CosmeticPreferences {
  emblemId: HeroEmblemId;
  trailId: TrailSkinId;
  visualTheme?: VisualThemeMode;
  companionId?: SanctuaryCompanionId;
}

export interface DailyPlayerStats {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  bestDailyScore: number;
  totalRunsCompleted: number;
  totalBankedGold: number;
  dailyHistory: Record<
    string,
    {
      score: number;
      survived: boolean;
      floorsCleared: number;
      starsEarned?: number;
      parPercent?: number;
      perfectCount?: number;
      heroClassId?: HeroClassId;
      shareAscii: string;
      timestamp: number;
    }
  >;
}

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  date_key: string;
  score: number;
  remaining_hp: number;
  gold_collected: number;
  cells_visited: number;
  modifier_id: ModifierId;
  survived: boolean;
  created_at: string;
}
