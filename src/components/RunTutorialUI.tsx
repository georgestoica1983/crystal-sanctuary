"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LessonGoalStatus, PRACTICE_GARDEN_GEMS, PRACTICE_GARDEN_TARGET, RunLesson } from "@/lib/runLessons";
import {
  getRunGardenTarget,
  RUN_INTEREST_MAX,
  RUN_INTEREST_STEP,
  RUN_REROLL_BASE_COST,
  MAX_COMMON_RELICS,
} from "@/lib/engine";

/** Lesson card above the board: what you learn, what to do, live goal check */
export function RunLessonCoach({
  lesson,
  index,
  total,
  status,
}: {
  lesson: RunLesson;
  index: number;
  total: number;
  status: LessonGoalStatus | null;
}) {
  // Steps are shown on tall screens; on short phones they fold away so the
  // board stays on screen (tap "Show steps" to read them)
  const [showSteps, setShowSteps] = useState(true);
  useEffect(() => {
    setShowSteps(window.innerHeight >= 760);
  }, [lesson.id]);
  return (
    <div className="w-full max-w-[430px] min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-300">
          Lesson {index + 1}/{total}
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`w-2 h-1.5 rounded-full ${
                i < index ? "bg-emerald-300" : i === index ? "bg-amber-300" : "bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-white flex items-center gap-1.5 min-w-0">
          <span aria-hidden="true">{lesson.icon}</span>
          <span>{lesson.title}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSteps((v) => !v)}
          aria-expanded={showSteps}
          className="h-8 shrink-0 px-2.5 rounded-md bg-white/10 text-[11px] font-mono font-bold text-emerald-100"
        >
          {showSteps ? "Hide steps" : "Show steps"}
        </button>
      </div>
      <p className="text-[12px] leading-snug text-emerald-50/90">{lesson.learn}</p>
      {showSteps && (
      <ol className="text-[11.5px] leading-snug text-indigo-100/90 space-y-0.5">
        {lesson.steps.map((s, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="shrink-0 w-4 h-4 rounded-full bg-white/10 text-[9px] font-mono font-black flex items-center justify-center mt-px">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      )}
      <div
        className={`rounded-lg px-2 py-1.5 border text-[11px] font-mono ${
          status?.ok
            ? "border-emerald-300 bg-emerald-400/15 text-emerald-100"
            : "border-amber-300/50 bg-amber-400/10 text-amber-100"
        }`}
      >
        <div className="font-black">🎯 Goal: {lesson.goalLabel}</div>
        <div className="mt-0.5 min-h-[1.25em]">
          {status ? (
            <>
              {status.ok ? "✓ " : "… "}
              {status.detail}
              {status.ok && " — let go to walk it!"}
            </>
          ) : (
            <span className="opacity-70">Draw your line — this checks it live.</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Buttons under the board while in a lesson */
export function RunLessonControls({
  showingSolution,
  onClear,
  onShowMe,
  onRestart,
  onLeave,
  disabled,
}: {
  showingSolution: boolean;
  onClear: () => void;
  onShowMe: () => void;
  onRestart: () => void;
  onLeave: () => void;
  disabled: boolean;
}) {
  const btn =
    "h-11 px-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12px] font-semibold text-white/85 active:scale-95 transition disabled:opacity-40 whitespace-nowrap";
  return (
    <div className="w-full max-w-[430px] grid grid-cols-4 gap-1.5">
      <button type="button" disabled={disabled} onClick={onClear} className={btn}>
        Clear<span className="hidden min-[360px]:inline"> line</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onShowMe}
        className={`${btn} ${showingSolution ? "border-amber-300 text-amber-100" : ""}`}
      >
        {showingSolution ? "Hide" : (
          <>
            <span aria-hidden="true">👀 </span>Show<span className="hidden min-[360px]:inline"> me</span>
          </>
        )}
      </button>
      <button type="button" disabled={disabled} onClick={onRestart} className={btn}>
        Restart
      </button>
      <button type="button" onClick={onLeave} className={btn}>
        Leave
      </button>
    </div>
  );
}

export interface LessonResultInfo {
  ok: boolean;
  text: string;
  scoreLine: string;
  isLast: boolean;
}

export function RunLessonResult({
  info,
  onNext,
  onRetry,
}: {
  info: LessonResultInfo | null;
  onNext: () => void;
  onRetry: () => void;
}) {
  if (!info) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-3">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-[400px] rounded-2xl p-4 space-y-2.5 text-white border-2 ${
          info.ok
            ? "border-emerald-300/70 bg-gradient-to-b from-[#0E2622] to-[#0A1218]"
            : "border-amber-300/70 bg-gradient-to-b from-[#2A1F0E] to-[#140F0A]"
        }`}
      >
        <div className="text-xl font-black">{info.ok ? "✓ Goal met!" : "Not quite yet"}</div>
        <div className="text-[11px] font-mono text-cyan-100/90">{info.scoreLine}</div>
        <p className="text-[13px] leading-snug text-white/90">{info.text}</p>
        {info.ok ? (
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs font-mono font-bold"
            >
              Again
            </button>
            <button
              type="button"
              onClick={onNext}
              className="py-2.5 rounded-xl bg-emerald-300 text-slate-950 text-xs font-mono font-black"
            >
              {info.isLast ? "Go to the Practice Garden →" : "Next lesson →"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-2.5 rounded-xl bg-amber-300 text-slate-950 text-xs font-mono font-black"
          >
            Try again
          </button>
        )}
      </motion.div>
    </div>
  );
}

export type PracticeStep =
  | "intro"
  | "draw"
  | "regrow"
  | "weeded"
  | "bloom"
  | "shop"
  | "done";

const PRACTICE_COPY: Record<PracticeStep, { title: string; lines: string[]; button?: string }> = {
  intro: {
    title: "Practice Garden",
    lines: [
      "This is a real garden — everything works like in a Run.",
      `The strip above the board shows the garden, its target (${PRACTICE_GARDEN_TARGET.toLocaleString()} here), the green bar with your garden total, your ● lines left and 🌿 Swaps.`,
      "You have 4 lines. Each line's score adds to the bar. While you draw, (+N) on the bar previews the line.",
      `You start with ${PRACTICE_GARDEN_GEMS} 💎 so the Shop at the end is worth a look.`,
    ],
    button: "Got it — let me draw",
  },
  draw: {
    title: "Stroke 1",
    lines: ["Draw a long, safe line to the Exit and let go."],
  },
  regrow: {
    title: "The garden regrew",
    lines: [
      "Every tile your line used was replaced by a new tile from your Tile Bag. Your YOU tile and the Exit stayed put.",
      "Your Life, Shield and Power carried over — check the top row. Life doesn't refill, so don't spend it all on one line.",
      "Now try a Swap: tap 🌿 Swap, tap up to 3 tiles you'd like gone (big Thorns are good picks), then confirm. It doesn't use a line.",
    ],
  },
  weeded: {
    title: "Weeded!",
    lines: [
      "Those tiles were swapped for new ones from the bag.",
      `Now finish the garden: reach ${PRACTICE_GARDEN_TARGET.toLocaleString()} before your lines run out. Each unused line pays +1 💎.`,
      "Stuck? The ✨ Hint lights the next 3 steps of a good line.",
    ],
  },
  bloom: {
    title: "Your payout",
    lines: [
      "Payout = the garden's reward + 1 💎 per unused line + interest.",
      `Interest: +1 💎 for every ${RUN_INTEREST_STEP} 💎 you are holding, up to +${RUN_INTEREST_MAX}. Saving Gems pays.`,
      "Gems you walked over on the board were score, not money.",
    ],
  },
  shop: {
    title: "The Sanctuary Shop",
    lines: [
      `Relics are lasting powers for the whole Run (${MAX_COMMON_RELICS} slots). Boosts raise your stats for the whole Run.`,
      `Reroll draws 3 new offers: ${RUN_REROLL_BASE_COST} 💎, then 1 more each time.`,
      "The big decision: buy now, or save for interest and a better relic later. Press Continue / Skip Shop when you're done.",
    ],
  },
  done: {
    title: "You're ready! 🌸",
    lines: [
      `A real Run starts at Season 1 · Small Garden (target ${getRunGardenTarget(1, "SMALL").toLocaleString()}), then Big and Boss Gardens.`,
      "Every Season the targets rise and Thorns grow stronger. From Season 3 on you'll need good relics.",
      "Reopen the lessons or the full guide any time with ❓ Help.",
    ],
    button: "Start my Run",
  },
};

/** Coach card for the Practice Garden; floats above the board, Shop and payout */
export function PracticeCoach({
  step,
  collapsed,
  onToggleCollapsed,
  onButton,
  onQuit,
}: {
  step: PracticeStep;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onButton: () => void;
  onQuit: () => void;
}) {
  const copy = PRACTICE_COPY[step];
  const isModal = step === "done";
  // Over the payout and Shop screens the card sits at the top (their buttons
  // are at the bottom); on the board it sits at the bottom, below the controls
  const atTop = step === "bloom" || step === "shop";
  return (
    <div
      className={
        isModal
          ? "fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3"
          : `fixed ${atTop ? "top-2" : "bottom-2"} inset-x-0 z-[70] flex justify-center px-3 pointer-events-none`
      }
    >
      <motion.div
        key={step}
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto w-full max-w-[420px] rounded-xl border-2 border-emerald-300/70 bg-[#0D1F24] shadow-[0_0_24px_rgba(52,211,153,0.35)] p-2.5 text-white space-y-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-300">
            🎓 Practice · {copy.title}
          </div>
          {!isModal && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="h-8 text-[11px] font-mono font-bold px-2.5 rounded-md bg-white/10"
              >
                {collapsed ? "Show" : "Hide"}
              </button>
              <button
                type="button"
                onClick={onQuit}
                className="h-8 text-[11px] font-mono font-bold px-2.5 rounded-md bg-white/10"
              >
                Leave
              </button>
            </div>
          )}
        </div>
        {!collapsed && (
          <>
            {copy.lines.map((l, i) => (
              <p key={i} className="text-[12px] leading-snug text-emerald-50/90">
                {l}
              </p>
            ))}
            {copy.button && (
              <button
                type="button"
                onClick={onButton}
                className="w-full py-2 rounded-lg bg-emerald-300 text-slate-950 text-xs font-mono font-black"
              >
                {copy.button}
              </button>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

/** First-launch welcome and the ❓ Help menu */
export function RunHelpMenu({
  isOpen,
  isFirstVisit,
  lessonsProgress,
  totalLessons,
  onLessons,
  onResumeLessons,
  onGuide,
  onClose,
}: {
  isOpen: boolean;
  isFirstVisit: boolean;
  lessonsProgress: number;
  totalLessons: number;
  onLessons: () => void;
  onResumeLessons: () => void;
  onGuide: () => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  const canResume = lessonsProgress > 0 && lessonsProgress < totalLessons;
  const option =
    "w-full text-left rounded-xl border p-3 transition active:scale-[0.98] space-y-0.5";
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[400px] rounded-2xl p-4 space-y-2.5 text-white border border-emerald-300/40 bg-gradient-to-b from-[#16203A] to-[#0B1020]"
      >
        <div className="text-center space-y-0.5">
          <div className="text-3xl">🌸</div>
          <div className="text-lg font-black">
            {isFirstVisit ? "Welcome to Crystal Sanctuary" : "Help"}
          </div>
          <p className="text-[12px] text-indigo-100/80">
            {isFirstVisit
              ? "Draw lines, clear gardens, and see how far your Run can go. How would you like to start?"
              : "Learn by playing, or read every rule. Your Run will wait."}
          </p>
        </div>
        {canResume && (
          <button
            type="button"
            onClick={onResumeLessons}
            className={`${option} border-amber-300/70 bg-amber-400/10`}
          >
            <div className="text-sm font-black">▶ Continue lessons ({lessonsProgress + 1}/{totalLessons})</div>
            <div className="text-[11px] text-amber-100/80">Pick up where you left off.</div>
          </button>
        )}
        <button
          type="button"
          onClick={onLessons}
          className={`${option} border-emerald-300/70 bg-emerald-400/10`}
        >
          <div className="text-sm font-black">
            🎓 Learn by playing {isFirstVisit && <span className="text-emerald-300">(recommended)</span>}
          </div>
          <div className="text-[11px] text-emerald-100/80">
            {totalLessons} short hands-on lessons — one rule each, with a goal to meet — then a guided
            Practice Garden with lines, Swaps and the Shop. About 10 minutes.
          </div>
          {!isFirstVisit && (
            <div className="text-[11px] text-amber-200/80">This ends the Run you&apos;re playing.</div>
          )}
        </button>
        <button type="button" onClick={onGuide} className={`${option} border-white/15 bg-white/5`}>
          <div className="text-sm font-black">📖 Read the full guide</div>
          <div className="text-[11px] text-indigo-100/75">
            Every tile, rule, number, Boss twist and relic, explained with examples.
          </div>
        </button>
        <button type="button" onClick={onClose} className={`${option} border-white/10 bg-transparent`}>
          <div className="text-sm font-black">
            {isFirstVisit ? "⏭ Skip — start a Run" : "← Back to my Run"}
          </div>
        </button>
      </motion.div>
    </div>
  );
}
