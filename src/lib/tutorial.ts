import { GridCell, GridCoord, HeroStats, HeroClassId } from "@/types/game";

export const TUTORIAL_DONE_STORAGE_KEY = "ost_tutorial_done";

export interface TutorialStageConfig {
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  sanctuaryTitle: string;
  subtitle: string;
  coachBanner: string;
  sanctuaryCoachBanner: string;
  initialHero: HeroStats;
  recommendedClass?: HeroClassId;
  grid: GridCell[][];
  ghostGuidePath: GridCoord[];
}

function createVoidGrid(stageNumber: number): GridCell[][] {
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => ({
      id: `tut${stageNumber}-r${r}-c${c}`,
      row: r,
      col: c,
      type: "VOID" as const,
      value: 0,
    }))
  );
}

/**
 * Step 1 of 7 — Drawing Your Path & Collecting Gems (HERO, GOLD, EXIT)
 * Active Tiles in Row 2:
 * (2,0): HERO -> (2,1): GOLD (2) -> (2,2): GOLD (3) -> (2,3): GOLD (4) -> (2,4): EXIT
 */
function buildStage1Grid(): GridCell[][] {
  const grid = createVoidGrid(1);
  grid[2][0] = { id: "tut1-r2-c0", row: 2, col: 0, type: "HERO", value: 10 };
  grid[2][1] = { id: "tut1-r2-c1", row: 2, col: 1, type: "GOLD", value: 2 };
  grid[2][2] = { id: "tut1-r2-c2", row: 2, col: 2, type: "GOLD", value: 3 };
  grid[2][3] = { id: "tut1-r2-c3", row: 2, col: 3, type: "GOLD", value: 4 };
  grid[2][4] = { id: "tut1-r2-c4", row: 2, col: 4, type: "EXIT", value: 0 };
  return grid;
}

/**
 * Step 2 of 7 — Clearing Briars (ENEMY & Magic/HP)
 * Active Tiles in Row 2:
 * (2,1): HERO (10 Magic) -> (2,2): ENEMY (3) -> (2,3): GOLD (5) -> (2,4): EXIT
 */
function buildStage2Grid(): GridCell[][] {
  const grid = createVoidGrid(2);
  grid[2][1] = { id: "tut2-r2-c1", row: 2, col: 1, type: "HERO", value: 10 };
  grid[2][2] = { id: "tut2-r2-c2", row: 2, col: 2, type: "ENEMY", value: 3 };
  grid[2][3] = { id: "tut2-r2-c3", row: 2, col: 3, type: "GOLD", value: 5 };
  grid[2][4] = { id: "tut2-r2-c4", row: 2, col: 4, type: "EXIT", value: 0 };
  return grid;
}

/**
 * Step 3 of 7 — Dewdrop Shields (SHIELD — Lasting Protection)
 * Active Tiles in Row 2:
 * (2,1): HERO (4 Magic) -> (2,2): SHIELD (4) -> (2,3): ENEMY (5) -> (2,4): EXIT
 */
function buildStage3Grid(): GridCell[][] {
  const grid = createVoidGrid(3);
  grid[2][1] = { id: "tut3-r2-c1", row: 2, col: 1, type: "HERO", value: 4 };
  grid[2][2] = { id: "tut3-r2-c2", row: 2, col: 2, type: "SHIELD", value: 4 };
  grid[2][3] = { id: "tut3-r2-c3", row: 2, col: 3, type: "ENEMY", value: 5 };
  grid[2][4] = { id: "tut3-r2-c4", row: 2, col: 4, type: "EXIT", value: 0 };
  return grid;
}

/**
 * Step 4 of 7 — Golden Sunbeams (WEAPON — 1-Hit Power Burst)
 * Active Tiles in Row 2:
 * (2,0): HERO (3 Magic) -> (2,1): WEAPON (5) -> (2,2): ENEMY (5) -> (2,3): ENEMY (2) -> (2,4): EXIT
 */
function buildStage4Grid(): GridCell[][] {
  const grid = createVoidGrid(4);
  grid[2][0] = { id: "tut4-r2-c0", row: 2, col: 0, type: "HERO", value: 3 };
  grid[2][1] = { id: "tut4-r2-c1", row: 2, col: 1, type: "WEAPON", value: 5 };
  grid[2][2] = { id: "tut4-r2-c2", row: 2, col: 2, type: "ENEMY", value: 5 };
  grid[2][3] = { id: "tut4-r2-c3", row: 2, col: 3, type: "ENEMY", value: 2 };
  grid[2][4] = { id: "tut4-r2-c4", row: 2, col: 4, type: "EXIT", value: 0 };
  return grid;
}

/**
 * Step 5 of 7 — Sweet Berries (POTION — Smart Healing Order)
 * Choice to hit ENEMY (4) then POTION (4), or vice versa.
 */
function buildStage5Grid(): GridCell[][] {
  const grid = createVoidGrid(5);
  grid[3][1] = { id: "tut5-r3-c1", row: 3, col: 1, type: "HERO", value: 10 };
  // Wasteful route option
  grid[3][2] = { id: "tut5-r3-c2", row: 3, col: 2, type: "POTION", value: 4 };
  // Smart route option
  grid[2][1] = { id: "tut5-r2-c1", row: 2, col: 1, type: "ENEMY", value: 4 };
  grid[2][2] = { id: "tut5-r2-c2", row: 2, col: 2, type: "POTION", value: 4 };
  grid[1][2] = { id: "tut5-r1-c2", row: 1, col: 2, type: "ENEMY", value: 7 };
  grid[1][3] = { id: "tut5-r1-c3", row: 1, col: 3, type: "EXIT", value: 0 };
  return grid;
}

/**
 * Step 6 of 7 — Prickly Thistles (TRAP — The Diagonal Hop Trick)
 * HERO (3 Magic, 5 Shield) at (3,1), TRAP (5) at (2,2), EXIT at (1,3).
 */
function buildStage6Grid(): GridCell[][] {
  const grid = createVoidGrid(6);
  grid[3][1] = { id: "tut6-r3-c1", row: 3, col: 1, type: "HERO", value: 3 };
  grid[2][1] = { id: "tut6-r2-c1", row: 2, col: 1, type: "GOLD", value: 2 };
  grid[3][2] = { id: "tut6-r3-c2", row: 3, col: 2, type: "GOLD", value: 2 };
  grid[2][2] = { id: "tut6-r2-c2", row: 2, col: 2, type: "TRAP", value: 5 };
  grid[1][2] = { id: "tut6-r1-c2", row: 1, col: 2, type: "GOLD", value: 2 };
  grid[2][3] = { id: "tut6-r2-c3", row: 2, col: 3, type: "GOLD", value: 2 };
  grid[1][3] = { id: "tut6-r1-c3", row: 1, col: 3, type: "EXIT", value: 0 };
  return grid;
}

/**
 * Step 7 of 7 — Choose Your Companion & Special Ability (Interactive Class Showcase)
 * Lets the player test all 4 playable classes and their passive abilities on a rich board.
 */
function buildStage7Grid(): GridCell[][] {
  const grid = createVoidGrid(7);
  grid[4][1] = { id: "tut7-r4-c1", row: 4, col: 1, type: "HERO", value: 8 };
  grid[4][2] = { id: "tut7-r4-c2", row: 4, col: 2, type: "GOLD", value: 2 };
  grid[3][1] = { id: "tut7-r3-c1", row: 3, col: 1, type: "SHIELD", value: 3 };
  grid[3][2] = { id: "tut7-r3-c2", row: 3, col: 2, type: "ENEMY", value: 4 };
  grid[2][2] = { id: "tut7-r2-c2", row: 2, col: 2, type: "POTION", value: 3 };
  grid[2][3] = { id: "tut7-r2-c3", row: 2, col: 3, type: "GOLD", value: 3 };
  grid[1][2] = { id: "tut7-r1-c2", row: 1, col: 2, type: "TRAP", value: 3 };
  grid[1][3] = { id: "tut7-r1-c3", row: 1, col: 3, type: "WEAPON", value: 4 };
  grid[0][3] = { id: "tut7-r0-c3", row: 0, col: 3, type: "EXIT", value: 0 };
  return grid;
}

export const TUTORIAL_STAGES: TutorialStageConfig[] = [
  {
    stageNumber: 1,
    title: "Drawing Your Path & Collecting Gems",
    sanctuaryTitle: "Drawing Your Path & Collecting Gems",
    subtitle: "Lesson 1 of 7 · The Unbroken Line",
    coachBanner:
      "Welcome! Press and drag one continuous line from HERO to EXIT. Collect all Gold coins along the line!",
    sanctuaryCoachBanner:
      "Welcome! Press and drag one continuous line from your Companion to the glowing Archway. Every 💎 Gem you touch flies into your Sanctuary Mosaic!",
    initialHero: {
      hp: 10,
      maxHp: 10,
      shield: 0,
      weapon: 0,
      gold: 0,
    },
    grid: buildStage1Grid(),
    ghostGuidePath: [
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ],
  },
  {
    stageNumber: 2,
    title: "Clearing Briars & Magic/HP",
    sanctuaryTitle: "Clearing Briars & Magic/HP",
    subtitle: "Lesson 2 of 7 · Spending Magic",
    coachBanner:
      "Red Enemies deal damage equal to their value. You start with 10 HP and need at least 1 HP remaining to reach the Exit!",
    sanctuaryCoachBanner:
      "Red Briars (3) block the garden path. You start with 10 ✨ Magic. Crossing a '3' Briar uses 3 Magic (leaving you with 7) and makes the tile bloom! You just need at least 1 Magic left to reach the Archway.",
    initialHero: {
      hp: 10,
      maxHp: 10,
      shield: 0,
      weapon: 0,
      gold: 0,
    },
    grid: buildStage2Grid(),
    ghostGuidePath: [
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ],
  },
  {
    stageNumber: 3,
    title: "Dewdrop Shields — Lasting Protection",
    sanctuaryTitle: "Dewdrop Shields — Lasting Protection",
    subtitle: "Lesson 3 of 7 · Order Matters",
    coachBanner:
      "Blue Shields absorb Enemy damage before HP is touched! Always grab the Shield BEFORE stepping on an Enemy.",
    sanctuaryCoachBanner:
      "Blue Dewdrop Shields (+4) protect your Magic! Grab the Dewdrop BEFORE touching the Briar. The 4 Shield absorbs 4 of the Briar's 5 strength, so you only spend 1 Magic! Unused Shield stays with you for the whole floor.",
    initialHero: {
      hp: 4,
      maxHp: 10,
      shield: 0,
      weapon: 0,
      gold: 0,
    },
    grid: buildStage3Grid(),
    ghostGuidePath: [
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ],
  },
  {
    stageNumber: 4,
    title: "Golden Sunbeams — 1-Hit Power Burst",
    sanctuaryTitle: "Golden Sunbeams — 1-Hit Power Burst",
    subtitle: "Lesson 4 of 7 · Temporary Burst Power",
    coachBanner:
      "Weapons boost power against the NEXT Enemy encounter only, then break to 0! Grab weapons right before heavy foes.",
    sanctuaryCoachBanner:
      "How is an Amber Sunbeam/Sword (+5) different from a Shield? A Sunbeam is a super-strike that boosts your power against the VERY NEXT Briar you touch, and then fades to 0! Always grab it right before a big obstacle.",
    initialHero: {
      hp: 3,
      maxHp: 10,
      shield: 0,
      weapon: 0,
      gold: 0,
    },
    grid: buildStage4Grid(),
    ghostGuidePath: [
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ],
  },
  {
    stageNumber: 5,
    title: "Sweet Berries — Smart Healing Order",
    sanctuaryTitle: "Sweet Berries — Smart Healing Order",
    subtitle: "Lesson 5 of 7 · Avoid Wasted Healing",
    coachBanner:
      "Green Potions heal HP up to 10 max. Grabbing healing at 10/10 wastes it! Hit an Enemy first, then grab the Potion to heal back up.",
    sanctuaryCoachBanner:
      "Green Berries/Potions (+4) restore lost Magic, up to your 10/10 max. If you grab a Berry while already at 10/10, the healing is wasted! Clear a Briar first, THEN grab the Berry to heal right back up to 10.",
    initialHero: {
      hp: 10,
      maxHp: 10,
      shield: 0,
      weapon: 0,
      gold: 0,
    },
    grid: buildStage5Grid(),
    ghostGuidePath: [
      { row: 3, col: 1 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ],
  },
  {
    stageNumber: 6,
    title: "Prickly Thistles — The Diagonal Hop Trick",
    sanctuaryTitle: "Prickly Thistles — The Diagonal Hop Trick",
    subtitle: "Lesson 6 of 7 · Diagonal Evasion",
    coachBanner:
      "Traps ignore Shields if entered straight. SECRET TRICK: Cut DIAGONALLY through a Trap to hop right over it for 0 damage!",
    sanctuaryCoachBanner:
      "Watch out for Pink Thistles/Traps! If you step onto them straight (Up/Down/Left/Right), they ignore your Shield and drain Magic directly. SECRET TRICK: Slice DIAGONALLY through a Trap to hop right over it for 0 damage!",
    initialHero: {
      hp: 3,
      maxHp: 10,
      shield: 5,
      weapon: 0,
      gold: 0,
    },
    grid: buildStage6Grid(),
    ghostGuidePath: [
      { row: 3, col: 1 },
      { row: 2, col: 2 },
      { row: 1, col: 3 },
    ],
  },
  {
    stageNumber: 7,
    title: "Choose Your Companion & Special Ability",
    sanctuaryTitle: "Choose Your Companion & Special Ability",
    subtitle: "Lesson 7 of 7 · Class Showcase",
    coachBanner:
      "Test all 4 playable classes! Knight has +2 Shield. Rogue self-crosses once. Mage teleports 2 tiles. Vampire heals on Gold.",
    sanctuaryCoachBanner:
      "Tap any companion to test their superpower! 🐱 Cozy Keeper starts with +2 Shield. 🦦 River Otter can self-cross once & gets +2 diagonal attack. 🦊 Starlight Fox can warp-jump over a tile & gets +2 Berry healing. 🦋 Bloom Sprite heals +1 Magic from every Gem!",
    initialHero: {
      hp: 8,
      maxHp: 10,
      shield: 2,
      weapon: 0,
      gold: 0,
    },
    grid: buildStage7Grid(),
    ghostGuidePath: [
      { row: 4, col: 1 },
      { row: 3, col: 1 },
      { row: 2, col: 2 },
      { row: 1, col: 3 },
      { row: 0, col: 3 },
    ],
  },
];

export function isTutorialMarkedDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TUTORIAL_DONE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markTutorialDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TUTORIAL_DONE_STORAGE_KEY, "true");
  } catch {
    // Ignore storage error
  }
}
