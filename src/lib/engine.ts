import {
  BossRuleDefinition,
  BossRuleId,
  DungeonFloor,
  DungeonTheme,
  EntityType,
  FloorHistoryRecord,
  FloorScoreBreakdown,
  FloorStarBreakdown,
  FloorTier,
  GridCell,
  GridCoord,
  HeroClassDefinition,
  HeroClassId,
  HeroEmblemId,
  HeroStats,
  ModifierDefinition,
  ModifierId,
  PathSimulationResult,
  PathStepSimulation,
  RelicCounters,
  RelicDefinition,
  RelicId,
  RelicRarity,
  RelicScoreContext,
  RunGardenKind,
  RunGardenState,
  RunUpgrades,
  SeedTile,
  ShopOffer,
  ShopStatId,
  TrailSkinId,
} from "@/types/game";
import {
  getDungeonDisplay,
  getRelicDisplay,
  SHARE_TILE_EMOJI,
} from "@/lib/sanctuaryCopy";

export const INITIAL_HERO_STATS: HeroStats = {
  hp: 10,
  maxHp: 10,
  shield: 2,
  weapon: 0,
  gold: 0,
};

export const HERO_CLASS_REGISTRY: Record<HeroClassId, HeroClassDefinition> = {
  KNIGHT: {
    id: "KNIGHT",
    name: "The Cozy Keeper",
    shortName: "Keeper",
    title: "Gloves Guardian",
    emblem: "🐱",
    accentColor: "#FBBF24",
    startingHp: 10,
    maxHp: 10,
    startingShield: 2,
    startingWeapon: 0,
    passiveName: "Sturdy Bulwark (+2 Gloves)",
    passiveSummary:
      "Starts every floor with +2 Bonus Gloves. Gloves carry over 50% between floors (+2 base).",
    ruleOverrideDesc:
      "Standard 8-directional unbroken line, no self-intersection. Starts with +2 Gloves.",
    isFreeDefault: true,
    sanctuaryName: "The Cozy Keeper",
    sanctuaryShortName: "Keeper",
    sanctuaryTitle: "Gloves Guardian",
    sanctuaryEmblem: "🐱",
    sanctuaryPassiveName: "Sturdy Fur",
    sanctuaryPassiveSummary:
      "Starts every garden with +2 Gloves, and keeps half its leftover Gloves for the next one.",
  },
  ROGUE: {
    id: "ROGUE",
    name: "The River Otter",
    shortName: "Otter",
    title: "Pathfinder Rogue",
    emblem: "🦦",
    accentColor: "#38BDF8",
    startingHp: 8,
    maxHp: 8,
    startingShield: 0,
    startingWeapon: 3,
    passiveName: "Agile Swimmer (Self-Cross & Diagonal Shears)",
    passiveSummary:
      "Cross your own drawn line 1x per floor! Gets +2 Bonus Weapon Shears on diagonal attacks.",
    ruleOverrideDesc:
      "Self-Cross Allowed (1x): Re-visit an already visited cell once per floor. Diagonal moves against Enemies deal +2 Weapon Shears.",
    isFreeDefault: false,
    sanctuaryName: "The River Otter",
    sanctuaryShortName: "Otter",
    sanctuaryTitle: "Riverbank Wanderer",
    sanctuaryEmblem: "🦦",
    sanctuaryPassiveName: "Agile Swimmer",
    sanctuaryPassiveSummary:
      "May cross its own line once per garden, and Thorns are 2 weaker when it steps into them diagonally.",
  },
  MAGE: {
    id: "MAGE",
    name: "The Starlight Fox",
    shortName: "Fox",
    title: "Mystic Mage",
    emblem: "🦊",
    accentColor: "#C084FC",
    startingHp: 7,
    maxHp: 7,
    startingShield: 4,
    startingWeapon: 0,
    passiveName: "Phase Jump (Blink & +2 Berry Healing)",
    passiveSummary:
      "Skip over 1 adjacent tile completely 1x per floor, and Potions/Berries grant +2 extra healing!",
    ruleOverrideDesc:
      "2-Tile Teleport Jump (1x/floor): Drag or tap 2 cells away to warp over an adjacent tile. Potions/Berries heal +2 extra.",
    isFreeDefault: false,
    sanctuaryName: "The Starlight Fox",
    sanctuaryShortName: "Fox",
    sanctuaryTitle: "Starlight Hopper",
    sanctuaryEmblem: "🦊",
    sanctuaryPassiveName: "Phase Jump",
    sanctuaryPassiveSummary:
      "Hops over one tile once per garden, and Berries restore +2 extra Life.",
  },
  VAMPIRE: {
    id: "VAMPIRE",
    name: "The Bloom Sprite",
    shortName: "Sprite",
    title: "Nature's Alchemist",
    emblem: "🦋",
    accentColor: "#34D399",
    startingHp: 10,
    maxHp: 10,
    startingShield: 0,
    startingWeapon: 0,
    passiveName: "Acorn Harmony (+1 Life on Every Acorn)",
    passiveSummary:
      "Every 🌰 Seed (Gold) tile you collect also heals +1 Life/HP! Defeating Enemies heals +2 HP.",
    ruleOverrideDesc:
      "Nature's friend! Slaying Enemies restores +2 HP; stepping on Seed (Gold) tiles restores +1 Life/HP.",
    isFreeDefault: false,
    sanctuaryName: "The Bloom Sprite",
    sanctuaryShortName: "Sprite",
    sanctuaryTitle: "Friend of the Flowers",
    sanctuaryEmblem: "🦋",
    sanctuaryPassiveName: "Acorn Harmony",
    sanctuaryPassiveSummary:
      "Every 🌰 Acorn restores +1 Life and clearing a Thorn restores +2. Can't hold Gloves — Gloves tiles give ✂️ Shears instead.",
  },
};

export const HERO_CLASS_LIST: HeroClassDefinition[] =
  Object.values(HERO_CLASS_REGISTRY);

export function getInitialHeroStatsForClass(
  classId: HeroClassId = "KNIGHT"
): HeroStats {
  const def = HERO_CLASS_REGISTRY[classId] ?? HERO_CLASS_REGISTRY.KNIGHT;
  return {
    hp: def.startingHp,
    maxHp: def.maxHp,
    shield: def.startingShield,
    weapon: def.startingWeapon,
    gold: 0,
  };
}

export const NO_RUN_UPGRADES: RunUpgrades = { bonusMaxMagic: 0, bonusStartDew: 0 };

export function getNextFloorHeroStats(
  prevStats: HeroStats,
  classId: HeroClassId,
  activeRelics: RelicId[] = [],
  upgrades: RunUpgrades = NO_RUN_UPGRADES,
  modifierId: ModifierId = "NONE",
  /** Life restored for clearing the last garden (Run rules v5+) */
  clearedLifeBonus = 0
): HeroStats {
  const def = HERO_CLASS_REGISTRY[classId] ?? HERO_CLASS_REGISTRY.KNIGHT;
  const shears = modifierId === "SHEARS";
  const flaskStacks = activeRelics.filter(
    (r) => r === "ALCHEMIST_FLASK"
  ).length;
  const hasTaproot = activeRelics.includes("DEEP_TAPROOT");
  // Shop "Deep Roots" boosts (and Deep Taproot) raise Max Life for the rest of the run
  const baseMaxHp = def.maxHp + upgrades.bonusMaxMagic + (hasTaproot ? 4 : 0);
  const maxAllowedHp = baseMaxHp + flaskStacks * 4;
  const restoredHp = prevStats.hp + (hasTaproot ? 3 : 0) + clearedLifeBonus;
  // Legendary Eternal Spring: every garden starts at full Life
  const nextHp = activeRelics.includes("ETERNAL_SPRING")
    ? Math.max(baseMaxHp, Math.min(maxAllowedHp, restoredHp))
    : Math.min(maxAllowedHp, Math.max(1, restoredHp));
  const bonusDew = upgrades.bonusStartDew;
  // Under the Shears rule Power counts cuts, so boosts give one cut
  const bonusSun = activeRelics.includes("SUNFLOWER") ? (shears ? 1 : 3) : 0;

  if (classId === "KNIGHT") {
    // Bulwark: Shields carry over 50% between floors + 2 starting floor shield
    const carriedShield = Math.floor(prevStats.shield * 0.5) + 2;
    return {
      hp: nextHp,
      maxHp: baseMaxHp,
      shield: carriedShield + bonusDew,
      weapon: prevStats.weapon + bonusSun,
      gold: prevStats.gold,
    };
  }

  if (classId === "ROGUE") {
    return {
      hp: nextHp,
      maxHp: baseMaxHp,
      shield: prevStats.shield + bonusDew,
      weapon: Math.max(prevStats.weapon, shears ? 1 : 3) + bonusSun,
      gold: prevStats.gold,
    };
  }

  if (classId === "MAGE") {
    return {
      hp: nextHp,
      maxHp: baseMaxHp,
      shield: Math.max(prevStats.shield, 4) + bonusDew,
      weapon: prevStats.weapon + bonusSun,
      gold: prevStats.gold,
    };
  }

  // VAMPIRE: Cannot gain Shield
  return {
    hp: nextHp,
    maxHp: baseMaxHp,
    shield: 0,
    weapon: prevStats.weapon + bonusSun,
    gold: prevStats.gold,
  };
}

export const RELIC_REGISTRY: Record<RelicId, RelicDefinition> = {
  GILDED_AEGIS: {
    id: "GILDED_AEGIS",
    name: "Gilded Aegis",
    icon: "🧤",
    shortTag: "GOLD → +1 SHD",
    description: "Picking up GOLD also grants +1 Gloves.",
    accentColor: "#06B6D4",
    cost: 7,
    category: "MAGIC",
  },
  VORPAL_EDGE: {
    id: "VORPAL_EDGE",
    name: "Vorpal Edge",
    icon: "🗡️",
    shortTag: "KEEP 50% WPN",
    description:
      "WEAPON pickups no longer break completely after 1 hit—they retain 50% (rounded down) of their power.",
    accentColor: "#F59E0B",
    cost: 8,
    category: "MAGIC",
  },
  ALCHEMIST_FLASK: {
    id: "ALCHEMIST_FLASK",
    name: "Alchemist Flask",
    icon: "🧪",
    shortTag: "OVERHEAL +4 HP",
    description:
      "POTION tiles can overheal your Hero up to +4 HP above Max HP.",
    accentColor: "#10B981",
    cost: 6,
    category: "MAGIC",
  },
  SPIKED_BOOTS: {
    id: "SPIKED_BOOTS",
    name: "Spiked Boots",
    icon: "🥾",
    shortTag: "TRAP → +3 WPN",
    description:
      "Stepping on a TRAP orthogonally deals 0 damage to you and instead grants +3 Weapon.",
    accentColor: "#FB7185",
    cost: 6,
    category: "MAGIC",
  },
  LONG_STRIDE: {
    id: "LONG_STRIDE",
    name: "Long Stride",
    icon: "⚡",
    shortTag: "12+ CELLS = -1 DMG",
    description:
      "If your path length is 12+ cells, reduce all Enemy damage on the floor by -1.",
    accentColor: "#A855F7",
    cost: 7,
    category: "MAGIC",
  },
  GREED_CROWN: {
    id: "GREED_CROWN",
    name: "Greed Crown",
    icon: "👑",
    shortTag: "2x GOLD & +1 HP",
    description: "All GOLD nodes are worth 2x score and heal +1 HP.",
    accentColor: "#EAB308",
    cost: 10,
    category: "CHIPS",
    rarity: "UNCOMMON",
  },
  GLASS_WATERING_CAN: {
    id: "GLASS_WATERING_CAN",
    name: "Glass Watering Can",
    icon: "🫖",
    shortTag: "+3 VALUE PER 🍓/🧤",
    description: "Every Berry and Gloves tile on your line adds +3 Value.",
    accentColor: "#06B6D4",
    cost: 7,
    category: "CHIPS",
  },
  GOLDEN_BEE: {
    id: "GOLDEN_BEE",
    name: "Golden Bee",
    icon: "🐝",
    shortTag: "+1 LENGTH PER 🌰",
    description: "Every Acorn on your line adds +1 Length.",
    accentColor: "#EAB308",
    cost: 9,
    category: "MULT",
    rarity: "UNCOMMON",
  },
  STARLIGHT_COMPASS: {
    id: "STARLIGHT_COMPASS",
    name: "Starlight Compass",
    icon: "🧭",
    shortTag: "12+ TILES = ×1.5",
    description: "If your line is 12 or more tiles long, your score is ×1.5.",
    accentColor: "#A855F7",
    cost: 10,
    category: "XMULT",
    rarity: "UNCOMMON",
  },
  // ── Run relics: Value ──
  MOSSY_STONE: {
    id: "MOSSY_STONE",
    name: "Mossy Stone",
    icon: "🪨",
    shortTag: "+30 VALUE",
    description: "Every line gets +30 Value.",
    accentColor: "#84CC16",
    cost: 4,
    category: "CHIPS",
  },
  BRIAR_PRESS: {
    id: "BRIAR_PRESS",
    name: "Thorn Press",
    icon: "📕",
    shortTag: "+6 VALUE PER 🌺",
    description: "Every Thorn on your line adds +6 Value.",
    accentColor: "#F43F5E",
    cost: 5,
    category: "CHIPS",
  },
  BRAMBLE_HEART: {
    id: "BRAMBLE_HEART",
    name: "Bramble Heart",
    icon: "💔",
    shortTag: "+5 VALUE PER LIFE LOST",
    description: "+5 Value for every Life the line costs you.",
    accentColor: "#E11D48",
    cost: 6,
    rarity: "UNCOMMON",
    category: "CHIPS",
  },
  MAGPIE_NEST: {
    id: "MAGPIE_NEST",
    name: "Magpie's Nest",
    icon: "🪺",
    shortTag: "+3 VALUE PER 🌱 HELD",
    description: "+3 Value for every Seed in your purse when the line starts.",
    accentColor: "#FACC15",
    cost: 6,
    rarity: "UNCOMMON",
    category: "CHIPS",
  },
  COMPOST_HEAP: {
    id: "COMPOST_HEAP",
    name: "Compost Heap",
    icon: "🍂",
    shortTag: "GROWS +2 VALUE PER 🌺",
    description:
      "Grows by +2 Value for every Thorn your lines clear, for the rest of the Run.",
    accentColor: "#D97706",
    cost: 6,
    rarity: "UNCOMMON",
    category: "CHIPS",
    scaling: true,
  },
  // ── Run relics: +Length ──
  LADYBUG: {
    id: "LADYBUG",
    name: "Ladybug",
    icon: "🐞",
    shortTag: "+4 LENGTH",
    description: "Every line gets +4 Length.",
    accentColor: "#EF4444",
    cost: 4,
    category: "MULT",
  },
  THISTLE_WALTZ: {
    id: "THISTLE_WALTZ",
    name: "Spike Waltz",
    icon: "🦗",
    shortTag: "+3 LENGTH PER ⚙️ DODGED",
    description: "Every Spike you cross diagonally (unhurt) adds +3 Length.",
    accentColor: "#22C55E",
    cost: 5,
    category: "MULT",
  },
  DEW_LENS: {
    id: "DEW_LENS",
    name: "Glove Lens",
    icon: "🔍",
    shortTag: "+2 LENGTH PER 🧤 LEFT",
    description: "+2 Length for every Gloves you still hold when the line reaches the Exit.",
    accentColor: "#38BDF8",
    cost: 5,
    category: "MULT",
  },
  BERRY_BASKET: {
    id: "BERRY_BASKET",
    name: "Berry Basket",
    icon: "🧺",
    shortTag: "+2 LENGTH PER 🍓",
    description: "Every Berry on your line adds +2 Length.",
    accentColor: "#FB7185",
    cost: 4,
    category: "MULT",
  },
  ZIGZAG_KITE: {
    id: "ZIGZAG_KITE",
    name: "Zigzag Kite",
    icon: "🪁",
    shortTag: "+1 LENGTH PER DIAGONAL",
    description: "Every diagonal step in your line adds +1 Length.",
    accentColor: "#A78BFA",
    cost: 6,
    rarity: "UNCOMMON",
    category: "MULT",
  },
  DAWN_CHORUS: {
    id: "DAWN_CHORUS",
    name: "Dawn Chorus",
    icon: "🐦",
    shortTag: "1ST LINE +10 LENGTH",
    description: "The first line of every garden gets +10 Length.",
    accentColor: "#FDBA74",
    cost: 5,
    category: "MULT",
  },
  OAK_SAPLING: {
    id: "OAK_SAPLING",
    name: "Oak Sapling",
    icon: "🪴",
    shortTag: "GROWS +3 LENGTH PER BED",
    description: "Gains +3 Length every time a garden is cleared while you have it.",
    accentColor: "#4ADE80",
    cost: 7,
    rarity: "UNCOMMON",
    category: "MULT",
    scaling: true,
  },
  RAIN_BARREL: {
    id: "RAIN_BARREL",
    name: "Rain Barrel",
    icon: "🛢️",
    shortTag: "GROWS +1 LENGTH PER SPARE 🌿",
    description:
      "Each time a garden is cleared, gains +1 Length for every Swap you didn't use there.",
    accentColor: "#0EA5E9",
    cost: 5,
    category: "MULT",
    scaling: true,
  },
  // ── Run relics: ×Length ──
  SUN_PRISM: {
    id: "SUN_PRISM",
    name: "Shears Prism",
    icon: "🔆",
    shortTag: "EVERY ✂️ ON LINE = ×2",
    description:
      "×2 if your line gathers every ✂️ Shears on the board (at least 2 of them).",
    accentColor: "#FDE047",
    cost: 8,
    rarity: "RARE",
    category: "XMULT",
  },
  QUIET_SNAIL: {
    id: "QUIET_SNAIL",
    name: "Quiet Snail",
    icon: "🐌",
    shortTag: "NO LIFE LOST = ×1.5",
    description: "×1.5 if the line costs you no Life.",
    accentColor: "#2DD4BF",
    cost: 7,
    rarity: "UNCOMMON",
    category: "XMULT",
  },
  EVENING_LANTERN: {
    id: "EVENING_LANTERN",
    name: "Evening Lantern",
    icon: "🏮",
    shortTag: "LAST STROKE ×2",
    description: "The last line of every garden scores ×2.",
    accentColor: "#F97316",
    cost: 8,
    rarity: "RARE",
    category: "XMULT",
  },
  HARVEST_MOON: {
    id: "HARVEST_MOON",
    name: "Harvest Moon",
    icon: "🌕",
    shortTag: "18+ TILES = ×2",
    description: "If your line is 18 or more tiles long, your score is ×2.",
    accentColor: "#FCD34D",
    cost: 10,
    rarity: "RARE",
    category: "XMULT",
  },
  ELDER_TREE: {
    id: "ELDER_TREE",
    name: "Elder Tree",
    icon: "🌳",
    shortTag: "GROWS ×0.1 PER BED",
    description:
      "Starts at ×1 and grows by ×0.1 every time a garden is cleared while you have it.",
    accentColor: "#16A34A",
    cost: 9,
    rarity: "RARE",
    category: "XMULT",
    scaling: true,
  },
  // ── Run relics: economy ──
  SQUIRREL_STASH: {
    id: "SQUIRREL_STASH",
    name: "Squirrel's Stash",
    icon: "🐿️",
    shortTag: "INTEREST CAP +5",
    description: "Interest can pay up to +10 🌱 per Garden Bed instead of +5.",
    accentColor: "#B45309",
    cost: 6,
    rarity: "UNCOMMON",
    category: "ECONOMY",
  },
  SEED_PURSE: {
    id: "SEED_PURSE",
    name: "Seed Purse",
    icon: "👛",
    shortTag: "+2 🌱 PER BED",
    description: "Every Garden Bed you clear pays +2 🌱 more.",
    accentColor: "#EAB308",
    cost: 4,
    category: "ECONOMY",
  },
  SUN_HAT: {
    id: "SUN_HAT",
    name: "Garden Hat",
    icon: "👒",
    shortTag: "SPARE LINES 2 🌱",
    description: "Each unused line pays 2 🌱 instead of 1 when a Garden Bed is cleared.",
    accentColor: "#F59E0B",
    cost: 4,
    category: "ECONOMY",
  },
  WISHING_WELL: {
    id: "WISHING_WELL",
    name: "Wishing Well",
    icon: "⛲",
    shortTag: "1ST REROLL FREE",
    description: "The first Shop reroll after every garden is free.",
    accentColor: "#22D3EE",
    cost: 4,
    category: "ECONOMY",
  },
  // ── Run relics: Life and defence ──
  DEEP_TAPROOT: {
    id: "DEEP_TAPROOT",
    name: "Deep Taproot",
    icon: "🥕",
    shortTag: "+4 MAX LIFE · +3 EACH GARDEN",
    description: "+4 Max Life, and every new garden restores 3 Life.",
    accentColor: "#FB923C",
    cost: 6,
    rarity: "UNCOMMON",
    category: "MAGIC",
  },
  SUNFLOWER: {
    id: "SUNFLOWER",
    name: "Sunflower",
    icon: "🌻",
    shortTag: "+1 ✂️ EACH GARDEN",
    description: "Start every garden with +1 ✂️ Shears.",
    accentColor: "#FACC15",
    cost: 5,
    category: "MAGIC",
  },
  THORN_CROWN: {
    id: "THORN_CROWN",
    name: "Crown of Thorns",
    icon: "🌹",
    shortTag: "+5 VALUE PER 🌺 · ×1.5",
    description:
      "Legendary: every Thorn on your line adds +5 Value, and every garden's score is ×1.5.",
    accentColor: "#F43F5E",
    rarity: "LEGENDARY",
  },
  RAINBOW_HEART: {
    id: "RAINBOW_HEART",
    name: "Rainbow Heart",
    icon: "🌈",
    shortTag: "×2 SCORE",
    description: "Legendary: every garden's score is ×2.",
    accentColor: "#C084FC",
    rarity: "LEGENDARY",
  },
  ETERNAL_SPRING: {
    id: "ETERNAL_SPRING",
    name: "Eternal Spring",
    icon: "🌸",
    shortTag: "FULL LIFE EACH GARDEN",
    description:
      "Legendary: start every garden with full Life, and every garden's score is ×1.25.",
    accentColor: "#34D399",
    rarity: "LEGENDARY",
  },
};

export const RELIC_LIST: RelicDefinition[] = Object.values(RELIC_REGISTRY);

/**
 * Deterministically selects 3 distinct Tactical Relics for the between-floor draft modal
 */
export function getRelicDraftChoices(
  seedKey: string,
  floorNumber: number,
  ownedRelics: RelicId[] = []
): RelicDefinition[] {
  const rng = mulberry32(
    hashStringToSeed(`relic-draft-${seedKey}-f${floorNumber}-${ownedRelics.length}`)
  );
  const commons = RELIC_LIST.filter((r) => r.rarity !== "LEGENDARY");
  const unowned = commons.filter((r) => !ownedRelics.includes(r.id));
  const owned = commons.filter((r) => ownedRelics.includes(r.id));

  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const pool = [...shuffle(unowned), ...shuffle(owned)];
  return pool.slice(0, 3);
}

/** Common relic slots per run (Legendary boss rewards don't take a slot) */
export const MAX_COMMON_RELICS = 5;
export const SHOP_REROLL_COST = 10;

export function countCommonRelics(relics: RelicId[]): number {
  return relics.filter((id) => RELIC_REGISTRY[id]?.rarity !== "LEGENDARY").length;
}

/** How often each rarity shows up in the Shop (relative weights) */
export const RELIC_RARITY_WEIGHT: Record<RelicRarity, number> = {
  COMMON: 10,
  UNCOMMON: 6,
  RARE: 3,
  LEGENDARY: 0,
};

export function getRelicRarity(id: RelicId): RelicRarity {
  return RELIC_REGISTRY[id]?.rarity ?? "COMMON";
}

/** Gems a relic sells for in the Shop: half its price, rounded down (min 1); null for Legendary */
export function getRelicSellValue(id: RelicId): number | null {
  const def = RELIC_REGISTRY[id];
  if (!def || def.rarity === "LEGENDARY") return null;
  return Math.max(1, Math.floor((def.cost ?? 10) / 2));
}

/** A scaling relic's growth so far (0 when it hasn't grown or isn't owned) */
export function getRelicCounter(counters: RelicCounters | undefined, id: RelicId): number {
  return Math.max(0, counters?.[id] ?? 0);
}

/** "now +6 Length"-style note for a scaling relic, or null */
export function describeRelicGrowth(id: RelicId, counters: RelicCounters | undefined): string | null {
  const n = getRelicCounter(counters, id);
  switch (id) {
    case "COMPOST_HEAP":
      return `now +${n * 2} Value`;
    case "OAK_SAPLING":
      return `now +${n * 3} Length`;
    case "RAIN_BARREL":
      return `now +${n} Length`;
    case "ELDER_TREE":
      return `now ×${roundX(1 + n * 0.1)}`;
    default:
      return null;
  }
}

const roundX = (x: number) => Math.round(x * 100) / 100;

const visitedSteps = (sim: PathSimulationResult) =>
  sim.steps.filter((s, i) => i > 0 && !s.isShadowStepCross);

/** Scaling relics after a scored stroke (Compost Heap counts the Thorns it cleared) */
export function growRelicCountersAfterStroke(
  counters: RelicCounters,
  relics: RelicId[],
  sim: PathSimulationResult
): RelicCounters {
  if (!relics.includes("COMPOST_HEAP") || !sim.canCommit) return counters;
  const briars = visitedSteps(sim).filter((s) => s.cell.type === "ENEMY").length;
  if (briars === 0) return counters;
  return { ...counters, COMPOST_HEAP: getRelicCounter(counters, "COMPOST_HEAP") + briars };
}

/** Scaling relics when a garden blooms (Oak Sapling, Elder Tree, Rain Barrel) */
export function growRelicCountersOnBloom(
  counters: RelicCounters,
  relics: RelicId[],
  garden: Pick<RunGardenState, "weedOutsLeft">
): RelicCounters {
  const next = { ...counters };
  for (const id of ["OAK_SAPLING", "ELDER_TREE"] as RelicId[]) {
    if (relics.includes(id)) next[id] = getRelicCounter(counters, id) + 1;
  }
  if (relics.includes("RAIN_BARREL")) {
    next.RAIN_BARREL = getRelicCounter(counters, "RAIN_BARREL") + Math.max(0, garden.weedOutsLeft);
  }
  return next;
}

export const SHOP_STAT_BOOSTS: Record<
  ShopStatId,
  { name: string; icon: string; shortTag: string; description: string; cost: number; accentColor: string }
> = {
  MAX_MAGIC: {
    name: "Deep Roots",
    icon: "❤️",
    shortTag: "+2 MAX LIFE",
    description: "+2 Max Life for the rest of this Run — and +2 Life right now.",
    cost: 5,
    accentColor: "#34D399",
  },
  START_DEW: {
    name: "Morning Mist",
    icon: "🧤",
    shortTag: "+1 STARTING SHIELD",
    description: "Start every remaining garden with +1 extra Gloves.",
    cost: 4,
    accentColor: "#06B6D4",
  },
};

/**
 * Gems paid out for clearing a garden (on top of the Gems gathered on it):
 * 3 + 1 per star, +5 for a Boss Garden.
 */
export function getGardenClearReward(totalStars: number, wasBoss: boolean): number {
  return 3 + Math.max(0, totalStars) + (wasBoss ? 5 : 0);
}

/**
 * Seeded Sanctuary Shop: 3 offers (1–2 relics, weighted by rarity, the rest
 * stat boosts). Same seed + garden + reroll count → same offers for
 * every player, so the Daily stays fair.
 */
export function generateShopOffers(
  seedKey: string,
  floorNumber: number,
  rerollIndex: number,
  ownedRelics: RelicId[]
): ShopOffer[] {
  const rng = mulberry32(
    hashStringToSeed(`shop-${seedKey}-f${floorNumber}-r${rerollIndex}`)
  );
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Rarity-weighted draw without repeats (Efraimidis–Spirakis keys). Relics
  // are offered even with full slots: sell one to make room.
  const relicPool = RELIC_LIST.filter(
    (r) => r.rarity !== "LEGENDARY" && !ownedRelics.includes(r.id)
  )
    .map((r) => ({
      r,
      key: Math.pow(rng(), 1 / RELIC_RARITY_WEIGHT[r.rarity ?? "COMMON"]),
    }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.r);
  const relicCount = Math.min(relicPool.length, rng() < 0.35 ? 1 : 2);
  const offers: ShopOffer[] = relicPool.slice(0, relicCount).map((r, i) => ({
    id: `f${floorNumber}-r${rerollIndex}-relic${i}`,
    kind: "RELIC",
    relicId: r.id,
    cost: r.cost ?? 10,
  }));
  const stats = shuffle<ShopStatId>(["MAX_MAGIC", "START_DEW"]);
  for (let i = 0; offers.length < 3 && i < 3; i++) {
    const stat = stats[i % stats.length];
    // Two copies of one boost are fine, three are not
    if (offers.filter((o) => o.stat === stat).length >= 2) continue;
    offers.push({
      id: `f${floorNumber}-r${rerollIndex}-stat${i}`,
      kind: "STAT",
      stat,
      cost: SHOP_STAT_BOOSTS[stat].cost,
    });
  }
  return shuffle(offers);
}

/** Seeded Legendary relic for clearing a Boss Garden (null if all owned) */
export function pickLegendaryRelic(
  seedKey: string,
  floorNumber: number,
  ownedRelics: RelicId[]
): RelicId | null {
  const pool = RELIC_LIST.filter(
    (r) => r.rarity === "LEGENDARY" && !ownedRelics.includes(r.id)
  );
  if (pool.length === 0) return null;
  const rng = mulberry32(hashStringToSeed(`legendary-${seedKey}-f${floorNumber}`));
  return pool[Math.floor(rng() * pool.length)].id;
}

export const BOSS_RULE_REGISTRY: Record<BossRuleId, BossRuleDefinition> = {
  THISTLE_KING: {
    id: "THISTLE_KING",
    name: "The Spike King",
    icon: "⚙️",
    description:
      "Every Spike deals double damage — unless you cross it diagonally.",
  },
  BRIAR_QUEEN: {
    id: "BRIAR_QUEEN",
    name: "The Thorn Queen",
    icon: "🌺",
    description: "Every Thorn has grown 2 stronger.",
  },
  DROUGHT: {
    id: "DROUGHT",
    name: "The Drought",
    icon: "🏜️",
    description: "Every Gloves tile holds only half its Gloves.",
  },
  ECLIPSE: {
    id: "ECLIPSE",
    name: "The Eclipse",
    icon: "🌑",
    description: "Every ✂️ Shears tile is worth half its value.",
  },
};

const BOSS_RULE_TARGET: Record<BossRuleId, EntityType> = {
  THISTLE_KING: "TRAP",
  BRIAR_QUEEN: "ENEMY",
  DROUGHT: "SHIELD",
  ECLIPSE: "WEAPON",
};

/** One tile with a boss twist baked into its value (unchanged if unaffected) */
export function bakeBossTile(cell: GridCell, rule: BossRuleId): GridCell {
  if (cell.type !== BOSS_RULE_TARGET[rule]) return cell;
  const v = cell.value;
  const value =
    rule === "THISTLE_KING"
      ? v * 2
      : rule === "BRIAR_QUEEN"
      ? v + 2
      : rule === "DROUGHT"
      ? Math.max(1, Math.floor(v / 2))
      : Math.max(1, Math.ceil(v / 2));
  return { ...cell, value };
}

/**
 * Bakes a boss twist into a copy of the board's values, so tiles show the
 * real numbers and the preview, hint and par all follow the rule for free.
 * Returns null when the board has nothing for the rule to change.
 */
function bakeBossRule(grid: GridCell[][], rule: BossRuleId): GridCell[][] | null {
  let changed = false;
  const baked = grid.map((row) =>
    row.map((cell) => {
      const next = bakeBossTile(cell, rule);
      if (next !== cell) changed = true;
      return next;
    })
  );
  return changed ? baked : null;
}

/**
 * Every 3rd floor becomes a Boss Garden: a seeded twist that still leaves at
 * least one surviving line for a Keeper arriving with 8 Life and 2 Shield.
 */
export function applyBossBlinds(
  floors: DungeonFloor[],
  modifierId: ModifierId,
  seedKey: string
): DungeonFloor[] {
  const testHero: HeroStats = { hp: 8, maxHp: 10, shield: 2, weapon: 0, gold: 0 };
  return floors.map((floor) => {
    if (floor.floorNumber % 3 !== 0 || floor.bossRuleId) return floor;
    const rng = mulberry32(hashStringToSeed(`boss-${seedKey}-f${floor.floorNumber}`));
    const order = (Object.keys(BOSS_RULE_REGISTRY) as BossRuleId[])
      .map((id) => ({ id, k: rng() }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.id);
    for (const rule of order) {
      const baked = bakeBossRule(floor.grid, rule);
      if (!baked) continue;
      if (findSurvivableHintPath(baked, testHero, modifierId, "KNIGHT", [])) {
        return {
          ...floor,
          grid: baked,
          bossRuleId: rule,
          subtitle: `Boss Garden · ${BOSS_RULE_REGISTRY[rule].name}`,
        };
      }
    }
    return floor;
  });
}

export interface HeroEmblemOption {
  id: HeroEmblemId;
  name: string;
  symbol: string;
  unlockGold: number;
}

export interface TrailSkinOption {
  id: TrailSkinId;
  name: string;
  primaryStroke: string;
  glowClass: string;
  dashStroke: string;
  unlockGold: number;
}

export const HERO_EMBLEMS: HeroEmblemOption[] = [
  { id: "CLASSIC_H", name: "Classic H", symbol: "H", unlockGold: 0 },
  { id: "CROWN", name: "Sovereign Crown", symbol: "♔", unlockGold: 25 },
  { id: "LIGHTNING", name: "Kinetic Bolt", symbol: "⚡", unlockGold: 60 },
  { id: "SHIELD_STAR", name: "Aegis Star", symbol: "✦", unlockGold: 120 },
];

export const TRAIL_SKINS: TrailSkinOption[] = [
  {
    id: "CYBER_CYAN",
    name: "Cyber Cyan",
    primaryStroke: "#00D2FF",
    glowClass: "stroke-blue-600/35 stroke-[8px] blur-sm",
    dashStroke: "#E0F2FE",
    unlockGold: 0,
  },
  {
    id: "SOLAR_GOLD",
    name: "Solar Gold",
    primaryStroke: "#FACC15",
    glowClass: "stroke-amber-500/35 stroke-[8px] blur-sm",
    dashStroke: "#FEF9C3",
    unlockGold: 30,
  },
  {
    id: "EMERALD_FLAME",
    name: "Emerald Flame",
    primaryStroke: "#10B981",
    glowClass: "stroke-emerald-500/35 stroke-[8px] blur-sm",
    dashStroke: "#D1FAE5",
    unlockGold: 75,
  },
  {
    id: "PLASMA_VIOLET",
    name: "Plasma Violet",
    primaryStroke: "#A855F7",
    glowClass: "stroke-purple-600/40 stroke-[8px] blur-sm",
    dashStroke: "#F3E8FF",
    unlockGold: 150,
  },
];

export const MODIFIER_REGISTRY: Record<ModifierId, ModifierDefinition> = {
  MIRROR_VERTICAL: {
    id: "MIRROR_VERTICAL",
    name: "Vertical Distortion",
    shortTag: "VERT +2 / HORIZ -1",
    description:
      "Enemies deal +2 damage when approached vertically, and -1 damage when approached horizontally.",
    tacticalHint: "Flank enemies from left or right to shave off damage.",
    accentColor: "#F43F5E",
  },
  BLOOD_GOLD: {
    id: "BLOOD_GOLD",
    name: "Crimson Alchemy",
    shortTag: "GOLD +1 HP / POTION -1 HP",
    description:
      "Picking up GOLD heals +1 HP, but corrupted POTION nodes deal 1 piercing poison damage.",
    tacticalHint: "Route through Gold hexes to sustain your life force.",
    accentColor: "#EAB308",
  },
  GLASS_ARMOR: {
    id: "GLASS_ARMOR",
    name: "Crystalline Aegis",
    shortTag: "2x SHIELD / SHATTERS STEP 3",
    description:
      "SHIELD nodes grant double value, but all unused Gloves shatters to 0 at the end of every 3rd step.",
    tacticalHint: "Time shield pickups within 1-2 steps of heavy enemies.",
    accentColor: "#06B6D4",
  },
  MOMENTUM: {
    id: "MOMENTUM",
    name: "Kinetic Lance",
    shortTag: "3+ STRAIGHT = +3 WEAPON",
    description:
      "Moving in the same straight line direction for 3+ cells grants +3 temporary Weapon power.",
    tacticalHint: "Build a 3-cell runway before crashing into high-value foes.",
    accentColor: "#F59E0B",
  },
  ORTHOGONAL_ONLY: {
    id: "ORTHOGONAL_ONLY",
    name: "Rook's Lockdown",
    shortTag: "NO DIAGONALS",
    description:
      "Diagonal movement is disabled for this dungeon. Only orthogonal (N/S/E/W) lines are permitted.",
    tacticalHint: "Beware of Traps—you cannot dodge them diagonally here.",
    accentColor: "#8B5CF6",
  },
  SHEARS: {
    id: "SHEARS",
    name: "Garden Shears",
    shortTag: "✂️ CUTS A THORN",
    description:
      "Each ✂️ Shears tile is one cut: the next Thorn you walk into is cut completely and costs no Life.",
    tacticalHint: "Pick up ✂️ Shears right before a big Thorn.",
    accentColor: "#FBBF24",
  },
  NONE: {
    id: "NONE",
    name: "Standard Sanctuary",
    shortTag: "8-WAY",
    description: "Standard 8-directional exploration path.",
    tacticalHint: "Move freely in all 8 directions including diagonal hops.",
    accentColor: "#00D2FF",
  },
};

/** Sanctuary-theme display names for each daily modifier. */
const SANCTUARY_MODIFIER_NAMES: Record<ModifierId, string> = {
  MIRROR_VERTICAL: "Mirror Pond",
  BLOOD_GOLD: "Honeyed Seeds",
  GLASS_ARMOR: "Frost Gloves",
  MOMENTUM: "Sunlit Lanes",
  ORTHOGONAL_ONLY: "Hedgerow Paths",
  SHEARS: "Quiet Garden",
  NONE: "Quiet Garden",
};

export function getSanctuaryModifierName(modifierId: ModifierId): string {
  return SANCTUARY_MODIFIER_NAMES[modifierId] ?? SANCTUARY_MODIFIER_NAMES.NONE;
}

export const MODIFIER_LIST: ModifierDefinition[] = Object.values(
  MODIFIER_REGISTRY
).filter((m) => m.id !== "NONE" && m.id !== "SHEARS");

/**
 * Deterministic 32-bit PRNG (Mulberry32)
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hashes an arbitrary string (e.g. YYYY-MM-DD) into a 32-bit unsigned integer seed
 */
export function hashStringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Returns today's date string in YYYY-MM-DD format
 */
export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Coordinate comparison helper
 */
export function isSameCoord(a: GridCoord, b: GridCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Returns true if the step from `from` to `to` is a 2-tile Astral Blink jump (Phase Mage)
 */
export function isBlinkJump(from: GridCoord, to: GridCoord): boolean {
  const dr = Math.abs(to.row - from.row);
  const dc = Math.abs(to.col - from.col);
  return Math.max(dr, dc) === 2;
}

/**
 * Counts how many 2-tile Astral Blink jumps exist in `path`
 */
export function countPathBlinks(path: GridCoord[]): number {
  let count = 0;
  for (let i = 1; i < path.length; i++) {
    if (isBlinkJump(path[i - 1], path[i])) {
      count++;
    }
  }
  return count;
}

/**
 * Counts how many self-crosses (re-visited coordinates) exist in `path`
 */
export function countPathSelfCrosses(path: GridCoord[]): number {
  const seen = new Set<string>();
  let crosses = 0;
  for (const pt of path) {
    const key = `${pt.row},${pt.col}`;
    if (seen.has(key)) {
      crosses++;
    } else {
      seen.add(key);
    }
  }
  return crosses;
}

/**
 * Validates whether a single step from `from` to `to` is allowed under the active modifier & Hero Class
 */
export function isValidStep(
  from: GridCoord,
  to: GridCoord,
  modifierId: ModifierId,
  heroClassId: HeroClassId = "KNIGHT",
  blinkAlreadyUsed: boolean = false
): boolean {
  if (to.row < 0 || to.row > 4 || to.col < 0 || to.col > 4) return false;
  const dr = Math.abs(to.row - from.row);
  const dc = Math.abs(to.col - from.col);
  if (dr === 0 && dc === 0) return false;

  // Phase Mage 2-Tile Teleport Jump (1x per floor)
  if (heroClassId === "MAGE" && !blinkAlreadyUsed && Math.max(dr, dc) === 2) {
    // Allow orthogonal 2-step (2,0 / 0,2) or diagonal 2-step (2,2) or knight-warp (2,1 / 1,2)
    if (modifierId === "ORTHOGONAL_ONLY") {
      return (dr === 2 && dc === 0) || (dr === 0 && dc === 2);
    }
    return true;
  }

  if (dr > 1 || dc > 1) return false;

  if (modifierId === "ORTHOGONAL_ONLY") {
    return dr + dc === 1;
  }

  return true;
}

/**
 * Finds the first cell matching an EntityType in a 5x5 grid
 */
export function findEntityCoord(
  grid: GridCell[][],
  type: EntityType
): GridCoord | null {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r]?.[c]?.type === type) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Counts how many GOLD cells exist on a 5x5 floor grid
 */
export function countFloorGoldNodes(grid: GridCell[][]): number {
  let count = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r]?.[c]?.type === "GOLD") {
        count++;
      }
    }
  }
  return count;
}

/**
 * Star 3 HP threshold: 80% of the hero's effective max HP (rounded up), so
 * low-HP classes (Fox 7 → 6, Otter 8 → 7) can earn it too. Knight 10 → 8.
 */
export function getFlawlessHpThreshold(effectiveMaxHp: number): number {
  return Math.ceil(0.8 * effectiveMaxHp);
}

/**
 * Simulates the entire path deterministically for both Live Ghost Preview
 * and Step-by-Step Auto-Battle Resolution, supporting Hero Classes & Relics.
 */
export function simulatePath(
  grid: GridCell[][],
  path: GridCoord[],
  initialHero: HeroStats,
  modifierId: ModifierId,
  heroClassId: HeroClassId = "KNIGHT",
  activeRelics: RelicId[] = []
): PathSimulationResult {
  const totalGoldNodesOnFloor = countFloorGoldNodes(grid);

  if (path.length === 0) {
    return {
      steps: [],
      finalStats: { ...initialHero },
      projectedHp: initialHero.hp,
      projectedGold: initialHero.gold,
      projectedShield: initialHero.shield,
      projectedWeapon: initialHero.weapon,
      firstDeathStepIndex: null,
      firstDeathCoord: null,
      endsOnExit: false,
      survives: initialHero.hp > 0,
      canCommit: false,
      stars: {
        star1Survivor: false,
        star2Greed: false,
        star3Flawless: false,
        totalStars: 0,
        goldNodesCollected: 0,
        totalGoldNodesOnFloor,
      },
      blinkUsedCount: 0,
      selfCrossUsedCount: 0,
      boardSunbeams: countBoardTiles(grid, "WEAPON"),
    };
  }

  // Count active Relic stacks
  const gildedAegisStacks = activeRelics.filter(
    (r) => r === "GILDED_AEGIS"
  ).length;
  const hasVorpalEdge = activeRelics.includes("VORPAL_EDGE");
  const alchemistFlaskStacks = activeRelics.filter(
    (r) => r === "ALCHEMIST_FLASK"
  ).length;
  const spikedBootsStacks = activeRelics.filter(
    (r) => r === "SPIKED_BOOTS"
  ).length;
  const longStrideStacks = activeRelics.filter(
    (r) => r === "LONG_STRIDE"
  ).length;
  const greedCrownStacks = activeRelics.filter(
    (r) => r === "GREED_CROWN"
  ).length;

  const isLongStrideActive = longStrideStacks > 0 && path.length >= 12;
  // Shears rule: Power counts cuts — every pickup adds 1, each cut removes a whole Thorn
  const shears = modifierId === "SHEARS";
  const cuts = (n: number) => (shears ? Math.min(1, n) : n);
  let vorpalCuts = 0;

  const steps: PathStepSimulation[] = [];
  let hp = initialHero.hp;
  const baseMaxHp = initialHero.maxHp;
  const effectiveMaxHp = baseMaxHp + alchemistFlaskStacks * 4;
  let shield = heroClassId === "VAMPIRE" ? 0 : initialHero.shield;
  let weapon = initialHero.weapon;
  let gold = initialHero.gold;

  let firstDeathStepIndex: number | null = null;
  let firstDeathCoord: GridCoord | null = null;
  let goldNodesCollected = 0;
  let consecutiveGoldStreak = 0;
  let blinkUsedCount = 0;
  let selfCrossUsedCount = 0;

  const visitedCoords = new Set<string>();

  for (let i = 0; i < path.length; i++) {
    const coord = path[i];
    const coordKey = `${coord.row},${coord.col}`;
    const cell = grid[coord.row][coord.col];

    const hpBefore = hp;
    const shieldBefore = shield;
    const weaponBefore = weapon;
    const goldBefore = gold;

    let direction: { dr: number; dc: number } | null = null;
    let isBlinkStep = false;
    if (i > 0) {
      direction = {
        dr: coord.row - path[i - 1].row,
        dc: coord.col - path[i - 1].col,
      };
      if (isBlinkJump(path[i - 1], coord)) {
        isBlinkStep = true;
        blinkUsedCount += 1;
      }
    }

    const isRevisit = i > 0 && visitedCoords.has(coordKey);
    visitedCoords.add(coordKey);

    let note = "";
    let shatteredShield = false;
    let momentumTriggered = false;
    let trapDodgedDiagonally = false;
    let mirrorBonusApplied: "VERTICAL_PENALTY" | "HORIZONTAL_DISCOUNT" | null =
      null;
    let goldComboCount = 0;
    let isShadowStepCross = false;
    let backstabApplied = false;
    let vampireHealApplied = 0;
    let vampireTransmuteWeapon = 0;
    let spikedBootsTriggered = false;
    let vorpalRetainedWeapon = 0;

    if (i === 0) {
      note = "Hero Start";
      consecutiveGoldStreak = 0;
    } else if (hp <= 0) {
      // Already dead at an earlier step; keep state at 0 HP
      note = "Fallen";
      consecutiveGoldStreak = 0;
    } else if (isRevisit) {
      // Rogue Shadow Step (1x Self-Cross): On the second visited pass, acts as an empty floor tile
      isShadowStepCross = true;
      selfCrossUsedCount += 1;
      consecutiveGoldStreak = 0;
      note = "Shadow Step (Crossed)";
    } else {
      // 1. Check MOMENTUM modifier before resolving the current cell
      if (modifierId === "MOMENTUM" && i >= 2 && direction) {
        const prevDir = {
          dr: path[i - 1].row - path[i - 2].row,
          dc: path[i - 1].col - path[i - 2].col,
        };
        if (
          Math.sign(direction.dr) === Math.sign(prevDir.dr) &&
          Math.sign(direction.dc) === Math.sign(prevDir.dc) &&
          (direction.dr !== 0 || direction.dc !== 0) &&
          (direction.dr === prevDir.dr && direction.dc === prevDir.dc)
        ) {
          weapon += cuts(3);
          momentumTriggered = true;
        }
      }

      if (cell.type === "GOLD") {
        consecutiveGoldStreak += 1;
        goldComboCount = consecutiveGoldStreak;
        goldNodesCollected += 1;
      } else {
        consecutiveGoldStreak = 0;
      }

      // 2. Resolve cell entity
      switch (cell.type) {
        case "HERO": {
          note = "Start";
          break;
        }
        case "ENEMY": {
          let enemyPower = cell.value;
          if (modifierId === "MIRROR_VERTICAL" && direction) {
            if (direction.dr !== 0 && direction.dc === 0) {
              enemyPower += 2;
              mirrorBonusApplied = "VERTICAL_PENALTY";
            } else if (direction.dr === 0 && direction.dc !== 0) {
              enemyPower = Math.max(1, enemyPower - 1);
              mirrorBonusApplied = "HORIZONTAL_DISCOUNT";
            }
          }

          // Rogue Passive: Diagonal Backstab reduces Enemy damage by -2
          if (
            heroClassId === "ROGUE" &&
            direction &&
            Math.abs(direction.dr) >= 1 &&
            Math.abs(direction.dc) >= 1
          ) {
            enemyPower = Math.max(0, enemyPower - 2);
            backstabApplied = true;
          }

          // Relic: LONG_STRIDE reduces Enemy damage by -1 when path length >= 12
          if (isLongStrideActive) {
            enemyPower = Math.max(0, enemyPower - longStrideStacks);
          }

          // First apply Weapon: EffectiveEnemyDmg = max(0, X - Hero.Weapon)
          // (Shears rule: one cut removes the whole Thorn)
          const weaponUsed = shears ? (weapon > 0 ? enemyPower : 0) : Math.min(enemyPower, weapon);
          const effectiveEnemyDmg = shears
            ? weapon > 0 ? 0 : enemyPower
            : Math.max(0, enemyPower - weapon);

          if (shears) {
            // Lingering Shears: every second cut is free
            if (weapon > 0) {
              const free = hasVorpalEdge && vorpalCuts % 2 === 1;
              vorpalCuts += 1;
              if (free) vorpalRetainedWeapon = weapon;
              else weapon -= 1;
            }
          } else if (hasVorpalEdge && weapon > 0) {
            vorpalRetainedWeapon = Math.floor(weapon / 2);
            weapon = vorpalRetainedWeapon;
          } else {
            weapon = 0;
          }

          // Next apply Shield: RemainingDmg = max(0, EffectiveEnemyDmg - Hero.Shield)
          const shieldAbsorbed = Math.min(shield, effectiveEnemyDmg);
          const remainingDmg = Math.max(0, effectiveEnemyDmg - shield);
          shield = Math.max(0, shield - shieldAbsorbed);

          // Subtract RemainingDmg from Hero.HP
          hp = Math.max(0, hp - remainingDmg);

          // Vampire Passive: Sanguine Harvest restores +2 HP after defeating an Enemy
          if (heroClassId === "VAMPIRE" && hp > 0) {
            const cap = Math.max(baseMaxHp, effectiveMaxHp);
            const healed = Math.min(cap - hp, 2);
            hp = Math.min(cap, hp + 2);
            vampireHealApplied = healed;
          }

          const parts: string[] = [];
          if (isBlinkStep) parts.push("✦ Blink");
          if (backstabApplied) parts.push("Backstab -2");
          if (isLongStrideActive) parts.push(`Stride -${longStrideStacks}`);
          if (momentumTriggered) parts.push("Momentum +3⚔");
          if (mirrorBonusApplied === "VERTICAL_PENALTY") parts.push("Vert +2");
          if (mirrorBonusApplied === "HORIZONTAL_DISCOUNT")
            parts.push("Horiz -1");
          if (weaponUsed > 0) parts.push(`-${weaponUsed}⚔`);
          if (vorpalRetainedWeapon > 0)
            parts.push(`Vorpal ${vorpalRetainedWeapon}⚔`);
          if (shieldAbsorbed > 0) parts.push(`-${shieldAbsorbed}🧤`);
          if (remainingDmg > 0) {
            parts.push(`-${remainingDmg} HP`);
          } else {
            parts.push("Parried!");
          }
          if (vampireHealApplied > 0) {
            parts.push(`+${vampireHealApplied}🩸 HP`);
          }
          note = parts.join(" · ");
          break;
        }
        case "SHIELD": {
          if (heroClassId === "VAMPIRE") {
            // Sanguine Harvest: SHIELD tiles on the board are transmuted into +2 Weapon blood-blades
            vampireTransmuteWeapon = cuts(2);
            weapon += cuts(2);
            note = "+2 WPN (Blood Blade)";
          } else {
            const shieldGain =
              modifierId === "GLASS_ARMOR" ? cell.value * 2 : cell.value;
            shield += shieldGain;
            note =
              modifierId === "GLASS_ARMOR"
                ? `+${shieldGain} Gloves (2x Glass)`
                : `+${shieldGain} Gloves`;
          }
          break;
        }
        case "POTION": {
          if (modifierId === "BLOOD_GOLD") {
            hp = Math.max(0, hp - 1);
            note = "-1 HP (Blood Poison)";
          } else {
            const cap = effectiveMaxHp;
            const extraFoxHeal = heroClassId === "MAGE" ? 2 : 0;
            const potionValue = cell.value + extraFoxHeal;
            const healed = Math.min(cap - hp, potionValue);
            hp = Math.min(cap, hp + potionValue);
            note =
              healed > 0
                ? hp > baseMaxHp
                  ? `+${healed} HP (Overheal!)`
                  : heroClassId === "MAGE"
                  ? `+${healed} Life (+2 Fox Boost)`
                  : `+${healed} HP`
                : "Max HP";
          }
          break;
        }
        case "WEAPON": {
          weapon += shears ? 1 : cell.value;
          note = momentumTriggered
            ? `+${cell.value + 3} Sword (Momentum)`
            : `+${cell.value} Sword`;
          break;
        }
        case "GOLD": {
          const goldMult =
            greedCrownStacks > 0 ? Math.pow(2, greedCrownStacks) : 1;
          const goldGain = cell.value * goldMult;
          gold += goldGain;

          const notes: string[] = [`+${goldGain} Gold`];

          // Relic: GILDED_AEGIS grants +1 Shield on Gold pickup
          if (gildedAegisStacks > 0) {
            if (heroClassId === "VAMPIRE") {
              weapon += shears ? 1 : gildedAegisStacks;
              vampireTransmuteWeapon = gildedAegisStacks;
              notes.push(`+${gildedAegisStacks}⚔`);
            } else {
              shield += gildedAegisStacks;
              notes.push(`+${gildedAegisStacks}🧤`);
            }
          }

          // Heal from BLOOD_GOLD modifier (+1 HP), GREED_CROWN relic (+1 HP), and Bloom Sprite (+1 HP)
          const bloomSpriteHeal = heroClassId === "VAMPIRE" ? 1 : 0;
          const totalHeal =
            (modifierId === "BLOOD_GOLD" ? 1 : 0) + greedCrownStacks + bloomSpriteHeal;
          if (totalHeal > 0) {
            const cap = Math.max(baseMaxHp, effectiveMaxHp);
            const healed = Math.min(cap - hp, totalHeal);
            hp = Math.min(cap, hp + totalHeal);
            if (healed > 0) {
              notes.push(heroClassId === "VAMPIRE" ? `+${healed} Life (Bloom Sprite)` : `+${healed} HP`);
            }
          }

          note = notes.join(" · ");
          break;
        }
        case "TRAP": {
          const isDiagonal =
            direction !== null &&
            Math.abs(direction.dr) === 1 &&
            Math.abs(direction.dc) === 1;
          if (isDiagonal) {
            trapDodgedDiagonally = true;
            note = "Dodged Diagonally!";
          } else if (spikedBootsTriggered || spikedBootsStacks > 0) {
            // Relic: SPIKED_BOOTS turns orthogonal Trap into 0 Dmg and +3 Weapon
            spikedBootsTriggered = true;
            const bootWeapon = shears ? spikedBootsStacks : 3 * spikedBootsStacks;
            weapon += bootWeapon;
            note = `Spiked Boots +${bootWeapon}⚔`;
          } else {
            hp = Math.max(0, hp - cell.value);
            note = `-${cell.value} Piercing HP`;
          }
          break;
        }
        case "EXIT": {
          note = isBlinkStep ? "✦ Blink to Portal!" : "Portal Reached";
          break;
        }
        case "VOID": {
          note = "Void";
          break;
        }
      }

      // 3. Check GLASS_ARMOR shatter at the end of every 3rd step
      if (modifierId === "GLASS_ARMOR" && i > 0 && i % 3 === 0 && shield > 0) {
        shield = 0;
        shatteredShield = true;
        note = note ? `${note} · Gloves Shattered!` : "Gloves Shattered!";
      }
    }

    const isDead = hp <= 0;
    let isFirstDeathStep = false;
    if (isDead && firstDeathStepIndex === null) {
      firstDeathStepIndex = i;
      firstDeathCoord = { ...coord };
      isFirstDeathStep = true;
    }

    steps.push({
      stepIndex: i,
      coord: { ...coord },
      cell,
      direction,
      hpBefore,
      hpAfter: hp,
      hpDelta: hp - hpBefore,
      shieldBefore,
      shieldAfter: shield,
      shieldDelta: shield - shieldBefore,
      weaponBefore,
      weaponAfter: weapon,
      weaponDelta: weapon - weaponBefore,
      goldBefore,
      goldAfter: gold,
      goldDelta: gold - goldBefore,
      isDead,
      isFirstDeathStep,
      shatteredShield,
      momentumTriggered,
      trapDodgedDiagonally,
      mirrorBonusApplied,
      goldComboCount,
      isBlinkStep,
      isShadowStepCross,
      backstabApplied,
      vampireHealApplied,
      vampireTransmuteWeapon,
      spikedBootsTriggered,
      vorpalRetainedWeapon,
      note,
    });
  }

  const lastStep = steps[steps.length - 1];
  const endsOnExit = lastStep?.cell.type === "EXIT";
  const survives = hp > 0 && firstDeathStepIndex === null;
  const canCommit = endsOnExit && survives && path.length >= 2;

  // 3-Star Floor Mastery calculation (works both live while dragging and upon completion)
  const star1Survivor = endsOnExit && survives && hp >= 1;
  const star2Greed =
    survives &&
    hp >= 1 &&
    (totalGoldNodesOnFloor === 0
      ? endsOnExit
      : goldNodesCollected / totalGoldNodesOnFloor >= 0.8);
  const flawlessHpThreshold = getFlawlessHpThreshold(
    Math.max(baseMaxHp, effectiveMaxHp)
  );
  const star3Flawless =
    survives &&
    hp >= 1 &&
    ((endsOnExit && hp >= flawlessHpThreshold) || path.length >= 14);
  const totalStars =
    (star1Survivor ? 1 : 0) + (star2Greed ? 1 : 0) + (star3Flawless ? 1 : 0);

  const stars: FloorStarBreakdown = {
    star1Survivor,
    star2Greed,
    star3Flawless,
    totalStars,
    goldNodesCollected,
    totalGoldNodesOnFloor,
  };

  return {
    steps,
    finalStats: {
      hp,
      maxHp: baseMaxHp,
      shield,
      weapon,
      gold,
    },
    projectedHp: hp,
    projectedGold: gold,
    projectedShield: shield,
    projectedWeapon: weapon,
    firstDeathStepIndex,
    firstDeathCoord,
    endsOnExit,
    survives,
    canCommit,
    stars,
    blinkUsedCount,
    selfCrossUsedCount,
    boardSunbeams: countBoardTiles(grid, "WEAPON"),
  };
}

function countBoardTiles(grid: GridCell[][], type: EntityType): number {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell.type === type) n++;
  return n;
}

/**
 * Balatro-style garden score: Value × Length × relic multipliers.
 *   Value = Gems gathered on this garden + the values of the tiles the line
 *           visits (Thorns, Shield, Power tiles, Berries, Spikes) + relic Value
 *   Length  = the line's length in tiles + relic Length
 * Only a line that reaches the Exit alive scores.
 */
export function calculateFloorScoreBreakdown(
  sim: PathSimulationResult,
  startHero: HeroStats,
  pathLength: number,
  activeRelics: RelicId[] = [],
  ctx: RelicScoreContext = {}
): FloorScoreBreakdown {
  const visited = visitedSteps(sim);
  const countOf = (...types: EntityType[]) =>
    visited.filter((s) => types.includes(s.cell.type)).length;

  const gemChips = Math.max(0, sim.finalStats.gold - startHero.gold);
  const tileChips = visited.reduce(
    (sum, s) =>
      ["ENEMY", "SHIELD", "WEAPON", "POTION", "TRAP"].includes(s.cell.type)
        ? sum + Math.max(0, s.cell.value)
        : sum,
    0
  );

  const chipSources: Array<{ label: string; value: number }> = [];
  const multSources: Array<{ label: string; value: number }> = [];
  const xMultSources: Array<{ label: string; value: number }> = [];
  const has = (id: RelicId) => activeRelics.includes(id);
  const name = (id: RelicId) =>
    `${RELIC_REGISTRY[id].icon} ${RELIC_REGISTRY[id].name}`;
  const addChips = (id: RelicId, value: number) => {
    if (has(id) && value > 0) chipSources.push({ label: name(id), value });
  };
  const addMult = (id: RelicId, value: number) => {
    if (has(id) && value > 0) multSources.push({ label: name(id), value });
  };
  const addX = (id: RelicId, value: number, when = true) => {
    if (has(id) && when && value > 1) xMultSources.push({ label: name(id), value: roundX(value) });
  };
  const counter = (id: RelicId) => getRelicCounter(ctx.counters, id);
  const magicLost = Math.max(0, startHero.hp - sim.finalStats.hp);
  const diagonalSteps = visited.filter(
    (s) => s.direction && Math.abs(s.direction.dr) === 1 && Math.abs(s.direction.dc) === 1
  ).length;
  const sunbeamsOnLine = countOf("WEAPON");

  // Value
  addChips("GLASS_WATERING_CAN", countOf("POTION", "SHIELD") * 3);
  addChips("THORN_CROWN", countOf("ENEMY") * 5);
  addChips("MOSSY_STONE", 30);
  addChips("BRIAR_PRESS", countOf("ENEMY") * 6);
  addChips("BRAMBLE_HEART", magicLost * 5);
  addChips("MAGPIE_NEST", Math.max(0, startHero.gold) * 3);
  addChips("COMPOST_HEAP", counter("COMPOST_HEAP") * 2);
  // +Length
  addMult("GOLDEN_BEE", countOf("GOLD"));
  addMult("LADYBUG", 4);
  addMult("THISTLE_WALTZ", visited.filter((s) => s.trapDodgedDiagonally).length * 3);
  addMult("DEW_LENS", sim.endsOnExit ? Math.max(0, sim.finalStats.shield) * 2 : 0);
  addMult("BERRY_BASKET", countOf("POTION") * 2);
  addMult("ZIGZAG_KITE", diagonalSteps);
  addMult("DAWN_CHORUS", ctx.strokesLeft === RUN_STROKES_PER_GARDEN ? 10 : 0);
  addMult("OAK_SAPLING", counter("OAK_SAPLING") * 3);
  addMult("RAIN_BARREL", counter("RAIN_BARREL"));
  // ×Length
  addX("STARLIGHT_COMPASS", 1.5, pathLength >= 12);
  addX("SUN_PRISM", 2, sim.boardSunbeams >= 2 && sunbeamsOnLine >= sim.boardSunbeams);
  addX("QUIET_SNAIL", 1.5, magicLost === 0);
  addX("EVENING_LANTERN", 2, ctx.strokesLeft === 1);
  addX("HARVEST_MOON", 2, pathLength >= 18);
  addX("ELDER_TREE", 1 + counter("ELDER_TREE") * 0.1);
  addX("THORN_CROWN", 1.5);
  addX("RAINBOW_HEART", 2);
  addX("ETERNAL_SPRING", 1.25);

  const chips =
    gemChips + tileChips + chipSources.reduce((sum, c) => sum + c.value, 0);
  const pathMult = Math.max(0, pathLength);
  const mult = pathMult + multSources.reduce((sum, m) => sum + m.value, 0);
  const xMult = xMultSources.reduce((prod, x) => prod * x.value, 1);
  const scores = sim.survives && sim.endsOnExit;

  return {
    gemChips,
    tileChips,
    chipSources,
    chips,
    pathMult,
    multSources,
    mult,
    xMultSources,
    xMult,
    total: scores ? Math.round(chips * mult * xMult) : 0,
  };
}

/** A single garden's score (see calculateFloorScoreBreakdown). */
export function calculateFloorScore(
  sim: PathSimulationResult,
  startHero: HeroStats,
  pathLength: number,
  activeRelics: RelicId[] = [],
  ctx: RelicScoreContext = {}
): number {
  return calculateFloorScoreBreakdown(sim, startHero, pathLength, activeRelics, ctx)
    .total;
}

/** A run's score is the sum of its gardens' scores. */
export function calculateRunScore(history: FloorHistoryRecord[]): number {
  return history.reduce((sum, f) => sum + (f.floorScore ?? 0), 0);
}

/** Search budget for par lines (simulated partial lines per garden). */
export const PAR_SEARCH_BUDGET = 60000;

/**
 * Best-scoring line on a garden found by a depth-first search over every
 * self-avoiding line from the Companion, visiting promising tiles first and
 * pruning lines that run out of Life. Stops after `budget` partial lines, so
 * it's deterministic (same board → same par for everyone) but not a proven
 * optimum; players can occasionally beat it. Class abilities (blink, self-
 * cross) aren't searched, so par is conservative for Fox and Otter.
 */
export function searchBestFloorLine(
  grid: GridCell[][],
  startHero: HeroStats,
  modifierId: ModifierId,
  heroClassId: HeroClassId = "KNIGHT",
  activeRelics: RelicId[] = [],
  budget: number = PAR_SEARCH_BUDGET,
  ctx: RelicScoreContext = {}
): { path: GridCoord[]; score: number; sim: PathSimulationResult } | null {
  const heroCoord = findEntityCoord(grid, "HERO");
  const exitCoord = findEntityCoord(grid, "EXIT");
  if (!heroCoord || !exitCoord) return null;

  const deltas =
    modifierId === "ORTHOGONAL_ONLY"
      ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
      : [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  const tilePriority = (cell: GridCell): number => {
    switch (cell.type) {
      case "GOLD":
        return 6;
      case "SHIELD":
      case "WEAPON":
        return 5;
      case "POTION":
        return 4;
      case "TRAP":
        return -2;
      case "EXIT":
        return -3;
      case "ENEMY":
        return -cell.value * 0.4;
      default:
        return 0;
    }
  };

  const visited = Array.from({ length: 5 }, () => Array(5).fill(false));
  const path: GridCoord[] = [heroCoord];
  visited[heroCoord.row][heroCoord.col] = true;
  let best: { path: GridCoord[]; score: number; sim: PathSimulationResult } | null =
    null;
  let nodes = 0;

  const dfs = (curr: GridCoord) => {
    if (++nodes > budget) return;
    const sim = simulatePath(
      grid,
      path,
      startHero,
      modifierId,
      heroClassId,
      activeRelics
    );
    if (!sim.survives) return;
    if (isSameCoord(curr, exitCoord)) {
      if (path.length >= 2) {
        const score = calculateFloorScore(
          sim,
          startHero,
          path.length,
          activeRelics,
          ctx
        );
        if (!best || score > best.score) best = { path: [...path], score, sim };
      }
      return;
    }
    const next: Array<{ row: number; col: number; priority: number }> = [];
    for (const [dr, dc] of deltas) {
      const row = curr.row + dr;
      const col = curr.col + dc;
      if (row < 0 || row > 4 || col < 0 || col > 4) continue;
      if (visited[row][col] || grid[row][col].type === "VOID") continue;
      next.push({ row, col, priority: tilePriority(grid[row][col]) });
    }
    next.sort((a, b) => b.priority - a.priority);
    for (const n of next) {
      visited[n.row][n.col] = true;
      path.push({ row: n.row, col: n.col });
      dfs({ row: n.row, col: n.col });
      path.pop();
      visited[n.row][n.col] = false;
      if (nodes > budget) return;
    }
  };

  dfs(heroCoord);
  return best;
}

/** Par for one garden from the given starting stats (see searchBestFloorLine). */
export function computeFloorPar(
  grid: GridCell[][],
  startHero: HeroStats,
  modifierId: ModifierId,
  heroClassId: HeroClassId = "KNIGHT",
  activeRelics: RelicId[] = [],
  budget: number = PAR_SEARCH_BUDGET,
  ctx: RelicScoreContext = {}
): number | null {
  return (
    searchBestFloorLine(
      grid,
      startHero,
      modifierId,
      heroClassId,
      activeRelics,
      budget,
      ctx
    )?.score ?? null
  );
}

/** The Daily is always played with the free Keeper, so scores are comparable. */
export const DAILY_COMPANION: HeroClassId = "KNIGHT";

/**
 * Fixed par for a whole Daily: follow the best line through garden 1, skip the
 * Sanctuary Shop, start garden 2 from the resulting stats, and so on. Every
 * player gets the same per-garden par numbers; good shopping beats par.
 */
export function computeDailyPar(
  dungeon: DungeonTheme,
  budget: number = PAR_SEARCH_BUDGET
): number[] {
  const pars: number[] = [];
  let hero = getInitialHeroStatsForClass(DAILY_COMPANION);
  const relics: RelicId[] = [];
  for (const floor of dungeon.floors) {
    const best = searchBestFloorLine(
      floor.grid,
      hero,
      dungeon.modifierId,
      DAILY_COMPANION,
      relics,
      budget
    );
    if (!best) {
      pars.push(0);
      continue;
    }
    pars.push(best.score);
    hero = getNextFloorHeroStats(best.sim.finalStats, DAILY_COMPANION, relics);
  }
  return pars;
}

/** Percentage of par across floors that have a par score; null if none do. */
export function getParPercent(floorHistory: FloorHistoryRecord[]): number | null {
  const scored = floorHistory.filter(
    (f) => typeof f.parScore === "number" && f.parScore > 0
  );
  if (scored.length === 0) return null;
  const earned = scored.reduce((sum, f) => sum + (f.floorScore ?? 0), 0);
  const par = scored.reduce((sum, f) => sum + (f.parScore ?? 0), 0);
  return Math.round((earned / par) * 100);
}

/**
 * Scout Hint Solver: Finds a valid surviving path from HERO to EXIT on the current 5x5 floor
 * so stuck casual players can illuminate the first 4 cells of a winning route.
 */
export function findSurvivableHintPath(
  grid: GridCell[][],
  initialHero: HeroStats,
  modifierId: ModifierId,
  heroClassId: HeroClassId = "KNIGHT",
  activeRelics: RelicId[] = [],
  allowFreshStatsFallback = true
): GridCoord[] | null {
  const heroCoord = findEntityCoord(grid, "HERO");
  const exitCoord = findEntityCoord(grid, "EXIT");
  if (!heroCoord || !exitCoord) return null;

  const orthogonalOnly = modifierId === "ORTHOGONAL_ONLY";
  const deltas = orthogonalOnly
    ? [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];

  const searchWithHero = (heroState: HeroStats): GridCoord[] | null => {
    let bestPath: GridCoord[] | null = null;
    let bestScore = -Infinity;
    let nodesExplored = 0;
    const MAX_EXPLORE = 4500;

    const visited = Array.from({ length: 5 }, () => Array(5).fill(false));
    const currentPath: GridCoord[] = [heroCoord];
    visited[heroCoord.row][heroCoord.col] = true;

    const dfs = (curr: GridCoord) => {
      if (nodesExplored > MAX_EXPLORE) return;
      nodesExplored++;

      const sim = simulatePath(
        grid,
        currentPath,
        heroState,
        modifierId,
        heroClassId,
        activeRelics
      );
      if (!sim.survives) return;

      if (isSameCoord(curr, exitCoord)) {
        if (currentPath.length >= 2) {
          const candidateScore =
            sim.stars.totalStars * 500 +
            sim.projectedHp * 50 +
            sim.projectedGold * 25 +
            Math.min(currentPath.length, 12) * 10;
          if (candidateScore > bestScore) {
            bestScore = candidateScore;
            bestPath = [...currentPath];
          }
        }
        return;
      }

      if (currentPath.length >= 14) return;

      const neighbors: Array<{ row: number; col: number; priority: number }> =
        [];
      for (const [dr, dc] of deltas) {
        const nr = curr.row + dr;
        const nc = curr.col + dc;
        if (nr < 0 || nr > 4 || nc < 0 || nc > 4) continue;
        if (visited[nr][nc]) continue;

        const cell = grid[nr][nc];
        if (cell.type === "VOID") continue;
        const distToExit =
          Math.abs(nr - exitCoord.row) + Math.abs(nc - exitCoord.col);
        let priority = -distToExit * 2;
        if (cell.type === "SHIELD" || cell.type === "WEAPON") priority += 6;
        else if (cell.type === "POTION" && modifierId !== "BLOOD_GOLD")
          priority += 5;
        else if (cell.type === "GOLD") priority += 5;
        else if (cell.type === "EXIT" && currentPath.length >= 4)
          priority += 8;
        else if (cell.type === "ENEMY") priority -= cell.value * 0.5;
        else if (cell.type === "TRAP") {
          const isDiag = Math.abs(dr) === 1 && Math.abs(dc) === 1;
          priority += isDiag || activeRelics.includes("SPIKED_BOOTS") ? 3 : -6;
        }
        neighbors.push({ row: nr, col: nc, priority });
      }

      neighbors.sort((a, b) => b.priority - a.priority);

      for (const next of neighbors) {
        visited[next.row][next.col] = true;
        currentPath.push({ row: next.row, col: next.col });
        dfs({ row: next.row, col: next.col });
        currentPath.pop();
        visited[next.row][next.col] = false;
        if (bestPath && bestScore >= 1400 && nodesExplored > 1200) {
          return;
        }
      }
    };

    dfs(heroCoord);
    return bestPath;
  };

  const found = searchWithHero(initialHero);
  if (found || !allowFreshStatsFallback) return found;
  return searchWithHero(getInitialHeroStatsForClass(heroClassId));
}

/**
 * Generates a self-avoiding random walk from `start` to `end` on the 5x5 grid
 * respecting `modifierId` so every generated floor has a guaranteed survivable spine.
 */
function generateGoldenPath(
  start: GridCoord,
  end: GridCoord,
  modifierId: ModifierId,
  rng: () => number,
  minLength: number = 7
): GridCoord[] {
  const orthogonalOnly = modifierId === "ORTHOGONAL_ONLY";
  const deltas = orthogonalOnly
    ? [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];

  for (let attempt = 0; attempt < 60; attempt++) {
    const visited = Array.from({ length: 5 }, () => Array(5).fill(false));
    const path: GridCoord[] = [start];
    visited[start.row][start.col] = true;

    const dfs = (curr: GridCoord): boolean => {
      if (isSameCoord(curr, end)) {
        return path.length >= minLength;
      }
      if (path.length >= 14) return false;

      const dirs = [...deltas];
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }

      for (const [dr, dc] of dirs) {
        const nr = curr.row + dr;
        const nc = curr.col + dc;
        if (nr < 0 || nr > 4 || nc < 0 || nc > 4) continue;
        if (visited[nr][nc]) continue;

        if (nr === end.row && nc === end.col && path.length + 1 < minLength) {
          continue;
        }

        visited[nr][nc] = true;
        path.push({ row: nr, col: nc });
        if (dfs({ row: nr, col: nc })) return true;
        path.pop();
        visited[nr][nc] = false;
      }
      return false;
    };

    if (dfs(start)) {
      return path;
    }
  }

  const fallback: GridCoord[] = [{ ...start }];
  let r = start.row;
  let c = start.col;
  while (r !== end.row || c !== end.col) {
    if (r < end.row) r++;
    else if (r > end.row) r--;
    else if (c < end.col) c++;
    else if (c > end.col) c--;
    fallback.push({ row: r, col: c });
  }
  return fallback;
}

/**
 * Validates and repairs any 5x5 floor grid (whether from Gemini AI or fallback)
 * so that:
 * 1. It is strictly 5x5 with valid EntityTypes and integer values.
 * 2. It has exactly one HERO and one EXIT at non-adjacent coordinates.
 * 3. There is at least one survivable path from HERO to EXIT starting with 7 HP.
 */
export function validateAndRepairFloorGrid(
  rawGrid: GridCell[][],
  floorNumber: FloorTier,
  modifierId: ModifierId,
  rng: () => number
): GridCell[][] {
  const grid: GridCell[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => {
      const existing = rawGrid?.[r]?.[c];
      const validTypes: EntityType[] = [
        "ENEMY",
        "SHIELD",
        "POTION",
        "WEAPON",
        "GOLD",
        "TRAP",
      ];
      const type: EntityType =
        existing && validTypes.includes(existing.type)
          ? existing.type
          : "ENEMY";
      const val =
        typeof existing?.value === "number" && !Number.isNaN(existing.value)
          ? Math.max(1, Math.min(9, Math.round(existing.value)))
          : 3;

      return {
        id: `f${floorNumber}-r${r}-c${c}`,
        row: r,
        col: c,
        type,
        value: val,
      };
    })
  );

  let heroCoord = findEntityCoord(rawGrid, "HERO");
  let exitCoord = findEntityCoord(rawGrid, "EXIT");

  if (
    !heroCoord ||
    heroCoord.row < 0 ||
    heroCoord.row > 4 ||
    heroCoord.col < 0 ||
    heroCoord.col > 4
  ) {
    heroCoord = { row: 4, col: Math.floor(rng() * 5) };
  }

  if (
    !exitCoord ||
    exitCoord.row < 0 ||
    exitCoord.row > 4 ||
    exitCoord.col < 0 ||
    exitCoord.col > 4 ||
    Math.abs(exitCoord.row - heroCoord.row) +
      Math.abs(exitCoord.col - heroCoord.col) <
      3
  ) {
    exitCoord = {
      row: heroCoord.row >= 2 ? 0 : 4,
      col: (heroCoord.col + 2 + Math.floor(rng() * 2)) % 5,
    };
  }

  grid[heroCoord.row][heroCoord.col] = {
    id: `f${floorNumber}-r${heroCoord.row}-c${heroCoord.col}`,
    row: heroCoord.row,
    col: heroCoord.col,
    type: "HERO",
    value: 10,
  };

  grid[exitCoord.row][exitCoord.col] = {
    id: `f${floorNumber}-r${exitCoord.row}-c${exitCoord.col}`,
    row: exitCoord.row,
    col: exitCoord.col,
    type: "EXIT",
    value: 0,
  };

  const goldenPath = generateGoldenPath(
    heroCoord,
    exitCoord,
    modifierId,
    rng,
    7
  );

  const testHero: HeroStats = {
    hp: 7,
    maxHp: 10,
    shield: 0,
    weapon: 0,
    gold: 0,
  };

  const sim = simulatePath(grid, goldenPath, testHero, modifierId);
  if (!sim.survives) {
    const clampedTier = Math.min(3, Math.max(1, floorNumber));
    for (let i = 1; i < goldenPath.length - 1; i++) {
      const pt = goldenPath[i];
      const cell = grid[pt.row][pt.col];
      if (i % 3 === 1) {
        const pick = rng();
        if (pick < 0.45) {
          cell.type = "SHIELD";
          cell.value = 3 + Math.floor(rng() * 3);
        } else if (pick < 0.8) {
          cell.type = "WEAPON";
          cell.value = 4 + Math.floor(rng() * 3);
        } else {
          cell.type = modifierId === "BLOOD_GOLD" ? "GOLD" : "POTION";
          cell.value = 3 + Math.floor(rng() * 3);
        }
      } else if (i % 3 === 2) {
        cell.type = "ENEMY";
        cell.value = 3 + Math.floor(rng() * (clampedTier + 2));
      } else {
        cell.type = "GOLD";
        cell.value = 2 + Math.floor(rng() * 4);
      }
    }
  }

  return grid;
}

/**
 * Generates a single floor deterministically using Mulberry32
 */
function generateDeterministicFloor(
  floorNumber: FloorTier,
  modifierId: ModifierId,
  rng: () => number,
  customMeta?: {
    title: string;
    subtitle: string;
    enemyMin: number;
    enemyMax: number;
    hasBoss?: boolean;
  }
): DungeonFloor {
  const defaultMeta: Record<
    number,
    { title: string; subtitle: string; enemyMin: number; enemyMax: number }
  > = {
    1: {
      title: "Floor 1: Skirmish",
      subtitle: "Outer Perimeter Guard",
      enemyMin: 3,
      enemyMax: 6,
    },
    2: {
      title: "Floor 2: Gauntlet",
      subtitle: "Interlocking Killzones",
      enemyMin: 4,
      enemyMax: 8,
    },
    3: {
      title: "Floor 3: Boss Room",
      subtitle: "Sanctum of the Architect",
      enemyMin: 5,
      enemyMax: 9,
    },
  };

  const meta =
    customMeta ??
    defaultMeta[floorNumber] ?? {
      title: `Floor ${floorNumber}: Deep Sector`,
      subtitle: "Escalating Threat Matrix",
      enemyMin: Math.min(6, 3 + Math.floor(floorNumber / 2)),
      enemyMax: Math.min(9, 6 + Math.floor(floorNumber / 2)),
    };

  const heroCoord: GridCoord = {
    row: 4,
    col: Math.floor(rng() * 5),
  };
  const exitCoord: GridCoord = {
    row: 0,
    col: (heroCoord.col + 1 + Math.floor(rng() * 3)) % 5,
  };

  const rawGrid: GridCell[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => {
      if (r === heroCoord.row && c === heroCoord.col) {
        return {
          id: `f${floorNumber}-r${r}-c${c}`,
          row: r,
          col: c,
          type: "HERO",
          value: 10,
        };
      }
      if (r === exitCoord.row && c === exitCoord.col) {
        return {
          id: `f${floorNumber}-r${r}-c${c}`,
          row: r,
          col: c,
          type: "EXIT",
          value: 0,
        };
      }

      const roll = rng();
      let type: EntityType = "ENEMY";
      let value = 3;

      if (roll < 0.38) {
        type = "ENEMY";
        value =
          meta.enemyMin +
          Math.floor(rng() * (meta.enemyMax - meta.enemyMin + 1));
      } else if (roll < 0.54) {
        type = "SHIELD";
        value = 2 + Math.floor(rng() * 4);
      } else if (roll < 0.68) {
        type = "WEAPON";
        value = 3 + Math.floor(rng() * 4);
      } else if (roll < 0.8) {
        type = "POTION";
        value = 2 + Math.floor(rng() * 4);
      } else if (roll < 0.92) {
        type = "GOLD";
        value = 2 + Math.floor(rng() * 5);
      } else {
        type = "TRAP";
        value = 2 + Math.floor(rng() * 3);
      }

      return {
        id: `f${floorNumber}-r${r}-c${c}`,
        row: r,
        col: c,
        type,
        value,
      };
    })
  );

  // Place a Boss Enemy (value 8 or 9) near the Exit on Floor 3 or Boss floors
  if (floorNumber === 3 || customMeta?.hasBoss) {
    const bossRow = Math.min(4, exitCoord.row + 1);
    const bossCol = exitCoord.col;
    if (!(bossRow === heroCoord.row && bossCol === heroCoord.col)) {
      rawGrid[bossRow][bossCol] = {
        id: `f${floorNumber}-r${bossRow}-c${bossCol}`,
        row: bossRow,
        col: bossCol,
        type: "ENEMY",
        value: 9,
        label: "WARDEN",
      };
    }
  }

  const validatedGrid = validateAndRepairFloorGrid(
    rawGrid,
    floorNumber,
    modifierId,
    rng
  );

  return {
    floorNumber,
    title: meta.title,
    subtitle: meta.subtitle,
    grid: validatedGrid,
  };
}

const FALLBACK_THEMES: Array<{
  title: string;
  lore: string;
  modifierId: ModifierId;
}> = [
  {
    title: "The Glass Clockwork",
    lore: "Crystalline gears grind in silence. Gloves refract double light, yet shatter every third heartbeat.",
    modifierId: "GLASS_ARMOR",
  },
  {
    title: "Obsidian Mirror Vault",
    lore: "Vertical reflections amplify hostile blades, while lateral steps slip cleanly between the facets.",
    modifierId: "MIRROR_VERTICAL",
  },
  {
    title: "Alchemist's Blood Mint",
    lore: "Sovereign coins pulse with stolen vitality, while emerald vials have soured into lethal venom.",
    modifierId: "BLOOD_GOLD",
  },
  {
    title: "Kinetic Rail Foundry",
    lore: "Unbroken linear charges superheat your blade, turning straight corridors into devastating lances.",
    modifierId: "MOMENTUM",
  },
  {
    title: "Monolith of the Rook",
    lore: "Ancient gravity wells forbid diagonal drift. Every turn must be carved at strict right angles.",
    modifierId: "ORTHOGONAL_ONLY",
  },
];

/**
 * Generates a complete 3-floor dungeon deterministically from a seed string (such as `YYYY-MM-DD`).
 */
export function generateDeterministicDungeon(
  seedInput?: string,
  options?: {
    customPrompt?: string;
    preferredModifier?: ModifierId;
    source?: "gemini" | "deterministic-fallback" | "custom-crafter";
  }
): DungeonTheme {
  const dateKey =
    seedInput && /^\d{4}-\d{2}-\d{2}$/.test(seedInput)
      ? seedInput
      : getTodayDateKey();
  const seedKey = seedInput || dateKey;
  const numericSeed = hashStringToSeed(seedKey);
  const rng = mulberry32(numericSeed);

  const themeTemplate =
    FALLBACK_THEMES[Math.floor(rng() * FALLBACK_THEMES.length)];

  let modifierId = options?.preferredModifier ?? themeTemplate.modifierId;
  let title = themeTemplate.title;
  let lore = themeTemplate.lore;

  if (options?.customPrompt) {
    const promptLower = options.customPrompt.toLowerCase();
    if (promptLower.includes("glass") || promptLower.includes("shield")) {
      modifierId = "GLASS_ARMOR";
    } else if (
      promptLower.includes("blood") ||
      promptLower.includes("vampire") ||
      promptLower.includes("gold") ||
      promptLower.includes("poison")
    ) {
      modifierId = "BLOOD_GOLD";
    } else if (
      promptLower.includes("mirror") ||
      promptLower.includes("vertical")
    ) {
      modifierId = "MIRROR_VERTICAL";
    } else if (
      promptLower.includes("speed") ||
      promptLower.includes("lance") ||
      promptLower.includes("charge") ||
      promptLower.includes("momentum")
    ) {
      modifierId = "MOMENTUM";
    } else if (
      promptLower.includes("rook") ||
      promptLower.includes("chess") ||
      promptLower.includes("orthogonal") ||
      promptLower.includes("trap")
    ) {
      modifierId = "ORTHOGONAL_ONLY";
    }
    title = options.customPrompt
      .trim()
      .slice(0, 42)
      .replace(/\b\w/g, (c) => c.toUpperCase());
    lore = `Custom tactical simulation synthesized from prompt: "${options.customPrompt.trim()}".`;
  }

  const floor1 = generateDeterministicFloor(1, modifierId, rng);
  const floor2 = generateDeterministicFloor(2, modifierId, rng);
  const floor3 = generateDeterministicFloor(3, modifierId, rng);

  return {
    seedKey,
    dateKey,
    title,
    lore,
    modifierId,
    source: options?.source ?? "deterministic-fallback",
    customPrompt: options?.customPrompt,
    floors: applyBossBlinds([floor1, floor2, floor3], modifierId, seedKey),
  };
}

/**
 * Generates the 10-Floor Endless Relic Gauntlet (Expansion Feature)
 * After clearing each floor, players draft 1 of 3 stackable passive Relics.
 */
export function generateGauntletDungeon(seedInput?: string): DungeonTheme {
  const dateKey = getTodayDateKey();
  const seedKey = seedInput || `gauntlet-${dateKey}-${Date.now()}`;
  const rng = mulberry32(hashStringToSeed(seedKey));

  const themeTemplate =
    FALLBACK_THEMES[Math.floor(rng() * FALLBACK_THEMES.length)];
  const modifierId = themeTemplate.modifierId;

  const gauntletSubtitles = [
    "Breach Perimeter",
    "Iron Vestibule",
    "Warden's Checkpoint",
    "Clockwork Catacombs",
    "Crimson Crucible",
    "High Inquisitor's Hall",
    "Obsidian Nexus",
    "Astral Faultline",
    "Sovereign Treasury",
    "Throne of the Architect",
  ];

  const floors: DungeonFloor[] = [];
  for (let f = 1; f <= 10; f++) {
    const isBoss = f === 3 || f === 6 || f === 10;
    const enemyMin = Math.min(6, 3 + Math.floor((f - 1) / 3));
    const enemyMax = Math.min(9, 6 + Math.floor(f / 3));
    floors.push(
      generateDeterministicFloor(f, modifierId, rng, {
        title: `Gauntlet Floor ${f}/10`,
        subtitle: gauntletSubtitles[f - 1] ?? "Deep Citadel",
        enemyMin,
        enemyMax,
        hasBoss: isBoss,
      })
    );
  }

  return {
    seedKey,
    dateKey,
    title: "10-Floor Relic Gauntlet",
    lore: "Draft stackable tactical Relics after every floor to conquer the 10-layer Citadel.",
    modifierId,
    source: "deterministic-fallback",
    floors: applyBossBlinds(floors, modifierId, seedKey),
  };
}

/** What a Daily visit carried out of the Sanctuary Shop after a garden */
export interface DailyShopLoadout {
  relics: RelicId[];
  upgrades: RunUpgrades;
  gemsSpent: number; // cumulative for the visit
  nextFloorHero: HeroStats;
}

/**
 * Rebuilds an in-progress Daily from the committed line of each finished
 * garden plus what was taken out of each Shop (fixed companion + seeded shop
 * offers make this exact). A garden without a saved loadout is treated as
 * "Shop not finished yet".
 */
export function replayDailyProgress(
  dungeon: DungeonTheme,
  paths: GridCoord[][],
  dailyPars: number[] | null,
  loadouts: Array<DailyShopLoadout | null | undefined> = []
): {
  history: FloorHistoryRecord[];
  nextFloorHero: HeroStats;
  lastFinalStats: HeroStats;
  relics: RelicId[];
  upgrades: RunUpgrades;
  gemsSpent: number;
  shopPending: boolean;
  totalCellsVisited: number;
  survived: boolean;
} {
  let hero = getInitialHeroStatsForClass(DAILY_COMPANION);
  let lastFinalStats = hero;
  let relics: RelicId[] = [];
  let upgrades: RunUpgrades = NO_RUN_UPGRADES;
  let gemsSpent = 0;
  let shopPending = false;
  let totalCellsVisited = 0;
  let survived = true;
  const history: FloorHistoryRecord[] = [];
  paths.slice(0, dungeon.floors.length).forEach((path, idx) => {
    const floor = dungeon.floors[idx];
    const sim = simulatePath(
      floor.grid,
      path,
      hero,
      dungeon.modifierId,
      DAILY_COMPANION,
      relics
    );
    const breakdown = calculateFloorScoreBreakdown(sim, hero, path.length, relics);
    history.push({
      floorNumber: floor.floorNumber,
      path,
      gridSnapshot: floor.grid,
      steps: sim.steps,
      endStats: sim.finalStats,
      cleared: sim.survives && sim.endsOnExit,
      stars: sim.stars,
      floorScore: breakdown.total,
      scoreBreakdown: breakdown,
      parScore: dailyPars?.[idx] || undefined,
    });
    totalCellsVisited += Math.max(0, path.length - 1);
    lastFinalStats = sim.finalStats;
    if (!sim.survives) survived = false;
    if (idx < dungeon.floors.length - 1) {
      const loadout = loadouts[idx];
      lastFinalStats = {
        ...sim.finalStats,
        gold:
          sim.finalStats.gold +
          getGardenClearReward(sim.stars.totalStars, Boolean(floor.bossRuleId)),
      };
      if (loadout) {
        relics = loadout.relics;
        upgrades = loadout.upgrades;
        gemsSpent = loadout.gemsSpent;
        hero = loadout.nextFloorHero;
        shopPending = false;
      } else {
        // Boss Garden rewards are fixed, so they replay even without a loadout
        if (floor.bossRuleId) {
          const legendary = pickLegendaryRelic(dungeon.seedKey, floor.floorNumber, relics);
          if (legendary) relics = [...relics, legendary];
        }
        hero = getNextFloorHeroStats(lastFinalStats, DAILY_COMPANION, relics, upgrades);
        shopPending = true;
      }
    }
  });
  return {
    history,
    nextFloorHero: hero,
    lastFinalStats,
    relics,
    upgrades,
    gemsSpent,
    shopPending,
    totalCellsVisited,
    survived,
  };
}

/** Par marker for a garden: ✦ perfect, then 🟩 / 🟨 / 🟧 by % of par. */
export function getParMarker(record?: FloorHistoryRecord): string {
  if (!record) return "➖";
  if (!record.parScore) return "";
  const pct = ((record.floorScore ?? 0) / record.parScore) * 100;
  if (pct >= 100) return "✦";
  if (pct >= 90) return "🟩";
  if (pct >= 70) return "🟨";
  return "🟧";
}

export function isPerfectFloor(record?: FloorHistoryRecord): boolean {
  return Boolean(
    record?.parScore && (record.floorScore ?? 0) >= record.parScore
  );
}

/**
 * Spoiler-free share card: results only (stars, par, score) — never the route,
 * since everyone plays the same Daily board.
 */
export function generateShareCardAscii(params: {
  dungeon: DungeonTheme;
  floorHistory: FloorHistoryRecord[];
  finalScore: number;
  survived: boolean;
  remainingHp?: number;
  gold?: number;
  totalCellsVisited?: number;
  heroClassId?: HeroClassId;
  activeRelics?: RelicId[];
  isSanctuary?: boolean;
  streakDays?: number;
  isPractice?: boolean;
}): string {
  const {
    dungeon,
    floorHistory,
    finalScore,
    isSanctuary = true,
    streakDays = 0,
    isPractice = false,
  } = params;
  const { title } = getDungeonDisplay(dungeon, isSanctuary);
  const totalStars = floorHistory.reduce(
    (sum, f) => sum + (f.stars?.totalStars ?? 0),
    0
  );
  const gardensLine = dungeon.floors
    .map((_, idx) => {
      const record = floorHistory[idx];
      const label = `G${idx + 1}`;
      if (!record) return `${label} ➖`;
      const earned = record.stars?.totalStars ?? 0;
      const marker = getParMarker(record);
      return `${label} ${"⭐".repeat(earned)}${"☆".repeat(3 - earned)}${
        marker ? ` ${marker}` : ""
      }`;
    })
    .join("  ");
  const parPercent = getParPercent(floorHistory);
  const perfectCount = floorHistory.filter(isPerfectFloor).length;

  return [
    `🌸 Crystal Sanctuary · ${dungeon.dateKey}${isPractice ? " (practice)" : ""}`,
    title,
    gardensLine,
    [
      `${totalStars}/${dungeon.floors.length * 3} ⭐`,
      parPercent !== null ? `${parPercent}% of par` : null,
      perfectCount > 0 ? `${perfectCount}✦ perfect` : null,
      finalScore.toLocaleString(),
    ]
      .filter(Boolean)
      .join(" · "),
    ...(streakDays > 1 ? [`🔥 ${streakDays}-day streak`] : []),
    `https://1stroketactician.app`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Run mode: Seasons of Small → Big → Boss Gardens with score targets, played
// with 4 strokes per garden. Visited tiles are refilled from the run's Tile Bag.
// ─────────────────────────────────────────────────────────────────────────────

/** Small Garden target for Seasons 1–8 (Big = ×1.5, Boss = ×2). Tunable. */
export const RUN_SEASON_TARGETS = [
  1500, 4000, 10000, 25000, 55000, 100000, 175000, 250000,
];
/** After the last listed Season the run turns Endless */
export const RUN_FINAL_SEASON = RUN_SEASON_TARGETS.length;
/** Each Endless Season's base target grows by this factor */
export const RUN_ENDLESS_GROWTH = 2.2;
export const RUN_GARDEN_TARGET_MULT: Record<RunGardenKind, number> = {
  SMALL: 1,
  BIG: 1.5,
  BOSS: 2,
};
export const RUN_GARDEN_KINDS: RunGardenKind[] = ["SMALL", "BIG", "BOSS"];
export const RUN_STROKES_PER_GARDEN = 4;
export const RUN_WEEDOUTS_PER_GARDEN = 3;
export const RUN_WEEDOUT_MAX_TILES = 3;
/** +1 Gem of interest per this many Gems held when a garden blooms… */
export const RUN_INTEREST_STEP = 5;
/** …up to this many */
export const RUN_INTEREST_MAX = 5;
export const RUN_BEST_SEASON_STORAGE_KEY = "ost_run_best_v1";

/** Tile Bag mix (40 tiles), matching the Garden 1 tile mix of the Daily */
const RUN_SEED_BAG_MIX: Array<{
  type: EntityType;
  count: number;
  min: number;
  max: number;
}> = [
  { type: "ENEMY", count: 15, min: 3, max: 6 },
  { type: "SHIELD", count: 6, min: 2, max: 5 },
  { type: "WEAPON", count: 6, min: 3, max: 6 },
  { type: "POTION", count: 5, min: 2, max: 5 },
  { type: "GOLD", count: 5, min: 2, max: 6 },
  { type: "TRAP", count: 3, min: 2, max: 4 },
];
export const RUN_SEED_BAG_SIZE = RUN_SEED_BAG_MIX.reduce((n, m) => n + m.count, 0);

/** Rounds to 2 significant figures (e.g. 1,210,000 → 1,200,000) */
function roundTargetNicely(n: number): number {
  if (n < 100) return Math.round(n);
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

export function getRunSeasonBaseTarget(season: number): number {
  const s = Math.max(1, Math.floor(season));
  if (s <= RUN_FINAL_SEASON) return RUN_SEASON_TARGETS[s - 1];
  return roundTargetNicely(
    RUN_SEASON_TARGETS[RUN_FINAL_SEASON - 1] *
      Math.pow(RUN_ENDLESS_GROWTH, s - RUN_FINAL_SEASON)
  );
}

export function getRunGardenTarget(season: number, kind: RunGardenKind): number {
  const base = getRunSeasonBaseTarget(season);
  if (kind === "SMALL") return base;
  const raw = base * RUN_GARDEN_TARGET_MULT[kind];
  const step = raw >= 100000 ? 2500 : 50;
  return Math.round(raw / step) * step;
}

export function getRunGardenPosition(gardenIndex: number): {
  season: number;
  kind: RunGardenKind;
} {
  const i = Math.max(0, Math.floor(gardenIndex));
  return { season: Math.floor(i / 3) + 1, kind: RUN_GARDEN_KINDS[i % 3] };
}

export function getRunGardenKindLabel(kind: RunGardenKind): string {
  return kind === "SMALL" ? "Small Garden Bed" : kind === "BIG" ? "Big Garden Bed" : "Boss Garden Bed";
}

/** e.g. "Season 2 · Big Garden" or "Season 9 (Endless) · Boss Garden" */
export function getRunGardenLabel(gardenIndex: number): string {
  const { season, kind } = getRunGardenPosition(gardenIndex);
  return `Season ${season}${season > RUN_FINAL_SEASON ? " (Endless)" : ""} · ${getRunGardenKindLabel(kind)}`;
}

/** Most interest a garden can pay (Squirrel's Stash raises it) */
export function getRunInterestCap(relics: RelicId[] = []): number {
  return RUN_INTEREST_MAX + (relics.includes("SQUIRREL_STASH") ? 5 : 0);
}

export function getRunInterest(gemsHeld: number, relics: RelicId[] = []): number {
  return Math.min(
    getRunInterestCap(relics),
    Math.floor(Math.max(0, gemsHeld) / RUN_INTEREST_STEP)
  );
}

/** Gems paid when a Run garden reaches its target */
/**
 * Run economy: Gems picked up on the board only score (as Value); the purse
 * grows from these garden payouts plus interest, so every Shop is a choice.
 */
export const RUN_CLEAR_REWARD: Record<RunGardenKind, number> = {
  SMALL: 3,
  BIG: 4,
  BOSS: 5,
};
/** Shop reroll in a Run: starts here and costs +1 more each time in the same Shop */
export const RUN_REROLL_BASE_COST = 5;

export function getRunRerollCost(rerollsThisShop: number, relics: RelicId[] = []): number {
  // Wishing Well: the first reroll of every Shop is free (the next ones cost as usual)
  if (rerollsThisShop <= 0 && relics.includes("WISHING_WELL")) return 0;
  return RUN_REROLL_BASE_COST + Math.max(0, rerollsThisShop);
}

/**
 * The garden grows wilder each Season: Thorns and Spikes gain strength
 * (Shield, Power tiles and Berries don't), so long sweeping lines cost more Life.
 * Stronger tiles also score more Value — more risk, more reward.
 */
export function getRunSeasonGrowth(season: number): { briar: number; thistle: number } {
  const s = Math.max(1, Math.floor(season));
  return { briar: s - 1, thistle: Math.floor((s - 1) / 2) };
}

export function getRunClearPayout(params: {
  kind: RunGardenKind;
  strokesLeft: number;
  gemsHeld: number;
  relics?: RelicId[];
  /** One-off bonus (the first garden of a Run, rules v6+) */
  welcomeBonus?: number;
}): {
  clearReward: number;
  strokeBonus: number;
  interest: number;
  interestCap: number;
  relicBonus: number;
  welcomeBonus: number;
  total: number;
} {
  const relics = params.relics ?? [];
  const clearReward = RUN_CLEAR_REWARD[params.kind];
  const strokeBonus = Math.max(0, params.strokesLeft) * (relics.includes("SUN_HAT") ? 2 : 1);
  const interest = getRunInterest(params.gemsHeld, relics);
  const relicBonus = relics.includes("SEED_PURSE") ? 2 : 0;
  return {
    clearReward,
    strokeBonus,
    interest,
    interestCap: getRunInterestCap(relics),
    relicBonus,
    welcomeBonus: params.welcomeBonus ?? 0,
    total: clearReward + strokeBonus + interest + relicBonus + (params.welcomeBonus ?? 0),
  };
}

function shuffleSeeded<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** The run's starting Tile Bag (same run seed → same bag) */
export function generateRunSeedBag(runSeed: string): SeedTile[] {
  const rng = mulberry32(hashStringToSeed(`bag-${runSeed}`));
  const bag: SeedTile[] = [];
  for (const mix of RUN_SEED_BAG_MIX) {
    for (let i = 0; i < mix.count; i++) {
      bag.push({
        type: mix.type,
        value: mix.min + Math.floor(rng() * (mix.max - mix.min + 1)),
      });
    }
  }
  return bag;
}

function runTileToCell(
  tile: SeedTile,
  row: number,
  col: number,
  id: string,
  season: number,
  bossRuleId?: BossRuleId
): GridCell {
  const growth = getRunSeasonGrowth(season);
  const bonus =
    tile.type === "ENEMY" ? growth.briar : tile.type === "TRAP" ? growth.thistle : 0;
  const cell: GridCell = {
    id,
    row,
    col,
    type: tile.type,
    value: tile.value + bonus,
    bagTile: tile,
  };
  return bossRuleId ? bakeBossTile(cell, bossRuleId) : cell;
}

/** Draws `count` tiles, reshuffling the used tiles back in when the bag runs dry */
function drawRunTiles(
  state: RunGardenState,
  count: number,
  runSeed: string
): { tiles: SeedTile[]; state: RunGardenState } {
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  let reshuffles = state.reshuffles;
  const tiles: SeedTile[] = [];
  while (tiles.length < count) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      const rng = mulberry32(
        hashStringToSeed(`recycle-${runSeed}-g${state.gardenIndex}-${reshuffles}`)
      );
      drawPile = shuffleSeeded(discardPile, rng);
      discardPile = [];
      reshuffles++;
    }
    tiles.push(drawPile.shift()!);
  }
  return { tiles, state: { ...state, drawPile, discardPile, reshuffles } };
}

/**
 * Lays out a Run garden from a fresh shuffle of the Tile Bag. Tries a few
 * seeded shuffles (and, for a Boss Garden, each twist) until the arriving
 * Companion has at least one surviving line, so a garden never opens lost.
 */
/**
 * Rules v3+: the first gardens of every Run introduce tiles gradually —
 * Garden 1 has Gems, Thorns, Power tiles and Berries; Shield joins in Garden 2 and
 * Spikes from Season 2. Returns the tile types allowed in a garden, or null
 * for all of them.
 */
export const RUN_INTRO_TILE_STAGES: EntityType[][] = [
  ["GOLD", "ENEMY", "WEAPON", "POTION"],
  ["GOLD", "ENEMY", "WEAPON", "POTION", "SHIELD"],
  ["GOLD", "ENEMY", "WEAPON", "POTION", "SHIELD"],
];

export function getRunIntroTileTypes(gardenIndex: number): EntityType[] | null {
  return RUN_INTRO_TILE_STAGES[gardenIndex] ?? null;
}

/** Tile types a garden adds compared with the garden before it (rules v3+) */
export function getRunNewTileTypes(gardenIndex: number): EntityType[] {
  const now = getRunIntroTileTypes(gardenIndex);
  const before = gardenIndex > 0 ? getRunIntroTileTypes(gardenIndex - 1) : null;
  if (gardenIndex === 0) return now ?? [];
  const all: EntityType[] = ["GOLD", "ENEMY", "WEAPON", "SHIELD", "POTION", "TRAP"];
  const nowSet = now ?? all;
  const beforeSet = before ?? all;
  return nowSet.filter((t) => !beforeSet.includes(t));
}

export function createRunGarden(params: {
  runSeed: string;
  bag: SeedTile[];
  gardenIndex: number;
  modifierId: ModifierId;
  hero: HeroStats;
  heroClassId: HeroClassId;
  activeRelics: RelicId[];
  /** Rules v3+: the first gardens only use some tile types */
  introTiles?: boolean;
}): { floor: DungeonFloor; state: RunGardenState } {
  const { runSeed, bag, gardenIndex } = params;
  const allowedTypes = params.introTiles ? getRunIntroTileTypes(gardenIndex) : null;
  const { season, kind } = getRunGardenPosition(gardenIndex);
  const bossOrder: Array<BossRuleId | undefined> =
    kind === "BOSS"
      ? (() => {
          const rng = mulberry32(hashStringToSeed(`boss-${runSeed}-s${season}`));
          return (Object.keys(BOSS_RULE_REGISTRY) as BossRuleId[])
            .map((id) => ({ id, k: rng() }))
            .sort((a, b) => a.k - b.k)
            .map((x) => x.id);
        })()
      : [undefined];

  let fallback: { floor: DungeonFloor; state: RunGardenState } | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const rng = mulberry32(hashStringToSeed(`garden-${runSeed}-g${gardenIndex}-a${attempt}`));
    const shuffled = shuffleSeeded(bag, rng);
    const pile = allowedTypes ? shuffled.filter((t) => allowedTypes.includes(t.type)) : shuffled;
    const heroCoord: GridCoord = { row: 4, col: Math.floor(rng() * 5) };
    const exitCoord: GridCoord = {
      row: 0,
      col: (heroCoord.col + 1 + Math.floor(rng() * 3)) % 5,
    };
    for (const bossRuleId of bossOrder) {
      let serial = 0;
      let next = 0;
      const grid: GridCell[][] = Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (__, c): GridCell => {
          const id = `run-g${gardenIndex}-t${serial++}`;
          if (r === heroCoord.row && c === heroCoord.col) {
            return { id, row: r, col: c, type: "HERO", value: 10 };
          }
          if (r === exitCoord.row && c === exitCoord.col) {
            return { id, row: r, col: c, type: "EXIT", value: 0 };
          }
          return runTileToCell(pile[next++], r, c, id, season, bossRuleId);
        })
      );
      const state: RunGardenState = {
        gardenIndex,
        season,
        kind,
        target: getRunGardenTarget(season, kind),
        score: 0,
        strokesLeft: RUN_STROKES_PER_GARDEN,
        weedOutsLeft: RUN_WEEDOUTS_PER_GARDEN,
        drawPile: pile.slice(next),
        discardPile: [],
        reshuffles: 0,
        tileSerial: serial,
        bossRuleId,
        bestStars: 0,
      };
      const floor: DungeonFloor = {
        floorNumber: gardenIndex + 1,
        title: getRunGardenLabel(gardenIndex),
        subtitle: bossRuleId
          ? `Boss Garden · ${BOSS_RULE_REGISTRY[bossRuleId].name}`
          : getRunGardenKindLabel(kind),
        grid,
        bossRuleId,
      };
      const result = { floor, state };
      fallback = fallback ?? result;
      if (
        findSurvivableHintPath(
          grid,
          params.hero,
          params.modifierId,
          params.heroClassId,
          params.activeRelics,
          false
        )
      ) {
        return result;
      }
    }
  }
  return fallback!;
}

/**
 * Replaces the given tiles (HERO and EXIT stay) with new ones from the Seed
 * Bag. Used tiles go to the discard pile, which is reshuffled in when the bag
 * runs dry. Boss twists apply to the new tiles too.
 */
export function refillRunGarden(
  grid: GridCell[][],
  coords: GridCoord[],
  state: RunGardenState,
  runSeed: string
): { grid: GridCell[][]; state: RunGardenState } {
  const seen = new Set<string>();
  const targets = coords.filter((c) => {
    const key = `${c.row},${c.col}`;
    if (seen.has(key)) return false;
    seen.add(key);
    const type = grid[c.row]?.[c.col]?.type;
    return type !== undefined && type !== "HERO" && type !== "EXIT" && type !== "VOID";
  });
  if (targets.length === 0) return { grid, state };

  const used = targets.map((c) => {
    const cell = grid[c.row][c.col];
    return cell.bagTile ?? { type: cell.type, value: cell.value };
  });
  const withDiscards: RunGardenState = {
    ...state,
    discardPile: [...state.discardPile, ...used],
  };
  const drawn = drawRunTiles(withDiscards, targets.length, runSeed);
  let serial = drawn.state.tileSerial;
  const nextGrid = grid.map((row) => [...row]);
  targets.forEach((c, i) => {
    const tile = drawn.tiles[i];
    if (!tile) return;
    nextGrid[c.row][c.col] = runTileToCell(
      tile,
      c.row,
      c.col,
      `run-g${state.gardenIndex}-t${serial++}`,
      state.season,
      state.bossRuleId
    );
  });
  return { grid: nextGrid, state: { ...drawn.state, tileSerial: serial } };
}

/** Whether the Companion still has any surviving line on this board */
export function hasSurvivableRunLine(
  grid: GridCell[][],
  hero: HeroStats,
  modifierId: ModifierId,
  heroClassId: HeroClassId,
  activeRelics: RelicId[]
): boolean {
  return Boolean(
    findSurvivableHintPath(grid, hero, modifierId, heroClassId, activeRelics, false)
  );
}

export function loadRunBestRecord(): { season: number; gardenIndex: number; score: number } | null {
  try {
    const raw = window.localStorage.getItem(RUN_BEST_SEASON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.gardenIndex !== "number") return null;
    return {
      season: Number(parsed.season) || 1,
      gardenIndex: parsed.gardenIndex,
      score: Number(parsed.score) || 0,
    };
  } catch {
    return null;
  }
}

/** Saves the run's furthest garden if it beats the record; returns the record */
export function saveRunBestRecord(gardenIndex: number, score: number): {
  record: { season: number; gardenIndex: number; score: number };
  isNew: boolean;
} {
  const prev = loadRunBestRecord();
  const isNew =
    !prev ||
    gardenIndex > prev.gardenIndex ||
    (gardenIndex === prev.gardenIndex && score > prev.score);
  const record = isNew
    ? { season: getRunGardenPosition(gardenIndex).season, gardenIndex, score }
    : prev!;
  if (isNew) {
    try {
      window.localStorage.setItem(RUN_BEST_SEASON_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Storage unavailable: the record just isn't kept
    }
  }
  return { record, isNew };
}

/**
 * Why a line would wilt, read from the step where Life runs out.
 * `short` fits on one line of the meter; `long` adds what to do about it.
 */
export function explainWilt(
  sim: PathSimulationResult
): { short: string; long: string } | null {
  if (sim.firstDeathStepIndex === null) return null;
  const step = sim.steps[sim.firstDeathStepIndex];
  if (!step) return null;
  const v = step.cell.value;
  const have = step.hpBefore;
  if (step.cell.type === "ENEMY") {
    const sun = step.weaponBefore;
    const dew = step.shieldBefore;
    const dmg = Math.max(0, step.hpBefore - step.hpAfter);
    const hits = Math.max(dmg, Math.max(0, v - sun - dew));
    return {
      short: `🌺${v} hits ${hits} ❤️${dew > 0 ? ` (🧤 blocked ${Math.min(dew, v)})` : ""} · you have ${have}`,
      long: `That Thorn 🌺${v} would take ${hits} ❤️${dew > 0 ? ` after your 🧤${dew} Gloves` : ""}, but you only have ${have}. Grab ✂️ Shears (cuts it completely) or 🧤 Gloves before it, or go around.`,
    };
  }
  if (step.cell.type === "TRAP") {
    return {
      short: `⚙️${v} straight = −${v} ❤️ · step on it diagonally`,
      long: `Stepping straight onto that Spike ⚙️${v} costs ${v} ❤️, and you only have ${have}. Enter it diagonally to dodge it, or go around.`,
    };
  }
  return {
    short: `This step costs more ❤️ than you have (${have})`,
    long: `This line would run your Life down to 0 at step ${step.stepIndex}. Try a safer route.`,
  };
}
