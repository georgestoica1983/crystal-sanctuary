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
    title: "Your first line",
    icon: "✍️",
    learn:
      "Draw one continuous line from the YOU tile 🐱 to the Exit 🌈. Nothing happens until you let go.",
    steps: [
      "Put your finger on the YOU tile.",
      "Without lifting, drag across the three 💎 Gems to the 🌈 Exit.",
      "Let go on the Exit — your cat walks the line.",
    ],
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
    success:
      "That's a line! It started on the YOU tile, passed 3 Gems and ended on the Exit. If you let go anywhere else, the line just pulls back — nothing is lost.",
    failHint: "End the line on the 🌈 Exit.",
  },
  {
    id: "directions",
    title: "Eight directions",
    icon: "🧭",
    learn:
      "A line can step to any neighbouring tile: up, down, left, right — and diagonally. It can't jump over a tile or visit one twice.",
    steps: [
      "Start on the YOU tile (bottom left).",
      "Go diagonally up-right, Gem by Gem, to the Exit (top right).",
      "Made a wrong step? Drag back onto the previous tile to undo it.",
    ],
    goalLabel: "Collect all 3 Gems and reach the Exit",
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
      "A line scores Value × Length. Value = the numbers of the tiles on the line. Length = how many tiles the line has. So a long line scores far more than a short one.",
    steps: [
      "The Exit is right next to you — but a 3-tile line scores almost nothing.",
      "Instead, loop around the whole ring of Gems before entering the Exit.",
      "Watch the live score in the goal box grow as the line gets longer.",
    ],
    goalLabel: "Score at least 200 in one line",
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
      detail: `${b.chips} Value × ${b.mult} Length = ${b.total.toLocaleString()} (need 200)`,
    }),
    success:
      "10 Gems × 2 = 20 Value, and the line is 12 tiles, so Length 12: 20 × 12 = 240. The short way would have been 2 × 3 = 6. Both Value and Length grow with length — that's the heart of scoring.",
    failHint: "Make the line longer: go around every Gem before the Exit.",
  },
  {
    id: "briars",
    title: "Thorns cost Life",
    icon: "🌺",
    learn:
      "❤️ Life is your health. A 🌺 Thorn takes Life equal to its number. Its number also counts as Value.",
    steps: [
      "Look at Life in the top row: 10/10.",
      "Draw through the Thorn 3 and the Gem to the Exit — but don't let go yet.",
      "See how the preview shows Life dropping to 7. Then let go.",
    ],
    goalLabel: "Reach the Exit with at least 7 Life",
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
      detail: `Life 10 → ${sim.finalStats.hp}`,
    }),
    success:
      "The Thorn took 3 Life, and its 3 became Value. Life only comes back from Berries — it never refills by itself, not even between gardens.",
    failHint: "Reach the Exit through the Thorn.",
  },
  {
    id: "too-dangerous",
    title: "Lines that run out of Life",
    icon: "↩️",
    learn:
      "If a line would bring your Life to 0, it can't be walked: when you let go it pulls back. Read the preview before letting go.",
    steps: [
      "You have only 4 Life. Draw straight through the Thorn 6 to the Exit and let go — the line pulls back, because it would use up all your Life.",
      "Now go the safe way: up over the three Gems and down to the Exit.",
    ],
    goalLabel: "Reach the Exit safely",
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
      detail: sim.survives ? `Life 4 → ${sim.finalStats.hp}` : "This line would run out of Life — go around",
    }),
    success:
      "Going around was safe — and longer, so it scored more too. In real gardens the hard choice is how much Life a bigger line is worth.",
    failHint: "Go around the Thorn.",
  },
  {
    id: "sunbeams",
    title: "Power tiles weaken Thorns",
    icon: "☀️",
    learn:
      "A ☀️ Power tile gives you Power. The next Thorn you walk into is weakened by your Power: damage = Thorn − Power. Then your Power fades to 0.",
    steps: [
      "You have 4 Life; the Thorn has 5.",
      "Step diagonally onto the Power tile 5 first, then into the Thorn, then the Exit.",
      "Watch Power go to 5, then back to 0 after the Thorn.",
    ],
    goalLabel: "Pass the Thorn without losing any Life",
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
          ? `Life ${start.hp} → ${sim.finalStats.hp} (lose none)`
          : "Your line must pass the Thorn",
      };
    },
    success:
      "Power 5 − Thorn 5 = 0 damage. Your Power was then used up. Rule of thumb: pick up Power right before the biggest Thorn.",
    failHint: "Take the Power tile before the Thorn.",
  },
  {
    id: "sun-fades",
    title: "Power fades after one Thorn",
    icon: "🌗",
    learn:
      "Power only protects against one Thorn, then it's gone. To pass two Thorns safely you need Power again in between.",
    steps: [
      "There are two Thorns on the way.",
      "Take a Power tile before each Thorn (zig-zag up and down).",
      "The Gem in the middle is tempting — but it skips the second Power tile.",
    ],
    goalLabel: "Pass both Thorns without losing Life",
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
        detail: `Thorns passed ${briars}/2 · Life ${start.hp} → ${sim.finalStats.hp}`,
      };
    },
    success:
      "Each Power tile covered one Thorn. Power does stack if you collect several before a Thorn — but one Thorn uses it all.",
    failHint: "Collect a Power tile right before each Thorn.",
  },
  {
    id: "dew",
    title: "Shield is a lasting shield",
    icon: "🛡️",
    learn:
      "🛡️ Shield soaks up Thorn damage point for point. Unlike Power, leftover Shield stays with you for the next Thorn — and the next line.",
    steps: [
      "You have only 3 Life and there are two Thorns (3 and 2).",
      "Collect the Shield tile 5 first, then walk through both Thorns.",
      "Watch Shield go 5 → 2 → 0 while Life stays at 3.",
    ],
    goalLabel: "Pass both Thorns without losing Life",
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
      detail: `Life ${start.hp} → ${sim.finalStats.hp} · Shield left ${sim.finalStats.shield}`,
    }),
    success:
      "5 Shield covered 3 + 2 damage. Shield carries over between lines too, so a big Shield tile late in a line protects your next line.",
    failHint: "Collect the Shield first.",
  },
  {
    id: "order",
    title: "Power first, then Shield, then Life",
    icon: "🔢",
    learn:
      "When you hit a Thorn: 1) Power lowers it, 2) Shield absorbs what's left, 3) the rest comes off Life.",
    steps: [
      "You have 5 Life. The Thorn is 7.",
      "Walk Power tile 2 → Shield tile 2 → Thorn 7 → Exit.",
      "Do the maths before letting go: 7 − 2 Power = 5, − 2 Shield = 3 damage.",
    ],
    goalLabel: "Reach the Exit with exactly 2 Life",
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
      detail: `Life 5 → ${sim.survives ? sim.finalStats.hp : 0}`,
    }),
    success:
      "Exactly: 7 − 2 = 5, Shield took 2, Life took 3 → 2 left. Tap any tile (without dragging) to read what it does — handy for doing this maths in a real garden.",
    failHint: "Use the Power tile and the Shield tile before the Thorn.",
  },
  {
    id: "berries",
    title: "Berries restore Life",
    icon: "🍓",
    learn:
      "🍓 Berries give back Life equal to their number — but never above your maximum. Healing past the maximum is wasted.",
    steps: [
      "You are hurt: 3 of 10 Life. The Thorn 6 would use up all your Life.",
      "Eat the Berries 5 first, then pass the Thorn.",
    ],
    goalLabel: "Reach the Exit through the Thorn",
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
      detail: sim.survives ? `Life 3 → ${sim.finalStats.hp}` : "This line would run out of Life",
    }),
    success:
      "3 + 5 = 8 Life, minus 6 = 2. With full Life those Berries would have been wasted — save them for when you're hurt.",
    failHint: "Eat the Berries before the Thorn.",
  },
  {
    id: "thistles",
    title: "Spikes: go diagonal",
    icon: "⚙️",
    learn:
      "A ⚙️ Spike cuts straight into Life — Shield and Power don't help. But if you step onto it diagonally, you dodge it completely. It still scores Value.",
    steps: [
      "Going straight through the Spike 4 costs 4 Life.",
      "Instead, step up onto the Gem, then diagonally down onto the Spike, then to the Exit.",
    ],
    goalLabel: "Cross the Spike without losing Life",
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
          ? `Life ${start.hp} → ${sim.finalStats.hp}`
          : "Your line must cross the Spike",
      };
    },
    success:
      "Diagonal entry = no damage, and the Spike's 4 still counted as Value. In real gardens, plan your line so Spikes are entered on a diagonal.",
    failHint: "Enter the Spike diagonally (from the Gem above).",
  },
  {
    id: "full-garden",
    title: "Put it all together",
    icon: "🌸",
    learn:
      "A real garden is a full 5×5 board. The best lines are long, gather Power before big Thorns, keep Shield for later, and enter Spikes diagonally.",
    steps: [
      "Plan a long line that passes many tiles.",
      "Keep at least 4 Life — in a real garden you'll need it for the next lines.",
      "Stuck? Tap Show me.",
    ],
    goalLabel: "Score at least 1,000 and keep 4+ Life",
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
      detail: `Score ${b.total.toLocaleString()} / 1,000 · Life ${sim.survives ? sim.finalStats.hp : 0} (keep 4+)`,
    }),
    success:
      "That's how a strong line looks. Next: a real practice garden with several lines, a score target, Swaps and the Shop.",
    failHint: "Make the line longer, or protect more Life with Power and Shield.",
  },
];
