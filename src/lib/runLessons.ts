import {
  EntityType,
  FloorScoreBreakdown,
  GridCell,
  GridCoord,
  HeroStats,
  PathSimulationResult,
} from "@/types/game";

/**
 * Hands-on lessons for the Run: each one is a small board that teaches a
 * single rule, with a goal the player must meet by drawing it themselves.
 */

export const RUN_LESSONS_DONE_KEY = "ost_run_lessons_done_v1";
/** Purse the Practice Garden starts with, so its Shop is worth a look */
export const PRACTICE_GARDEN_GEMS = 8;
/** Practice Garden target (a real Season 1 Small Garden is 1,500) */
export const PRACTICE_GARDEN_TARGET = 900;
export const PRACTICE_GARDEN_SEED = "practice-garden-v1";

export interface LessonGoalStatus {
  ok: boolean;
  /** Short live text, e.g. "Life 10 → 7 (lose none)" */
  detail: string;
}

export interface RunLesson {
  id: string;
  title: string;
  icon: string;
  /** What this lesson teaches, in one or two sentences */
  learn: string;
  /** Step-by-step what to do on this board */
  steps: string[];
  goalLabel: string;
  hero: HeroStats;
  grid: GridCell[][];
  /** The line "Show me" draws as a ghost (one good solution) */
  solution: GridCoord[];
  checkGoal: (
    sim: PathSimulationResult,
    breakdown: FloorScoreBreakdown,
    start: HeroStats
  ) => LessonGoalStatus;
  /** Shown after the goal is met: why it worked */
  success: string;
  /** Shown when the line reached the Exit but missed the goal */
  failHint: string;
}

const TOKENS: Record<string, EntityType> = {
  H: "HERO",
  A: "EXIT",
  G: "GOLD",
  B: "ENEMY",
  D: "SHIELD",
  S: "WEAPON",
  R: "POTION",
  T: "TRAP",
  ".": "VOID",
};

/** Builds a 5×5 board from rows like "H G2 B3 . A" */
function board(id: string, rows: string[]): GridCell[][] {
  return rows.map((line, r) =>
    line
      .trim()
      .split(/\s+/)
      .map((tok, c): GridCell => {
        const type = TOKENS[tok[0]];
        const value =
          type === "HERO" ? 10 : type === "EXIT" || type === "VOID" ? 0 : Number(tok.slice(1));
        return { id: `${id}-r${r}-c${c}`, row: r, col: c, type, value };
      })
  );
}

const path = (...cells: Array<[number, number]>): GridCoord[] =>
  cells.map(([row, col]) => ({ row, col }));

const hero = (hp: number, shield = 0, weapon = 0, maxHp = 10): HeroStats => ({
  hp,
  maxHp,
  shield,
  weapon,
  gold: 0,
});

const reached = (sim: PathSimulationResult) => sim.survives && sim.endsOnExit;

const visits = (sim: PathSimulationResult, type: EntityType) =>
  sim.steps.slice(1).filter((s) => s.cell.type === type);

export const RUN_LESSONS: RunLesson[] = [
  {
    id: "first-line",
    title: "Drag to the Exit",
    icon: "✍️",
    learn: "",
    steps: ["Drag or tap from YOU to the 🌈 EXIT."],
    goalLabel: "Reach the Exit",
    hero: hero(10),
    grid: board("L1", [
      ". . . . .",
      ". . . . .",
      "H G2 G3 G4 A",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [2, 1], [2, 2], [2, 3], [2, 4]),
    checkGoal: (sim) => ({
      ok: reached(sim),
      detail: sim.endsOnExit ? "Ends on the Exit ✓" : "Keep going to the 🌈 Exit",
    }),
    success: "Every line goes from YOU to the EXIT.",
    failHint: "End your line on the 🌈 Exit.",
  },
  {
    id: "chips-mult",
    title: "Longer = more points",
    icon: "📏",
    learn: "",
    steps: ["Take the long way round."],
    goalLabel: "Score 200 or more",
    hero: hero(10),
    grid: board("L3", [
      "G2 G2 G2 G2 G2",
      "G2 . . . G2",
      "H A G2 G2 G2",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path(
      [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [2, 1]
    ),
    checkGoal: (sim, b) => ({
      ok: reached(sim) && b.total >= 200,
      detail: `${b.total.toLocaleString()} points (need 200)`,
    }),
    success: "The short way scores 0. The long way scores 240. Longer lines multiply your points.",
    failHint: "Go around every Acorn before the Exit.",
  },
  {
    id: "sunbeams",
    title: "Thorns hurt",
    icon: "🌺",
    learn: "",
    steps: ["Grab ✂️ Shears, then the Thorn."],
    goalLabel: "Lose no ❤️ Life",
    hero: hero(4),
    grid: board("L6", [
      ". . . . .",
      ". S5 . . .",
      "H B5 A . .",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [1, 1], [2, 1], [2, 2]),
    checkGoal: (sim, _b, start) => {
      const hit = visits(sim, "ENEMY").length > 0;
      return {
        ok: reached(sim) && hit && sim.finalStats.hp === start.hp,
        detail: hit ? `❤️ ${start.hp} → ${sim.finalStats.hp}` : "Pass the Thorn",
      };
    },
    success: "✂️ Shears cut the next Thorn completely. Grab them right before a big Thorn.",
    failHint: "Take the ✂️ Shears first.",
  },
];
