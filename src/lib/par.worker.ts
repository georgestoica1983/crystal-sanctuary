// Web Worker: runs the par search off the main thread so drawing never stutters.
import {
  computeDailyPar,
  computeFloorPar,
  PAR_SEARCH_BUDGET,
  searchBestFloorLine,
} from "@/lib/engine";
import type { ParRequest } from "@/lib/parClient";

self.onmessage = (event: MessageEvent<ParRequest & { id: number }>) => {
  const { id, ...request } = event.data;
  const result =
    request.kind === "daily"
      ? computeDailyPar(request.dungeon)
      : request.kind === "line"
      ? searchBestFloorLine(
          request.grid,
          request.startHero,
          request.modifierId,
          request.heroClassId,
          request.activeRelics,
          PAR_SEARCH_BUDGET,
          request.scoreCtx
        )?.path ?? null
      : computeFloorPar(
          request.grid,
          request.startHero,
          request.modifierId,
          request.heroClassId,
          request.activeRelics,
          PAR_SEARCH_BUDGET,
          request.scoreCtx
        );
  (self as unknown as Worker).postMessage({ id, result });
};
