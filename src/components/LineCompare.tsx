"use client";

import React from "react";
import { GridCell, GridCoord } from "@/types/game";
import { ENTITY_COLORS } from "@/components/EntityIcon";
import { getLineTier } from "@/lib/lineTiers";

/** Tiny picture of a board with a line drawn over it */
export function MiniBoard({
  grid,
  path,
  color,
  size = 112,
}: {
  grid: GridCell[][];
  path: GridCoord[];
  color: string;
  size?: number;
}) {
  const cell = 20;
  const center = (c: GridCoord) => `${c.col * cell + cell / 2},${c.row * cell + cell / 2}`;
  const onPath = new Set(path.map((c) => `${c.row},${c.col}`));
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`A ${path.length}-tile line`}>
      {grid.map((row, r) =>
        row.map((c, col) =>
          c.type === "VOID" ? null : (
            <rect
              key={c.id}
              x={col * cell + 1.5}
              y={r * cell + 1.5}
              width={cell - 3}
              height={cell - 3}
              rx={3}
              fill={ENTITY_COLORS[c.type] ?? "#ffffff"}
              fillOpacity={onPath.has(`${r},${col}`) ? 0.55 : 0.16}
            />
          )
        )
      )}
      {path.length >= 2 && (
        <polyline
          points={path.map(center).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {path[0] && (
        <circle cx={path[0].col * cell + cell / 2} cy={path[0].row * cell + cell / 2} r={3.6} fill="#FDE047" />
      )}
    </svg>
  );
}

/**
 * "Your line vs the best line" on the same board, so a first-time player can
 * see that a longer route scores far more.
 */
export default function LineCompare({
  grid,
  yourPath,
  yourScore,
  bestPath,
  bestScore,
  yourMagicCost,
  bestMagicCost,
}: {
  grid: GridCell[][];
  yourPath: GridCoord[];
  yourScore: number;
  bestPath: GridCoord[] | null;
  bestScore: number | null;
  yourMagicCost: number;
  bestMagicCost: number | null;
}) {
  const cost = (n: number) => (n > 0 ? ` · ❤️−${n}` : " · ❤️±0");
  const yourTier = getLineTier(yourPath.length);
  const bestTier = bestPath ? getLineTier(bestPath.length) : null;
  const ratio =
    bestScore && yourScore > 0 ? Math.round((bestScore / yourScore) * 10) / 10 : null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <figure className="flex flex-col items-center gap-0.5">
          <MiniBoard grid={grid} path={yourPath} color={yourTier.color} />
          <figcaption className="text-center text-[10px] font-mono leading-tight">
            <div className="text-white font-black">Your line</div>
            <div className="text-indigo-200/80">
              {yourPath.length} tiles · {yourScore.toLocaleString()}
              {cost(yourMagicCost)}
            </div>
          </figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-0.5">
          {bestPath ? (
            <MiniBoard grid={grid} path={bestPath} color={bestTier?.color ?? "#FBBF24"} />
          ) : (
            <div className="w-[112px] h-[112px] rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-mono text-indigo-200/70">
              Finding…
            </div>
          )}
          <figcaption className="text-center text-[10px] font-mono leading-tight">
            <div className="text-amber-200 font-black">A long line here</div>
            <div className="text-indigo-200/80">
              {bestPath && bestScore != null
                ? `${bestPath.length} tiles · ${bestScore.toLocaleString()}${cost(bestMagicCost ?? 0)}`
                : "…"}
            </div>
          </figcaption>
        </figure>
      </div>
      {bestPath && bestScore != null && bestScore > yourScore && (
        <div className="text-center text-[11px] leading-snug text-amber-50">
          {bestPath.length - yourPath.length > 0
            ? `${bestPath.length - yourPath.length} more tiles would have scored `
            : "This route would have scored "}
          <span className="font-black text-amber-200">
            {ratio ? `${ratio}×` : "more"}
          </span>{" "}
          as much. Longer lines grow Value and Length together — but watch the ❤️ Life they cost.
        </div>
      )}
    </div>
  );
}
