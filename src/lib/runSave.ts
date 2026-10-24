// Saving an in-progress Run on this device. The save is the Run's action log
// (the same one the leaderboard replays) plus a few screen flags; on startup
// the page rebuilds the exact Run by replaying it with the shared rules.
import {
  getRunGardenLabel,
  hasSurvivableRunLine,
  simulatePath,
} from "@/lib/engine";
import {
  createRunReplayer,
  getRunBloomResult,
  parseRunLog,
  runModifierFor,
  RunActionLog,
  scoreRunStroke,
  startRunGarden,
} from "@/lib/runReplay";
import type {
  DungeonFloor,
  FloorHistoryRecord,
  GridCoord,
  HeroClassId,
  HeroStats,
  RelicCounters,
  RelicId,
  RunGardenState,
  RunUpgrades,
  SeedTile,
  ShopOffer,
} from "@/types/game";

const RUN_SAVE_KEY = "ost_run_save_v1";

export interface RunSave {
  log: RunActionLog;
  /** A locked Companion's one free garden is in play */
  trial: boolean;
  /** Hints left in the current garden */
  hints: number;
  /** The Shop is open (vs. the garden-clear payout screen before it) */
  inShop: boolean;
}

export function writeRunSave(save: RunSave): void {
  try {
    window.localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage unavailable or full: the Run just won't survive a reload
  }
}

export function clearRunSave(): void {
  try {
    window.localStorage.removeItem(RUN_SAVE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * The stored save (not yet checked: see rebuildRunFromSave), or null when
 * there is none. A corrupt save comes back as a value that won't rebuild.
 */
export function readRunSave(): unknown | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(RUN_SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { corrupt: true };
  }
}

export interface RestoredBloom {
  /** The garden as it bloomed */
  garden: RunGardenState;
  /** Companion when the blooming stroke started / after it */
  strokeStartHero: HeroStats;
  afterStroke: HeroStats;
  payout: ReturnType<typeof getRunBloomResult>["payout"];
  legendary: RelicId | null;
  relicsAfter: RelicId[];
  statsWithPayout: HeroStats;
  offers: ShopOffer[];
}

export interface RestoredRun {
  log: RunActionLog;
  seed: string;
  classId: HeroClassId;
  trial: boolean;
  hints: number;
  bag: SeedTile[];
  /** One per garden reached; the last is the current one with its live grid */
  floors: DungeonFloor[];
  garden: RunGardenState;
  label: string;
  relics: RelicId[];
  counters: RelicCounters;
  upgrades: RunUpgrades;
  history: FloorHistoryRecord[];
  totalCellsVisited: number;
  gemsSpent: number;
  /** PLAY: mid-garden · CLEAR: payout screen · SHOP: in the Shop · OVER: ended but not yet shown */
  phase: "PLAY" | "CLEAR" | "SHOP" | "OVER";
  /** Companion at the start of the next stroke (PLAY / OVER) */
  startHero: HeroStats;
  noSafeLine: boolean;
  bloom: RestoredBloom | null;
  shop: { stats: HeroStats; offers: ShopOffer[]; soldIds: string[]; rerolls: number; purchases: number };
  overReason: "MISSED_TARGET" | "NO_SAFE_LINE";
}

const unpack = (n: number): GridCoord => ({ row: Math.floor(n / 5), col: n % 5 });

/**
 * Replays a save into everything the page needs to continue the Run, or
 * returns why it can't (e.g. the rules changed since it was saved).
 */
export function rebuildRunFromSave(raw: unknown): { ok: true; run: RestoredRun } | { ok: false; error: string } {
  try {
    if (!raw || typeof raw !== "object") return { ok: false, error: "unreadable save" };
    const save = raw as Partial<RunSave>;
    const log = parseRunLog(save.log);
    if (!log) return { ok: false, error: "unreadable save" };

    const bag = startRunGarden(log.seed, log.hero, log.v).bag;
    const run = createRunReplayer(log.seed, log.hero, log.v);
    const s = run.state;
    const floors: DungeonFloor[] = [];
    const history: FloorHistoryRecord[] = [];
    let totalCellsVisited = 0;
    let gemsSpent = 0;
    let purchases = 0;
    let bloom: RestoredBloom | null = null;
    let shopActionsSinceBloom = 0;

    for (let i = 0; i < log.a.length; i++) {
      const action = log.a[i];
      if (action.k === "s") {
        // Same record the page keeps for each stroke
        const grid = s.grid;
        const startHero = s.startHero;
        const relics = s.relics;
        const gardenIndex = s.garden.gardenIndex;
        const path = action.p.map(unpack);
        const sim = simulatePath(grid, path, startHero, runModifierFor(log.v), s.classId, relics);
        const { breakdown, afterStroke, countersAfter } = scoreRunStroke(
          sim,
          startHero,
          path,
          relics,
          s.counters,
          s.garden.strokesLeft
        );
        const error = run.apply(action);
        if (error) return { ok: false, error: `action ${i}: ${error}` };
        totalCellsVisited += path.length - 1;
        history.push({
          floorNumber: gardenIndex + 1,
          path,
          gridSnapshot: grid,
          steps: sim.steps,
          endStats: sim.finalStats,
          cleared: sim.survives && sim.endsOnExit,
          stars: sim.stars,
          floorScore: breakdown.total,
          scoreBreakdown: breakdown,
        });
        if (s.phase === "SHOP") {
          const result = getRunBloomResult({
            garden: s.garden,
            stats: afterStroke,
            runSeed: log.seed,
            relics,
            counters: countersAfter,
          });
          bloom = { garden: s.garden, strokeStartHero: startHero, afterStroke, ...result };
          purchases = 0;
          shopActionsSinceBloom = 0;
        }
        continue;
      }
      if (action.k === "l") floors.push({ ...s.floor, grid: s.grid });
      const goldBefore = s.shop.stats.gold;
      const error = run.apply(action);
      if (error) return { ok: false, error: `action ${i}: ${error}` };
      if (action.k === "x") shopActionsSinceBloom++;
      if (action.k === "b" || action.k === "r") {
        gemsSpent += goldBefore - s.shop.stats.gold;
        shopActionsSinceBloom++;
        if (action.k === "b") purchases++;
      }
      if (action.k === "l") bloom = null;
    }
    floors.push({ ...s.floor, grid: s.grid });

    const phase: RestoredRun["phase"] =
      s.phase === "OVER"
        ? "OVER"
        : s.phase === "SHOP"
        ? save.inShop || shopActionsSinceBloom > 0
          ? "SHOP"
          : "CLEAR"
        : "PLAY";
    const noSafeLine =
      phase === "PLAY" &&
      s.garden.weedOutsLeft > 0 &&
      !hasSurvivableRunLine(s.grid, s.startHero, runModifierFor(log.v), s.classId, s.relics);

    return {
      ok: true,
      run: {
        log,
        seed: log.seed,
        classId: s.classId,
        trial: Boolean(save.trial),
        hints: typeof save.hints === "number" ? Math.max(0, Math.min(1, save.hints)) : 1,
        bag,
        floors,
        garden: s.garden,
        label: getRunGardenLabel(s.garden.gardenIndex),
        relics: s.relics,
        counters: s.counters,
        upgrades: s.upgrades,
        history,
        totalCellsVisited,
        gemsSpent,
        phase,
        startHero: s.startHero,
        noSafeLine,
        bloom: phase === "CLEAR" || phase === "SHOP" ? bloom : null,
        shop: { ...s.shop, purchases },
        overReason: s.garden.strokesLeft <= 0 ? "MISSED_TARGET" : "NO_SAFE_LINE",
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "replay failed" };
  }
}
