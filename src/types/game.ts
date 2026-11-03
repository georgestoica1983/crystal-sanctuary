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
  | "SHEARS"
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
  | "ETERNAL_SPRING"
  // Rules v16+: score-again and rule-bending relics
  | "FIRST_BLOOM"
  | "THORN_CHORUS"
  | "BELL_TOWER"
  | "ACORN_GATE"
  | "LONG_SHADOW"
  | "BRAMBLE_BERRIES"
  | "SOFT_MOSS"
  | "SUNBEAM_LENS"
  // Rules v20+: relics for exact and careful lines
  | "SEVEN_STONES"
  | "SHORT_CUT"
  | "STRAIGHT_FURROW"
  | "LIGHT_STEP"
  | "THORNLESS_PATH"
  | "EVEN_ROWS"
  // Rules v22+: relic families that build on each other (Acorns, Berries, Spikes, long lines)
  | "ACORN_POUCH"
  | "TWIN_ACORNS"
  | "ACORN_HOARD"
  | "BERRY_JAM"
  | "BRAMBLE_WINE"
  | "IRON_MOSS"
  | "LODESTONE"
  | "GARDEN_PATH_MAP";

/** COMMON / UNCOMMON / RARE weight how often a relic shows up in the Shop */
export type RelicRarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY";

/** What a relic mainly does (groups the How-to-play list) */
export type RelicCategory = "CHIPS" | "MULT" | "XMULT" | "ECONOMY" | "MAGIC";

/** Growth kept in the Run for scaling relics (e.g. blooms while owned) */
/** Tile types Fertilizer can level up (rules v12+) */
export type FertTile = "ENEMY" | "TRAP" | "GOLD" | "POTION" | "SHIELD" | "WEAPON";
/** Run counters: scaling relics' growth, plus Fertilizer levels as `FERT_<tile>` (rules v12+) */
export type RelicCounters = Partial<Record<RelicId | `FERT_${FertTile}`, number>>;

/** Run facts some relics score on, beyond the line itself */
export interface RelicScoreContext {
  counters?: RelicCounters;
  /** Strokes left in the garden before this one (4 = first, 1 = last) */
  strokesLeft?: number;
  /** Rules v10+: 3 relics with one theme tag score every line ×1.25 */
  relicSets?: boolean;
  /** Rules v19+: the bed's Boss rule, for the Bosses that change scoring */
  bossRuleId?: BossRuleId;
  /** Rules v20+: the bed's weather (Golden Hour doubles safe lines) */
  weather?: RunWeather;
  /** Rules v22+: a Seed packet armed for this line (Long Root, Acorn Echo, Cutting) */
  packet?: PacketId;
}

/** Rules v22+: Seed packets, one-use items (some act at once, some on the next line) */
/** Rules v24+: a starting Tile Bag picked for the Run (none = the usual Garden bag) */
export type BagId = "THORNY" | "ACORN" | "BERRY" | "LEAN";

/** Rules v24+: a rare Shop moment (a Sale, a free reroll, or two relics for one) */
export type ShopMomentId = "SALE" | "FREE_REROLL" | "TWO_FOR_ONE";

export type PacketId =
  | "LONG_ROOT"
  | "ROSE_CHARM"
  | "ACORN_ECHO"
  | "CUTTING"
  | "RAIN_DANCE"
  | "GOLDEN_TOUCH"
  | "SECOND_WIND"
  | "CLEAN_SWEEP";

/** Rules v20+: the Wandering Gardener's gifts (Seasons 4 and 6) */
export type GardenerGiftId = "RARE_RELIC" | "GOLDEN_TILES" | "MAX_LIFE" | "SEEDS";

/** Rules v20+: weather on some Small and Big beds from Season 2 */
export type RunWeather = "GOLDEN_HOUR" | "THICK_BRAMBLES" | "SPRING_RAIN" | "FIREFLY_NIGHT";

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
export type BossRuleId =
  | "THISTLE_KING"
  | "BRIAR_QUEEN"
  | "DROUGHT"
  | "ECLIPSE"
  | "FROST"
  | "ACORN_THIEF"
  | "SPIKE_BLOOM"
  | "EVEN_GARDEN"
  // Rules v19+: Bosses that change how you draw, what you see, or what a line costs
  | "NARROW_PATH"
  | "LONG_ROAD"
  | "FOG"
  | "TOLL";

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
  kind: "RELIC" | "STAT" | "FERT" | "TOOL" | "TILE" | "UPGRADE" | "PACKET";
  /** Seed packet (rules v22+): a one-use item, held two at a time */
  packet?: PacketId;
  /** Garden upgrade (rules v18+): lasts the whole Run */
  upgrade?: GardenUpgradeId;
  /** Special tile for sale (rules v14+): added to the Tile Bag */
  tile?: SeedTile;
  /** Garden tool (rules v13+) */
  tool?: ToolId;
  relicId?: RelicId;
  stat?: ShopStatId;
  /** Fertilizer: the tile type it levels up for the rest of the Run */
  fert?: FertTile;
  cost: number;
  /** Rules v24+: the price before a Shop moment (Sale or Two for one) */
  wasCost?: number;
}

/** Chips × Mult breakdown of one garden's score */
/** One relic (or relic set) adding to a line's score; `art` is its icon */
export interface ScoreSource {
  label: string;
  value: number;
  /** An Echo tile's second count (the scoring show plays it on the tile itself) */
  echo?: boolean;
  relicId?: RelicId;
  art?: string;
}

export interface FloorScoreBreakdown {
  gemChips: number;
  tileChips: number;
  chipSources: ScoreSource[];
  chips: number;
  pathMult: number;
  multSources: ScoreSource[];
  mult: number;
  xMultSources: ScoreSource[];
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
  /** The Drought (rules v20): these Berries still score but give no Life back */
  dry?: boolean;
  /** Thick Brambles (rules v20): extra Life this Thorn costs (its points stay the same) */
  harm?: number;
  /** Spring Rain (rules v20): these Berries heal double */
  wet?: boolean;
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
  /** Garden tool upgrade (rules v13+): stays on this tile for the whole Run */
  enh?: ToolId;
  /** Dew: lines left before it dries */
  dew?: number;
  /** Special tile (rules v14+): a shimmer it was found or bought with */
  ed?: Edition;
  /** Echo (rules v15+): the tile scores twice — its own layer, so it can sit with a tool upgrade */
  echo?: boolean;
}

/** Garden upgrades (rules v18+), Bloomline's Vouchers: two tiers each */
export type GardenUpgradeId = "ROOT_CELLAR" | "OLD_OAK" | "MARKET_DAY" | "HARVEST_FAIR" | "ALMANAC" | "OBSERVATORY";

/** Special tiles (rules v14+), Bloomline's Editions */
export type Edition = "GOLDEN" | "IRIDESCENT" | "RADIANT";

/** One-use garden tools (rules v13+) that upgrade a tile in the Tile Bag for good */
export type ToolId = "RICH_SOIL" | "LONG_ROOT" | "SUNLIT" | "DEW" | "ECHO";

/** Live state of the garden being played in Run mode */
export interface RunGardenState {
  /** Rules v20+: this bed's Boss uses the route-changing rules (Spike walls, dry Berries, the Toll per tile) */
  bossV20?: boolean;
  /** Rules v20+: this bed's weather, if any */
  weather?: RunWeather;
  /** Rules v20+: the Wandering Gardener is waiting with these gifts (pick one before the first line) */
  gift?: GardenerGiftId[];
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
  /** Ascension (rules v8+): extra Thorn strength on tiles laid in this garden */
  thornBonus?: number;
  /** Lines this garden started with (Ascension 6 Boss gardens have 3) */
  strokesTotal?: number;
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
  | "PLASMA_VIOLET"
  | "RAINBOW"
  | "BLOSSOM"
  | "SUNSET"
  | "STARLIGHT"
  | "EMBER"
  // Garden Journal rewards
  | "PRESSED_PETAL"
  | "GOLDEN_LEAF";

/** Garden board colour themes (looks only) */
export type BoardThemeId = "SPRING" | "AUTUMN" | "NIGHT" | "WINTER" | "GOLDEN" | "ROYAL" | "HERBARIUM";

export type VisualThemeMode = "SANCTUARY" | "TACTICIAN";

export type SanctuaryCompanionId = "CAT" | "OTTER" | "BUTTERFLY" | "FOX";

export interface CosmeticPreferences {
  emblemId: HeroEmblemId;
  trailId: TrailSkinId;
  visualTheme?: VisualThemeMode;
  companionId?: SanctuaryCompanionId;
  boardThemeId?: BoardThemeId;
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
