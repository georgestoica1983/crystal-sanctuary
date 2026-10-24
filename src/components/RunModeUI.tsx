"use client";

import React from "react";
import { motion } from "framer-motion";
import { GridCell, GridCoord, RelicId, RunGardenState } from "@/types/game";
import {
  BOSS_RULE_REGISTRY,
  getRunGardenKindLabel,
  getRunGardenLabel,
  getRunGardenPosition,
  RELIC_REGISTRY,
  RUN_FINAL_SEASON,
  RUN_INTEREST_MAX,
  RUN_INTEREST_STEP,
  RUN_STROKES_PER_GARDEN,
  RUN_WEEDOUT_MAX_TILES,
  RUN_WEEDOUTS_PER_GARDEN,
} from "@/lib/engine";

const fmt = (n: number) => Math.round(n).toLocaleString();

/** Season · garden, target, score bar, lines and weed-outs */
export function RunHudStrip({
  garden,
  previewScore,
  noSafeLine,
  weedOutActive,
  weedOutCount = 0,
  disabled,
  onToggleWeedOut,
  onConfirmWeedOut,
  soundOn,
  onToggleSound,
  suggestSwap = false,
}: {
  garden: RunGardenState;
  previewScore: number | null;
  noSafeLine: boolean;
  weedOutActive: boolean;
  weedOutCount?: number;
  disabled: boolean;
  onToggleWeedOut: () => void;
  onConfirmWeedOut?: () => void;
  /** Quick mute next to Swap */
  soundOn?: boolean;
  onToggleSound?: () => void;
  /** The board looks too weak for the target: Swap glows gently */
  suggestSwap?: boolean;
}) {
  const pct = Math.min(100, (garden.score / garden.target) * 100);
  const previewPct =
    previewScore && previewScore > 0
      ? Math.min(100 - pct, (previewScore / garden.target) * 100)
      : 0;
  const isBoss = garden.kind === "BOSS";
  const boss = garden.bossRuleId ? BOSS_RULE_REGISTRY[garden.bossRuleId] : null;
  const strokesUsed = RUN_STROKES_PER_GARDEN - garden.strokesLeft;
  return (
    <div
      className={`w-full max-w-[430px] min-w-0 rounded-xl px-3 pt-2 pb-1.5 border space-y-1.5 bg-white/[0.04] ${
        isBoss ? "border-rose-300/40" : "border-white/[0.07]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-white/70 whitespace-nowrap">
            Season {garden.season}
            {garden.season > RUN_FINAL_SEASON ? " · Endless" : ""} ·{" "}
            <span className={isBoss ? "text-rose-200" : "text-white/90"}>
              {boss ? `${boss.icon} ` : ""}
              {getRunGardenKindLabel(garden.kind)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-[12px] text-white/55">
          Target <span className="font-mono font-black text-amber-200">{fmt(garden.target)}</span>
        </div>
      </div>

      {/* Score progress */}
      <div className="relative h-4 rounded-full bg-black/30 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-amber-300/80"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {previewPct > 0 && (
          <div
            className="absolute inset-y-0 bg-amber-200/35"
            style={{ left: `${pct}%`, width: `${previewPct}%` }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
          {fmt(garden.score)} / {fmt(garden.target)}
          {previewScore != null && previewScore > 0 && (
            <span className="ml-1 text-amber-200">(+{fmt(previewScore)})</span>
          )}
        </div>
      </div>

      {!weedOutActive && (
      <div className="flex items-center justify-between gap-2 h-8">
        <div
          className="flex items-center gap-1.5 text-[12px] text-white/55"
          aria-label={`${garden.strokesLeft} lines left`}
        >
          <span>Lines</span>
          {Array.from({ length: RUN_STROKES_PER_GARDEN }, (_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i < strokesUsed ? "bg-white/15" : "bg-teal-300"
              }`}
            />
          ))}
          <span className="ml-0.5 font-mono font-black text-white/85">{garden.strokesLeft}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundOn ? "Mute sound" : "Turn sound on"}
            aria-pressed={!soundOn}
            className="h-8 w-9 rounded-lg border border-white/[0.1] bg-white/[0.05] text-[15px] leading-none active:scale-95"
          >
            <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
          </button>
        )}
        <button
          type="button"
          disabled={disabled || (garden.weedOutsLeft <= 0 && !weedOutActive)}
          onClick={onToggleWeedOut}
          className={`h-8 px-3 rounded-lg border text-[12px] font-semibold transition active:scale-95 disabled:opacity-35 ${
            weedOutActive
              ? "bg-lime-300 text-slate-950 border-lime-200"
              : noSafeLine
              ? "bg-lime-400/20 border-lime-300 text-lime-100 animate-pulse"
              : suggestSwap
              ? "bg-lime-400/10 border-lime-300/70 text-lime-100 shadow-[0_0_12px_rgba(190,242,100,0.35)] animate-pulse"
              : "bg-white/[0.05] border-white/[0.1] text-white/85"
          }`}
        >
          <span aria-hidden="true">🌿</span>{" "}Swap · {garden.weedOutsLeft}
        </button>
        </div>
      </div>
      )}

      {weedOutActive && (
        <div className="flex items-center gap-1.5 h-8">
          <div className="flex-1 text-[11px] text-lime-100 leading-tight">
            Tap up to {RUN_WEEDOUT_MAX_TILES} tiles to swap ({weedOutCount}/{RUN_WEEDOUT_MAX_TILES})
          </div>
          <button
            type="button"
            onClick={onToggleWeedOut}
            className="h-8 px-3 rounded-lg bg-white/10 border border-white/15 text-[12px] font-semibold text-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={weedOutCount === 0}
            onClick={onConfirmWeedOut}
            className="h-8 px-3 rounded-lg bg-lime-300 text-slate-950 text-[12px] font-bold disabled:opacity-40"
          >
            Swap {weedOutCount > 0 ? weedOutCount : ""}
          </button>
        </div>
      )}

    </div>
  );
}

/** Tap up to 3 tiles on the board to swap them for new ones from the Tile Bag */
export function RunWeedOutOverlay({
  grid,
  selected,
  onToggle,
}: {
  grid: GridCell[][];
  selected: GridCoord[];
  onToggle: (coord: GridCoord) => void;
}) {
  const isSelected = (r: number, c: number) =>
    selected.some((s) => s.row === r && s.col === c);
  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      <div className="relative flex-1 rounded-2xl p-2.5 bg-lime-950/35 ring-2 ring-lime-300/70">
        <div className="grid grid-cols-5 grid-rows-5 gap-2 w-full h-full">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const locked = cell.type === "HERO" || cell.type === "EXIT" || cell.type === "VOID";
              const on = isSelected(r, c);
              return (
                <button
                  key={cell.id}
                  type="button"
                  disabled={locked}
                  aria-label={`Swap row ${r + 1} column ${c + 1}`}
                  aria-pressed={on}
                  onClick={() => onToggle({ row: r, col: c })}
                  className={`rounded-xl transition ${
                    locked
                      ? "bg-black/40 cursor-not-allowed"
                      : on
                      ? "bg-lime-300/45 ring-4 ring-lime-200 shadow-[0_0_14px_rgba(190,242,100,0.9)]"
                      : "bg-transparent hover:bg-lime-200/15 ring-1 ring-lime-200/30"
                  } flex items-center justify-center text-xl`}
                >
                  {on ? "🌿" : ""}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export interface RunClearInfo {
  gardenIndex: number;
  score: number;
  target: number;
  strokesLeft: number;
  clearReward: number;
  strokeBonus: number;
  interest: number;
  /** Interest cap with relics (Squirrel's Stash raises it) */
  interestCap?: number;
  /** Extra Gems from relics (Seed Purse) */
  relicBonus?: number;
  /** First-garden welcome bonus */
  welcomeBonus?: number;
  total: number;
  gemsBefore: number;
  legendary: RelicId | null;
  relicsAfter: RelicId[];
  /** ❤️ Life restored for the next garden (rules v5+) */
  lifeBonus?: number;
}

/**
 * Stars for a cleared Garden Bed (display only): ⭐ cleared, ⭐⭐ with a line
 * to spare, ⭐⭐⭐ also scoring 1.5× the target.
 */
export function getRunBedStars(score: number, target: number, strokesLeft: number): number {
  return 1 + (strokesLeft >= 1 ? 1 : 0) + (strokesLeft >= 1 && score >= target * 1.5 ? 1 : 0);
}

const STAR_HINT: Record<number, string> = {
  1: "⭐⭐ for a line to spare · ⭐⭐⭐ for 1.5× the target too",
  2: "⭐⭐⭐ for 1.5× the target with a line to spare",
  3: "Perfect Garden Bed!",
};

/** Small → Big → Boss beds of this Season, with the one just cleared */
function SeasonMap({ season, clearedKind }: { season: number; clearedKind: string }) {
  const order = ["SMALL", "BIG", "BOSS"] as const;
  const done = order.indexOf(clearedKind as (typeof order)[number]);
  return (
    <div className="mt-2.5 flex items-center justify-center gap-1" aria-label={`Season ${season} map`}>
      {order.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className={`h-0.5 w-6 rounded-full ${i <= done ? "bg-emerald-300" : "bg-white/15"}`} />}
          <span
            className={`flex flex-col items-center gap-0.5 text-[9px] font-mono font-bold ${
              i <= done ? "text-emerald-200" : i === done + 1 ? "text-white/80" : "text-white/35"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] border ${
                i <= done
                  ? "bg-emerald-400/25 border-emerald-300"
                  : i === done + 1
                  ? "border-white/50 animate-pulse"
                  : "border-white/15"
              }`}
            >
              {i <= done ? "✓" : k === "BOSS" ? "👑" : "🌼"}
            </span>
            {k === "SMALL" ? "Small" : k === "BIG" ? "Big" : "Boss"}
          </span>
        </React.Fragment>
      ))}
      <span className="ml-2 text-[9px] font-mono text-white/45">
        {done === 2 ? `→ Season ${season + 1}` : `Season ${season}`}
      </span>
    </div>
  );
}

/** Garden-clear screen: the Seed payout, then on to the Shop */
export function RunGardenClearModal({
  info,
  onContinue,
}: {
  info: RunClearInfo | null;
  onContinue: () => void;
}) {
  if (!info) return null;
  const { kind, season } = getRunGardenPosition(info.gardenIndex);
  const legendary = info.legendary ? RELIC_REGISTRY[info.legendary] : null;
  const stars = getRunBedStars(info.score, info.target, info.strokesLeft);
  const lines = [
    { label: `${getRunGardenKindLabel(kind)} cleared`, value: info.clearReward },
    {
      label: `Unused lines (${info.strokesLeft})${
        info.strokeBonus > info.strokesLeft ? " · 👒 ×2" : ""
      }`,
      value: info.strokeBonus,
    },
    {
      label: `Interest (1 per ${RUN_INTEREST_STEP} 🌱, max ${info.interestCap ?? RUN_INTEREST_MAX})`,
      value: info.interest,
    },
    ...(info.relicBonus ? [{ label: "👛 Seed Purse", value: info.relicBonus }] : []),
    ...(info.welcomeBonus ? [{ label: "🎁 Welcome bonus", value: info.welcomeBonus }] : []),
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="w-full max-w-[380px] rounded-2xl p-4 space-y-3 text-white border-2 border-emerald-300/70 bg-gradient-to-b from-[#0E2226] via-[#0B1622] to-[#070A16] shadow-[0_0_40px_rgba(52,211,153,0.35)]"
      >
        <div className="text-center">
          <div className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-emerald-300">
            {getRunGardenLabel(info.gardenIndex)}
          </div>
          <div className="text-2xl font-black text-emerald-100 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]">
            Garden Bed cleared! 🌸
          </div>
          <div className="flex justify-center gap-1.5 mt-1.5" aria-label={`${stars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <motion.span
                key={n}
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0, transition: { delay: 0.2 + n * 0.22, type: "spring", stiffness: 380, damping: 14 } }}
                className={`text-[30px] leading-none ${n <= stars ? "" : "opacity-20 grayscale"}`}
              >
                ⭐
              </motion.span>
            ))}
          </div>
          <div className="text-xs font-mono text-emerald-100/80 mt-1">
            {fmt(info.score)} / {fmt(info.target)}
          </div>
          <div className="text-[10px] text-emerald-100/55 mt-0.5">{STAR_HINT[stars]}</div>
          <SeasonMap season={season} clearedKind={kind} />
        </div>

        <div className="rounded-xl border border-amber-300/50 bg-amber-400/10 p-2.5 space-y-1">
          {lines.map((l, i) => (
            <motion.div
              key={l.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.15 + i * 0.18 } }}
              className="flex justify-between items-start gap-2 text-[11px] leading-snug font-mono text-amber-50"
            >
              <span className="min-w-0">{l.label}</span>
              <span className="font-black shrink-0 whitespace-nowrap">+{l.value} 🌱</span>
            </motion.div>
          ))}
          <div className="border-t border-amber-300/30 pt-1 flex justify-between text-sm font-mono font-black text-amber-200">
            <span>Payout</span>
            <span>+{info.total} 🌱</span>
          </div>
          <div className="text-[10px] font-mono text-amber-100/70 text-right">
            {info.gemsBefore} → {info.gemsBefore + info.total} 🌱 Seeds to spend
          </div>
        </div>

        {!!info.lifeBonus && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { delay: 0.15 + lines.length * 0.18 } }}
            className="rounded-xl border border-emerald-300/60 bg-emerald-400/15 px-3 py-2 text-center text-sm font-black text-emerald-100"
          >
            ❤️ +{info.lifeBonus} Life for the next Garden Bed
          </motion.div>
        )}

        {legendary && (
          <div className="rounded-xl border border-fuchsia-300/60 bg-fuchsia-500/15 px-3 py-2 text-xs text-fuchsia-50">
            👑 Legendary relic earned: <span className="font-black">{legendary.icon} {legendary.name}</span>
            <div className="text-[11px] opacity-85">{legendary.description}</div>
          </div>
        )}

        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-xl py-2.5 font-mono font-black text-xs uppercase border-2 border-fuchsia-300 bg-fuchsia-500/30 text-white shadow-[0_0_18px_rgba(217,70,239,0.55)] active:scale-95"
        >
          Enter the Shop →
        </button>
      </motion.div>
    </div>
  );
}

export type RunEndReason = "MISSED_TARGET" | "NO_SAFE_LINE" | "WILTED" | "ENDED";

export interface RunOverInfo {
  reason: RunEndReason;
  gardenIndex: number;
  gardenScore: number;
  target: number;
  runScore: number;
  gardensCleared: number;
  best: { season: number; gardenIndex: number; score: number };
  isNewBest: boolean;
}

const REASON_COPY: Record<RunEndReason, { title: string; body: string; icon: string }> = {
  MISSED_TARGET: {
    icon: "🥀",
    title: "Target missed",
    body: "Your last line didn't reach this garden's target.",
  },
  NO_SAFE_LINE: {
    icon: "🪨",
    title: "No safe line",
    body: "Your Life can't carry the Companion to the Exit on this board, and no Swaps are left.",
  },
  WILTED: {
    icon: "💫",
    title: "Out of Life",
    body: "Your Companion ran out of Life on that line.",
  },
  ENDED: {
    icon: "🌙",
    title: "Garden Run ended",
    body: "You ended this Garden Run early.",
  },
};

/** Run summary: how far the run reached and the best record on this device */
export function RunOverModal({
  info,
  newRunLabel = "New Garden Run",
  rankLine,
  onOpenLeaderboard,
  onNewRun,
  onClose,
}: {
  info: RunOverInfo | null;
  newRunLabel?: string;
  rankLine?: string | null;
  onOpenLeaderboard?: () => void;
  onNewRun: () => void;
  onClose: () => void;
}) {
  if (!info) return null;
  const copy = REASON_COPY[info.reason];
  const shortBy = Math.max(0, info.target - info.gardenScore);
  const body =
    info.reason === "MISSED_TARGET"
      ? shortBy <= info.target * 0.35
        ? `So close — just ${fmt(shortBy)} points short. One longer line would have made it.`
        : `${fmt(shortBy)} points short. Longer lines multiply your score — and score relics from the Shop push it further.`
      : copy.body;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[380px] rounded-2xl p-4 space-y-3 text-white border border-white/[0.08] bg-[#151A2C]"
      >
        <div className="text-center">
          <div className="text-3xl">{copy.icon}</div>
          <div className="text-xl font-black text-rose-100">{copy.title}</div>
          <p className="text-[13px] text-rose-100/85 leading-snug mt-1">{body}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 space-y-1 text-[11px] font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-300">Reached</span>
            <span className="font-black text-emerald-200">{getRunGardenLabel(info.gardenIndex)}</span>
          </div>
          {info.reason !== "ENDED" && (
            <div className="flex justify-between">
              <span className="text-zinc-300">This Garden Bed</span>
              <span className="font-black">
                {fmt(info.gardenScore)} / {fmt(info.target)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-300">Garden Beds cleared</span>
            <span className="font-black">{info.gardensCleared}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-300">Garden Run score</span>
            <span className="font-black text-amber-200">{fmt(info.runScore)}</span>
          </div>
        </div>

        <div
          className={`rounded-xl px-3 py-2 text-center text-xs font-mono ${
            info.isNewBest
              ? "border-2 border-amber-300 bg-amber-400/15 text-amber-100 font-black"
              : "border border-white/10 bg-white/5 text-zinc-300"
          }`}
        >
          {info.isNewBest ? "✨ New best Garden Run! " : "Best Garden Run: "}
          {getRunGardenLabel(info.best.gardenIndex)}
        </div>

        {onOpenLeaderboard && (
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="w-full rounded-xl px-3 py-2 text-xs font-mono font-bold border border-amber-300/50 bg-amber-400/10 text-amber-100"
          >
            {rankLine ?? "🏆 See the leaderboard"}
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs font-bold"
          >
            Look at board
          </button>
          <button
            type="button"
            onClick={onNewRun}
            className="py-2.5 rounded-xl bg-emerald-300 text-slate-950 font-mono text-xs font-black"
          >
            {newRunLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
