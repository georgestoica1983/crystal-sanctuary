import {
  DungeonTheme,
  GridCell,
  GridCoord,
  HeroClassId,
  HeroStats,
  ModifierId,
  RelicId,
  RelicScoreContext,
} from "@/types/game";
import {
  computeDailyPar,
  computeFloorPar,
  PAR_SEARCH_BUDGET,
  searchBestFloorLine,
} from "@/lib/engine";

export interface FloorSearchArgs {
  grid: GridCell[][];
  startHero: HeroStats;
  modifierId: ModifierId;
  heroClassId: HeroClassId;
  activeRelics: RelicId[];
  /** Run facts some relics score on (scaling growth, stroke number) */
  scoreCtx?: RelicScoreContext;
}

export type ParRequest =
  | { kind: "daily"; dungeon: DungeonTheme }
  | ({ kind: "floor" | "line" } & FloorSearchArgs);

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, (result: unknown) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./par.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ id: number; result: unknown }>) => {
      pending.get(e.data.id)?.(e.data.result);
      pending.delete(e.data.id);
    };
  } catch {
    worker = null;
  }
  return worker;
}

function run<T>(request: ParRequest, fallback: () => T): Promise<T> {
  const w = getWorker();
  if (!w) {
    // No worker support: compute after the current frame instead
    return new Promise((resolve) => setTimeout(() => resolve(fallback()), 0));
  }
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve as (result: unknown) => void);
    w.postMessage({ id, ...request });
  });
}

const DAILY_PAR_CACHE_PREFIX = `ost_daily_par_v1:${PAR_SEARCH_BUDGET}:`;

/** Fixed per-garden par for a Daily (cached per date on this device). */
export async function requestDailyPar(dungeon: DungeonTheme): Promise<number[]> {
  const cacheKey = `${DAILY_PAR_CACHE_PREFIX}${dungeon.seedKey}`;
  try {
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as number[];
  } catch {
    // Ignore storage errors
  }
  const pars = await run({ kind: "daily", dungeon }, () =>
    computeDailyPar(dungeon)
  );
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(pars));
  } catch {
    // Ignore storage errors
  }
  return pars;
}

/** Par for one garden from the player's own starting stats (non-Daily modes). */
export function requestFloorPar(
  args: FloorSearchArgs
): Promise<number | null> {
  return run({ kind: "floor", ...args }, () =>
    computeFloorPar(
      args.grid,
      args.startHero,
      args.modifierId,
      args.heroClassId,
      args.activeRelics,
      PAR_SEARCH_BUDGET,
      args.scoreCtx
    )
  );
}

/** Same board, Companion, rules and relics → the same best line (searches are deterministic) */
const lineCache = new Map<string, Promise<GridCoord[] | null>>();
const LINE_CACHE_SIZE = 24;
const lineKey = (a: FloorSearchArgs) =>
  JSON.stringify([
    a.grid.map((row) => row.map((c) => `${c.type}${c.value}`).join(",")),
    a.startHero,
    a.modifierId,
    a.heroClassId,
    a.activeRelics,
    a.scoreCtx ?? null,
  ]);

/**
 * The par line itself (Hint ghost, Swap check, line compare). Cached, so a
 * Hint right after the board's Swap check is instant on slow phones.
 */
export function requestParLine(args: FloorSearchArgs): Promise<GridCoord[] | null> {
  const key = lineKey(args);
  const hit = lineCache.get(key);
  if (hit) return hit;
  const promise = searchParLine(args);
  lineCache.set(key, promise);
  if (lineCache.size > LINE_CACHE_SIZE) lineCache.delete(lineCache.keys().next().value as string);
  return promise;
}

function searchParLine(
  args: FloorSearchArgs
): Promise<GridCoord[] | null> {
  return run({ kind: "line", ...args }, () =>
    searchBestFloorLine(
      args.grid,
      args.startHero,
      args.modifierId,
      args.heroClassId,
      args.activeRelics,
      PAR_SEARCH_BUDGET,
      args.scoreCtx
    )?.path ?? null
  );
}
