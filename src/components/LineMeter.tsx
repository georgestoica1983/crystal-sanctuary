"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLineTier, getNextLineTier, LINE_TIERS } from "@/lib/lineTiers";

const fmt = (n: number) => Math.round(n).toLocaleString();

/**
 * Live Value × Length meter above the board. Calm by default: one hint line
 * before drawing; while drawing, the score, the per-step gain, the Life cost
 * and — only when it matters — the line tier, a short-line tip, or why the
 * line would wilt.
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
  wiltReason,
  magicNow,
  magicAfter,
  tilesOnBoard,
  showShortLineTip,
  intro,
  idleText,
}: {
  /** Tiles in the line, counting the Companion's home tile and the Exit */
  tiles: number;
  chips: number;
  mult: number;
  xMult: number;
  /** Points of the same line one step shorter */
  previousPoints: number;
  /** Value the newest tile added */
  lastTileValue: number;
  reachesArchway: boolean;
  wilts: boolean;
  /** Why the line would wilt, e.g. "🌺6 hits 4 ❤️ (🧤 blocked 2) · you have 3" */
  wiltReason?: string | null;
  magicNow: number;
  magicAfter: number;
  /** Walkable tiles on this board (for "N / M tiles") */
  tilesOnBoard: number;
  showShortLineTip: boolean;
  /** Replaces the default "Drag from YOU…" hint (e.g. in lessons) */
  idleText?: string;
  /** A tile type seen for the first time: shown instead of the idle hint */
  intro?: {
    icon: React.ReactNode;
    name: string;
    text: string;
    /** Small heading, "New tile" by default */
    label?: string;
    index: number;
    total: number;
    onNext: () => void;
  } | null;
}) {
  const drawing = tiles >= 2;
  const points = Math.round(chips * mult * xMult);
  const gain = points - previousPoints;
  const tier = getLineTier(tiles);
  const next = getNextLineTier(tiles);
  const prevLevel = useRef(tier.level);
  const [tierUp, setTierUp] = useState<string | null>(null);

  useEffect(() => {
    if (tier.level > prevLevel.current && drawing) setTierUp(tier.name);
    if (!drawing) setTierUp(null);
    prevLevel.current = tier.level;
  }, [tier.level, tier.name, drawing]);
  // The burst always fades on its own, even if the line ends meanwhile
  useEffect(() => {
    if (!tierUp) return;
    const id = window.setTimeout(() => setTierUp(null), 1100);
    return () => window.clearTimeout(id);
  }, [tierUp]);

  const magicCost = magicNow - magicAfter;

  // Bottom line: the one thing worth saying right now
  let bottom: React.ReactNode = null;
  // A line that spends most of your Life leaves little for the next lines
  const costly = !wilts && magicCost >= 3 && magicCost * 2 > magicNow;
  if (drawing && wilts && wiltReason) {
    bottom = <span className="text-rose-200 font-semibold">⚠ {wiltReason}</span>;
  } else if (drawing && costly) {
    bottom = (
      <span className="text-amber-200 font-semibold">
        ⚠ Uses {magicCost} of {magicNow} ❤️ · little left for later lines
      </span>
    );
  } else if (drawing && showShortLineTip) {
    bottom = <span className="text-amber-200 font-semibold">💡 Short line — each extra tile is worth more</span>;
  } else if (drawing && tier.level > 0) {
    bottom = (
      <span className="flex items-center gap-1.5 w-full">
        <span className="font-semibold shrink-0" style={{ color: tier.color }}>
          {tier.name}
        </span>
        <span className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden flex">
          {LINE_TIERS.slice(1).map((t, i) => {
            const lower = LINE_TIERS[i].minTiles;
            const filled = Math.max(0, Math.min(1, (tiles - lower) / (t.minTiles - lower)));
            return (
              <span key={t.name} className="h-full flex-1 border-r border-black/40 last:border-0">
                <span
                  className="block h-full transition-all duration-200"
                  style={{ width: `${filled * 100}%`, backgroundColor: t.color }}
                />
              </span>
            );
          })}
        </span>
        <span className="shrink-0 text-white/45 font-mono">
          {next ? `${next.minTiles - tiles} → ${next.name}` : "top tier"}
        </span>
      </span>
    );
  }

  return (
    <div
      className="relative w-full max-w-[430px] min-w-0 h-[64px] rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 flex flex-col justify-center"
      aria-live="polite"
    >
      {!drawing && intro ? (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">{intro.icon}</div>
          <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-white/85">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-200/80 block">
              {intro.label ?? "New tile"}{intro.total > 1 ? ` · ${intro.total - 1} more` : ""}
            </span>
            <b className="text-white">{intro.name}</b> {intro.text}
          </div>
          <button
            type="button"
            onClick={intro.onNext}
            className="h-9 shrink-0 px-3 rounded-lg bg-teal-300 text-slate-950 text-[12px] font-bold active:scale-95"
          >
            {intro.total > 1 ? "Next" : "Got it"}
          </button>
        </div>
      ) : !drawing ? (
        <div className="text-[12.5px] leading-snug text-white/60 text-center">
          {idleText ?? (
            <>
              Drag from YOU 🐱 to the 🌈 Exit.{" "}
              <span className="text-amber-200/90">Longer lines score far more.</span>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 min-w-0">
            <div className="flex items-baseline gap-1 font-mono shrink-0">
              <span className="text-[17px] font-black text-sky-300 leading-none">{fmt(chips)}</span>
              <span className="text-[10px] text-white/40">value</span>
              <span className="text-[13px] text-white/40 mx-0.5">×</span>
              <span className="text-[17px] font-black text-emerald-300 leading-none">{fmt(mult)}</span>
              <span className="text-[10px] text-white/40">length</span>
              {xMult !== 1 && (
                <span className="text-[11px] font-black text-fuchsia-300">×{Math.round(xMult * 100) / 100}</span>
              )}
            </div>
            <div
              className={`ml-auto text-[21px] font-display font-semibold tabular-nums leading-none ${
                wilts ? "text-rose-300/70 line-through" : reachesArchway ? "text-amber-200" : "text-amber-200/50"
              }`}
            >
              {fmt(points)}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono leading-none">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={tiles}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="text-emerald-200/90 whitespace-nowrap"
              >
                {lastTileValue > 0 ? `+${lastTileValue} value, ` : ""}+1 length →{" "}
                <span className="font-black text-emerald-300">+{fmt(gain)}</span>
              </motion.span>
            </AnimatePresence>
            <span className="ml-auto shrink-0 whitespace-nowrap text-white/50">
              <span className={magicCost > 0 ? "text-rose-200" : ""}>❤️{magicCost > 0 ? `−${magicCost}` : "±0"}</span>
              {" · "}
              {tiles - 1}/{tilesOnBoard}
            </span>
          </div>

          <div className="mt-1 h-[14px] text-[11px] leading-[14px] whitespace-nowrap overflow-hidden flex items-center">
            {bottom}
          </div>
        </>
      )}

      <AnimatePresence>
        {tierUp && (
          <motion.div
            key={tierUp}
            initial={{ scale: 0.6, opacity: 0, y: 4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-black text-slate-950"
            style={{ backgroundColor: getLineTier(tiles).color }}
          >
            {tierUp}!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
