"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLineTier, getNextLineTier, LINE_TIERS } from "@/lib/lineTiers";

const fmt = (n: number) => Math.round(n).toLocaleString();

/**
 * Live Chips × Mult meter shown above the board while drawing: every step pops
 * "+chips, +1 mult → +points", so players see a longer line is worth more and
 * more per tile. Also shows the Magic it will cost and the line's tier.
 */
export default function LineMeter({
  tiles,
  chips,
  mult,
  xMult,
  previousPoints,
  lastTileValue,
  reachesArchway,
  wilts,
  magicNow,
  magicAfter,
  tilesOnBoard,
  showShortLineTip,
}: {
  /** Tiles in the line, counting the Companion's home tile and the Archway */
  tiles: number;
  chips: number;
  mult: number;
  xMult: number;
  /** Points of the same line one step shorter */
  previousPoints: number;
  /** Chips the newest tile added */
  lastTileValue: number;
  reachesArchway: boolean;
  wilts: boolean;
  magicNow: number;
  magicAfter: number;
  /** Walkable tiles on this board (for "N / M tiles used") */
  tilesOnBoard: number;
  showShortLineTip: boolean;
}) {
  const drawing = tiles >= 2;
  const points = Math.round(chips * mult * xMult);
  const gain = points - previousPoints;
  const tier = getLineTier(tiles);
  const next = getNextLineTier(tiles);
  const prevLevel = useRef(tier.level);
  const [tierUp, setTierUp] = useState<string | null>(null);

  useEffect(() => {
    if (tier.level > prevLevel.current && drawing) {
      setTierUp(tier.name);
      const id = window.setTimeout(() => setTierUp(null), 1100);
      prevLevel.current = tier.level;
      return () => window.clearTimeout(id);
    }
    prevLevel.current = tier.level;
  }, [tier.level, tier.name, drawing]);

  const magicCost = magicNow - magicAfter;
  const progressFrom = tier.minTiles;
  const progressTo = next?.minTiles ?? tier.minTiles;
  const progress = next ? (tiles - progressFrom) / (progressTo - progressFrom) : 1;

  return (
    <div
      className="relative w-full max-w-[430px] min-w-0 h-[72px] rounded-xl border px-2.5 py-1.5 bg-[#0F1428]/95 flex flex-col justify-center"
      style={{ borderColor: drawing ? `${tier.color}88` : "rgba(255,255,255,0.12)" }}
      aria-live="polite"
    >
      {!drawing ? (
        <div className="text-[11.5px] leading-snug text-indigo-100/85">
          <span className="font-bold text-white">Score = </span>
          <span className="font-mono font-black text-sky-300">Chips</span>
          <span className="text-white"> × </span>
          <span className="font-mono font-black text-rose-300">Mult</span>
          <span>. Each tile adds Chips and +1 Mult — </span>
          <span className="font-bold text-amber-200">longer lines multiply both</span>.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-baseline gap-1 font-mono shrink-0">
              <span className="text-lg font-black text-sky-300 leading-none">{fmt(chips)}</span>
              <span className="text-[10px] text-sky-200/70 uppercase">chips</span>
              <span className="text-sm text-white/70 mx-0.5">×</span>
              <span className="text-lg font-black text-rose-300 leading-none">{fmt(mult)}</span>
              <span className="text-[10px] text-rose-200/70 uppercase">mult</span>
              {xMult !== 1 && (
                <span className="text-[11px] font-black text-fuchsia-300">×{Math.round(xMult * 100) / 100}</span>
              )}
            </div>
            <div className="ml-auto text-right min-w-0 leading-none">
              <div
                className={`text-lg font-mono font-black leading-none ${
                  reachesArchway ? "text-amber-200" : "text-amber-200/60"
                }`}
              >
                = {fmt(points)}
              </div>
              <div className="text-[10px] font-mono text-indigo-200/70 whitespace-nowrap">
                {wilts ? "would wilt ✗" : reachesArchway ? "let go to score" : "reach 🌈 to score"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {/* Per-step gain: grows with every tile */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={tiles}
                initial={{ y: 6, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-[10px] font-mono text-emerald-200 whitespace-nowrap"
              >
                {lastTileValue > 0 ? `+${lastTileValue} chips, ` : ""}+1 mult →{" "}
                <span className="font-black text-emerald-300">+{fmt(gain)}</span>
              </motion.div>
            </AnimatePresence>
            <div className="ml-auto flex items-center gap-2 text-[10px] font-mono shrink-0">
              <span className={magicCost > 0 ? "text-rose-200" : "text-indigo-200/70"}>
                ✨ {magicCost > 0 ? `−${magicCost}` : "±0"}
              </span>
              <span className="text-indigo-200/70">
                {tiles - 1}/{tilesOnBoard} tiles
              </span>
            </div>
          </div>

          {/* Tier progress (the short-line tip takes this row's place) */}
          {showShortLineTip ? (
            <div className="mt-1 h-[14px] text-[10.5px] leading-[14px] font-bold text-amber-200 whitespace-nowrap overflow-hidden">
              💡 Short line — each extra tile is worth more!
            </div>
          ) : (
          <div className="flex items-center gap-1.5 mt-1 h-[14px]">
            <span className="text-[10px] font-mono font-black shrink-0" style={{ color: tier.color }}>
              {tier.name}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden flex">
              {LINE_TIERS.slice(1).map((t, i) => {
                const lower = LINE_TIERS[i].minTiles;
                const span = t.minTiles - lower;
                const filled = Math.max(0, Math.min(1, (tiles - lower) / span));
                return (
                  <div key={t.name} className="h-full flex-1 border-r border-black/40 last:border-0">
                    <div
                      className="h-full transition-all duration-200"
                      style={{ width: `${filled * 100}%`, backgroundColor: t.color }}
                    />
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] font-mono text-indigo-200/70 shrink-0 whitespace-nowrap">
              {next ? `${next.minTiles - tiles} more → ${next.name}` : "top tier!"}
            </span>
          </div>
          )}
          <span className="sr-only">{Math.round(progress * 100)}% to the next tier</span>

        </>
      )}

      <AnimatePresence>
        {tierUp && (
          <motion.div
            key={tierUp}
            initial={{ scale: 0.6, opacity: 0, y: 4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-black text-slate-950 shadow-lg"
            style={{ backgroundColor: getLineTier(tiles).color }}
          >
            {tierUp}!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
