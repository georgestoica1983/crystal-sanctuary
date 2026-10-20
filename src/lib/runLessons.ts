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
  /** Short live text, e.g. "Magic 10 → 7 (lose none)" */
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
  /** Shown when the line reached the Archway but missed the goal */
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
    title: "Your first line",
    icon: "✍️",
    learn:
      "Every stroke is one continuous line from your Companion 🐱 to the Archway 🌈. Nothing happens until you let go.",
    steps: [
      "Put your finger on the KEEPER tile.",
      "Without lifting, drag across the three 💎 Gems to the 🌈 Archway.",
      "Let go on the Archway — your Companion walks the line.",
    ],
    goalLabel: "Reach the Archway",
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
      detail: sim.endsOnExit ? "Ends on the Archway ✓" : "Keep going to the 🌈 Archway",
    }),
    success:
      "That's a stroke! The line started on your Companion, passed 3 Gems and ended on the Archway. If you let go anywhere else, the line just pulls back — nothing is lost.",
    failHint: "End the line on the 🌈 Archway.",
  },
  {
    id: "directions",
    title: "Eight directions",
    icon: "🧭",
    learn:
      "A line can step to any neighbouring tile: up, down, left, right — and diagonally. It can't jump over a tile or visit one twice.",
    steps: [
      "Start on the KEEPER (bottom left).",
      "Go diagonally up-right, Gem by Gem, to the Archway (top right).",
      "Made a wrong step? Drag back onto the previous tile to undo it.",
    ],
    goalLabel: "Collect all 3 Gems and reach the Archway",
    hero: hero(10),
    grid: board("L2", [
      ". . . . A",
      ". . . G4 .",
      ". . G3 . .",
      ". G2 . . .",
      "H . . . .",
    ]),
    solution: path([4, 0], [3, 1], [2, 2], [1, 3], [0, 4]),
    checkGoal: (sim) => {
      const gems = visits(sim, "GOLD").length;
      return { ok: reached(sim) && gems === 3, detail: `Gems on the line: ${gems}/3` };
    },
    success:
      "Diagonal steps are as good as straight ones. Dark tiles are walls in these lessons — real gardens are full 5×5 boards.",
    failHint: "Pass all three Gems on the way.",
  },
  {
    id: "chips-mult",
    title: "Long lines score more",
    icon: "🧮",
    learn:
      "A stroke scores Chips × Mult. Chips = the numbers of the tiles on the line. Mult = how many tiles the line has. So a long line scores far more than a short one.",
    steps: [
      "The Archway is right next to you — but a 3-tile line scores almost nothing.",
      "Instead, loop around the whole ring of Gems before entering the Archway.",
      "Watch the live score in the goal box grow as the line gets longer.",
    ],
    goalLabel: "Score at least 200 in one stroke",
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
      detail: `${b.chips} Chips × ${b.mult} Mult = ${b.total.toLocaleString()} (need 200)`,
    }),
    success:
      "10 Gems × 2 = 20 Chips, and the line is 12 tiles, so Mult 12: 20 × 12 = 240. The short way would have been 2 × 3 = 6. Both Chips and Mult grow with length — that's the heart of scoring.",
    failHint: "Make the line longer: go around every Gem before the Archway.",
  },
  {
    id: "briars",
    title: "Briars cost Magic",
    icon: "🌺",
    learn:
      "✨ Magic is your life. A 🌺 Briar takes Magic equal to its number. Its number also counts as Chips.",
    steps: [
      "Look at Magic in the top row: 10/10.",
      "Draw through the Briar 3 and the Gem to the Archway — but don't let go yet.",
      "See how the preview shows Magic dropping to 7. Then let go.",
    ],
    goalLabel: "Reach the Archway with at least 7 Magic",
    hero: hero(10),
    grid: board("L4", [
      ". . . . .",
      ". . . . .",
      "H B3 G5 A .",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [2, 1], [2, 2], [2, 3]),
    checkGoal: (sim) => ({
      ok: reached(sim) && sim.finalStats.hp >= 7,
      detail: `Magic 10 → ${sim.finalStats.hp}`,
    }),
    success:
      "The Briar took 3 Magic, and its 3 became Chips. Magic only comes back from Berries — it never refills by itself, not even between gardens.",
    failHint: "Reach the Archway through the Briar.",
  },
  {
    id: "too-dangerous",
    title: "Lines that would wilt",
    icon: "↩️",
    learn:
      "If a line would bring your Magic to 0, it can't be walked: when you let go it pulls back. Read the preview before letting go.",
    steps: [
      "You have only 4 Magic. Draw straight through the Briar 6 to the Archway and let go — the line pulls back, because it would wilt you.",
      "Now go the safe way: up over the three Gems and down to the Archway.",
    ],
    goalLabel: "Reach the Archway safely",
    hero: hero(4),
    grid: board("L5", [
      ". . . . .",
      "G3 G3 G3 . .",
      "H B6 A . .",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [1, 0], [1, 1], [1, 2], [2, 2]),
    checkGoal: (sim) => ({
      ok: reached(sim),
      detail: sim.survives ? `Magic 4 → ${sim.finalStats.hp}` : "This line would wilt — go around",
    }),
    success:
      "Going around was safe — and longer, so it scored more too. In real gardens the hard choice is how much Magic a bigger line is worth.",
    failHint: "Go around the Briar.",
  },
  {
    id: "sunbeams",
    title: "Sunbeams weaken Briars",
    icon: "☀️",
    learn:
      "A ☀️ Sunbeam gives you Sun. The next Briar you walk into is weakened by your Sun: damage = Briar − Sun. Then your Sun fades to 0.",
    steps: [
      "You have 4 Magic; the Briar has 5.",
      "Step diagonally onto the Sunbeam 5 first, then into the Briar, then the Archway.",
      "Watch Sun go to 5, then back to 0 after the Briar.",
    ],
    goalLabel: "Pass the Briar without losing any Magic",
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
        detail: hit
          ? `Magic ${start.hp} → ${sim.finalStats.hp} (lose none)`
          : "Your line must pass the Briar",
      };
    },
    success:
      "Sun 5 − Briar 5 = 0 damage. Your Sun was then used up. Rule of thumb: pick up Sun right before the biggest Briar.",
    failHint: "Take the Sunbeam before the Briar.",
  },
  {
    id: "sun-fades",
    title: "Sun fades after one Briar",
    icon: "🌗",
    learn:
      "Sun only protects against one Briar, then it's gone. To pass two Briars safely you need Sun again in between.",
    steps: [
      "There are two Briars on the way.",
      "Take a Sunbeam before each Briar (zig-zag up and down).",
      "The Gem in the middle is tempting — but it skips the second Sunbeam.",
    ],
    goalLabel: "Pass both Briars without losing Magic",
    hero: hero(10),
    grid: board("L7", [
      ". . . . .",
      ". S3 . S3 .",
      "H . B3 G4 B3",
      ". . . . A",
      ". . . . .",
    ]),
    solution: path([2, 0], [1, 1], [2, 2], [1, 3], [2, 4], [3, 4]),
    checkGoal: (sim, _b, start) => {
      const briars = visits(sim, "ENEMY").length;
      return {
        ok: reached(sim) && briars === 2 && sim.finalStats.hp === start.hp,
        detail: `Briars passed ${briars}/2 · Magic ${start.hp} → ${sim.finalStats.hp}`,
      };
    },
    success:
      "Each Sunbeam covered one Briar. Sun does stack if you collect several before a Briar — but one Briar uses it all.",
    failHint: "Collect a Sunbeam right before each Briar.",
  },
  {
    id: "dew",
    title: "Dew is a lasting shield",
    icon: "💧",
    learn:
      "💧 Dew soaks up Briar damage point for point. Unlike Sun, leftover Dew stays with you for the next Briar — and the next stroke.",
    steps: [
      "You have only 3 Magic and there are two Briars (3 and 2).",
      "Collect the Dewdrop 5 first, then walk through both Briars.",
      "Watch Dew go 5 → 2 → 0 while Magic stays at 3.",
    ],
    goalLabel: "Pass both Briars without losing Magic",
    hero: hero(3),
    grid: board("L8", [
      ". . . . .",
      ". . . . .",
      "H D5 B3 B2 A",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [2, 1], [2, 2], [2, 3], [2, 4]),
    checkGoal: (sim, _b, start) => ({
      ok: reached(sim) && sim.finalStats.hp === start.hp,
      detail: `Magic ${start.hp} → ${sim.finalStats.hp} · Dew left ${sim.finalStats.shield}`,
    }),
    success:
      "5 Dew covered 3 + 2 damage. Dew carries over between strokes too, so a big Dewdrop late in a line protects your next stroke.",
    failHint: "Collect the Dew first.",
  },
  {
    id: "order",
    title: "Sun first, then Dew, then Magic",
    icon: "🔢",
    learn:
      "When you hit a Briar: 1) Sun lowers it, 2) Dew absorbs what's left, 3) the rest comes off Magic.",
    steps: [
      "You have 5 Magic. The Briar is 7.",
      "Walk Sunbeam 2 → Dewdrop 2 → Briar 7 → Archway.",
      "Do the maths before letting go: 7 − 2 Sun = 5, − 2 Dew = 3 damage.",
    ],
    goalLabel: "Reach the Archway with exactly 2 Magic",
    hero: hero(5),
    grid: board("L9", [
      ". . . . .",
      ". . . . .",
      "H S2 D2 B7 A",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [2, 1], [2, 2], [2, 3], [2, 4]),
    checkGoal: (sim) => ({
      ok: reached(sim) && sim.finalStats.hp === 2,
      detail: `Magic 5 → ${sim.survives ? sim.finalStats.hp : 0}`,
    }),
    success:
      "Exactly: 7 − 2 = 5, Dew took 2, Magic took 3 → 2 left. Tap any tile (without dragging) to read what it does — handy for doing this maths in a real garden.",
    failHint: "Use the Sunbeam and the Dewdrop before the Briar.",
  },
  {
    id: "berries",
    title: "Berries restore Magic",
    icon: "🍓",
    learn:
      "🍓 Berries give back Magic equal to their number — but never above your maximum. Healing past the maximum is wasted.",
    steps: [
      "You are hurt: 3 of 10 Magic. The Briar 6 would wilt you.",
      "Eat the Berries 5 first, then pass the Briar.",
    ],
    goalLabel: "Reach the Archway through the Briar",
    hero: hero(3),
    grid: board("L10", [
      ". . . . .",
      ". R5 . . .",
      "H . B6 A .",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [1, 1], [2, 2], [2, 3]),
    checkGoal: (sim) => ({
      ok: reached(sim) && visits(sim, "ENEMY").length > 0,
      detail: sim.survives ? `Magic 3 → ${sim.finalStats.hp}` : "This line would wilt",
    }),
    success:
      "3 + 5 = 8 Magic, minus 6 = 2. With full Magic those Berries would have been wasted — save them for when you're hurt.",
    failHint: "Eat the Berries before the Briar.",
  },
  {
    id: "thistles",
    title: "Thistles: go diagonal",
    icon: "🌵",
    learn:
      "A 🌵 Thistle cuts straight into Magic — Dew and Sun don't help. But if you step onto it diagonally, you dodge it completely. It still scores Chips.",
    steps: [
      "Going straight through the Thistle 4 costs 4 Magic.",
      "Instead, step up onto the Gem, then diagonally down onto the Thistle, then to the Archway.",
    ],
    goalLabel: "Cross the Thistle without losing Magic",
    hero: hero(5),
    grid: board("L11", [
      ". . . . .",
      "G3 . . . .",
      "H T4 A . .",
      ". . . . .",
      ". . . . .",
    ]),
    solution: path([2, 0], [1, 0], [2, 1], [2, 2]),
    checkGoal: (sim, _b, start) => {
      const onThistle = visits(sim, "TRAP").length > 0;
      return {
        ok: reached(sim) && onThistle && sim.finalStats.hp === start.hp,
        detail: onThistle
          ? `Magic ${start.hp} → ${sim.finalStats.hp}`
          : "Your line must cross the Thistle",
      };
    },
    success:
      "Diagonal entry = no damage, and the Thistle's 4 still counted as Chips. In real gardens, plan your line so Thistles are entered on a diagonal.",
    failHint: "Enter the Thistle diagonally (from the Gem above).",
  },
  {
    id: "full-garden",
    title: "Put it all together",
    icon: "🌸",
    learn:
      "A real garden is a full 5×5 board. The best lines are long, gather Sun before big Briars, keep Dew for later, and enter Thistles diagonally.",
    steps: [
      "Plan a long line that passes many tiles.",
      "Keep at least 4 Magic — in a real garden you'll need it for the next strokes.",
      "Stuck? Tap Show me.",
    ],
    goalLabel: "Score at least 1,000 and keep 4+ Magic",
    hero: hero(10, 2),
    grid: board("L12", [
      "G3 S4 B5 A T3",
      "D3 B4 G4 R3 B4",
      "S3 T3 B6 S3 G5",
      "B3 G2 D4 B5 D2",
      "H B4 S5 G3 B6",
    ]),
    solution: path(
      [4, 0], [3, 1], [3, 2], [4, 3], [4, 2], [4, 1], [3, 0], [2, 0], [1, 0], [0, 0], [1, 1], [0, 1],
      [1, 2], [2, 1], [2, 2], [2, 3], [3, 4], [4, 4], [3, 3], [2, 4], [1, 3], [0, 4], [1, 4], [0, 3]
    ),
    checkGoal: (sim, b) => ({
      ok: reached(sim) && b.total >= 1000 && sim.finalStats.hp >= 4,
      detail: `Score ${b.total.toLocaleString()} / 1,000 · Magic ${sim.survives ? sim.finalStats.hp : 0} (keep 4+)`,
    }),
    success:
      "That's how a strong stroke looks. Next: a real practice garden with several strokes, a score target, Weed-outs and the Shop.",
    failHint: "Make the line longer, or protect more Magic with Sun and Dew.",
  },
];
