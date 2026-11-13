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
  /** A first part drawn before the main goal (the short way, so the long way has something to beat) */
  warmup?: {
    step: string;
    goalLabel: string;
    solution: GridCoord[];
    checkGoal: RunLesson["checkGoal"];
    /** Shown after the first part */
    done: (points: number, tiles: number) => string;
  };
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
    steps: ["Drag or tap from YOU to the 🌈 Exit."],
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
    success: "Every number on your line is points. Red numbers with a thorn also cost that much ❤️ Life; green ones with a leaf give Life back.",
    failHint: "End your line on the 🌈 Exit.",
  },
  {
    id: "chips-mult",
    title: "Longer = more points",
    icon: "📏",
    learn: "",
    steps: ["Now the long way: round the top to the 🌈 Exit."],
    goalLabel: "Score 150 or more",
    hero: hero(10),
    grid: board("L3", [
      "G2 G2 G2 G2 G2",
      "G2 . . . G2",
      "H G2 A G2 G2",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path(
      [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2]
    ),
    checkGoal: (sim, b) => {
      const total = reached(sim) ? b.total : 0;
      return { ok: total >= 150, detail: `${total.toLocaleString()} points (need 150)` };
    },
    success: "Every tile adds Value and grows Length, and the two multiply. That's why long lines win.",
    failHint: "Go round the top, through the Acorns, then to the Exit.",
    // First the player draws the short way, so the long way has something to beat
    warmup: {
      step: "First the short way: go straight to the 🌈 Exit.",
      goalLabel: "Reach the Exit in 3 tiles",
      solution: path([2, 0], [2, 1], [2, 2]),
      checkGoal: (sim) => {
        const short = sim.steps.length <= 3;
        return {
          ok: reached(sim) && short,
          detail: !sim.endsOnExit ? "Go straight to the 🌈 Exit" : short ? "Short way ✓" : "Too long for now: go straight",
        };
      },
      done: (points, tiles) =>
        `${tiles} tiles, ${points.toLocaleString()} points. Now draw the long way round on the same board and compare.`,
    },
  },
  {
    id: "thorn-trade",
    title: "Thorns pay",
    icon: "🌺",
    learn: "",
    steps: ["Score 100 or more. The safe way isn't enough."],
    goalLabel: "Score 100+",
    hero: hero(10),
    grid: board("L6", [
      ". . . . .",
      ". G2 B8 G2 .",
      "H G1 G1 G1 A",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [2, 1], [1, 1], [1, 2], [2, 2], [1, 3], [2, 3], [2, 4]),
    checkGoal: (sim, breakdown) => {
      const total = reached(sim) ? breakdown.total : 0;
      return { ok: total >= 100, detail: `${total} / 100` };
    },
    success: "The Thorn cost 8 ❤️ Life but its +8 more than doubled your points. On a long line a Thorn is often worth it. Just keep some Life for the next lines.",
    failHint: "Take the Thorn (+8) on a long line.",
  },
  {
    id: "berries",
    title: "Berries heal",
    icon: "🍓",
    learn: "",
    steps: ["Cross the Thorn without running out of Life. You only have 4 ❤️."],
    goalLabel: "Cross the Thorn",
    hero: hero(4),
    grid: board("L7", [
      ". . . . .",
      ". R5 . . .",
      "H G1 B6 G1 A",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [1, 1], [2, 2], [2, 3], [2, 4]),
    checkGoal: (sim) => {
      const thorn = visits(sim, "ENEMY").length > 0;
      return {
        ok: reached(sim) && thorn,
        detail: !thorn ? "Take the Thorn on your way" : sim.survives ? "Across ✓" : "Not enough Life",
      };
    },
    success: "The Berry gave back 5 ❤️ Life, so the Thorn's 6 didn't use up your Life. Eat Berries just before a thorny stretch.",
    failHint: "Lines can go diagonally. Eat the Berry first, then take the Thorn.",
  },
  {
    id: "gloves",
    title: "Gloves block",
    icon: "🧤",
    learn: "",
    steps: ["Cross both Thorns. You only have 5 ❤️."],
    goalLabel: "Cross both Thorns",
    hero: hero(5),
    grid: board("L8", [
      ". . . . .",
      ". D5 . . .",
      "H G1 B4 B4 A",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [1, 1], [2, 2], [2, 3], [2, 4]),
    checkGoal: (sim) => {
      const thorns = visits(sim, "ENEMY").length;
      return {
        ok: reached(sim) && thorns >= 2,
        detail: thorns < 2 ? `${thorns} of 2 Thorns` : sim.survives ? "Both crossed ✓" : "Not enough Life",
      };
    },
    success: "The Gloves soaked up 5 Thorn damage before your Life did. Pick them up before the Thorns, and spare ones carry over to your next line.",
    failHint: "Pick up the 🧤 Gloves first, then take both Thorns.",
  },
  {
    id: "shears",
    title: "Shears cut",
    icon: "✂️",
    learn: "",
    steps: ["Cross the big Thorn and lose no ❤️ Life."],
    goalLabel: "Lose no Life",
    hero: hero(5),
    grid: board("L9", [
      ". . . . .",
      ". S3 . . .",
      "H G1 B8 G1 A",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [1, 1], [2, 2], [2, 3], [2, 4]),
    checkGoal: (sim, _b, start) => {
      const thorn = visits(sim, "ENEMY").length > 0;
      const lost = start.hp - sim.finalStats.hp;
      return {
        ok: reached(sim) && thorn && lost <= 0,
        detail: !thorn ? "Take the Thorn on your way" : sim.survives ? `Life lost: ${Math.max(0, lost)}` : "Not enough Life",
      };
    },
    success: "The Shears cut the next Thorn clean: no Life lost, and you still got its 8 points.",
    failHint: "Pick up the ✂️ Shears first. They cut the next Thorn.",
  },
  {
    id: "spikes",
    title: "Spikes",
    icon: "⚠️",
    learn: "",
    steps: ["Take the Spike's points and lose no ❤️ Life."],
    goalLabel: "Lose no Life",
    hero: hero(10),
    grid: board("L10", [
      ". . . . .",
      ". . T5 . .",
      "H G2 G2 G2 A",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [2, 1], [1, 2], [2, 3], [2, 4]),
    checkGoal: (sim, _b, start) => {
      const spike = visits(sim, "TRAP").length > 0;
      const lost = start.hp - sim.finalStats.hp;
      return {
        ok: reached(sim) && spike && lost <= 0,
        detail: !spike ? "Take the Spike on your way" : `Life lost: ${Math.max(0, lost)}`,
      };
    },
    success: "Step onto a Spike diagonally ↗ and it can't hurt you. Straight on, it costs its number in Life.",
    failHint: "Step onto the Spike diagonally ↗, not straight on.",
  },
];
