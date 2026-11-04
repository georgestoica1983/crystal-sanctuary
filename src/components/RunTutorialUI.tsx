"use client";

import { useBackClose } from "@/lib/backClose";
import { DoneButton } from "@/components/SheetBits";
import { ArrowRight, BookOpen, Eye, GraduationCap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LessonGoalStatus, PRACTICE_GARDEN_GEMS, PRACTICE_GARDEN_TARGET, RUN_LESSONS, RunLesson } from "@/lib/runLessons";

/** Seedling Season: every lesson is a level, and the Practice Garden is the last one */
export const SEEDLING_LEVELS = RUN_LESSONS.length + 1;
import {
  getRunGardenTarget,
  RUN_INTEREST_MAX,
  RUN_INTEREST_STEP,
  RUN_REROLL_BASE_COST,
  MAX_COMMON_RELICS,
} from "@/lib/engine";
import { miscArt, tileArt } from "@/lib/art";
import { artify } from "@/components/ArtText";

/** The lesson's goal, live while a line is drawn */
export function RunLessonGoal({ lesson, status }: { lesson: RunLesson; status: LessonGoalStatus | null }) {
  return artify(
    <div
      className={`rounded-lg px-2.5 py-1.5 border text-[12px] flex items-center justify-between gap-2 ${
        status?.ok
          ? "border-teal-300 bg-teal-300/15 text-teal-50"
          : "border-white/[0.1] bg-white/[0.03] text-white/70"
      }`}
    >
      <span className="font-semibold">Goal: {lesson.goalLabel}</span>
      <span className="tabular-nums text-[12px] text-right">
        {status ? (status.ok ? "✓ let go!" : status.detail) : ""}
      </span>
    </div>
  );
}

/**
 * The lesson inside the top card (where a Run shows its bed): the goal and
 * the step dots, then what to do. While a line is drawn the live meter covers
 * the card as it does in a Run, so the board keeps the same size.
 */
export function RunLessonCoach({ lesson, index, total }: { lesson: RunLesson; index: number; total: number }) {
  return artify(
    // As tall as a Run's bed rows (Season and score bar), so the board matches
    <div className="min-h-[56px] min-[600px]:min-h-[59.5px] px-1 pt-1 pb-0.5 space-y-1">
      {/* On a short screen the level row steps aside, so two lines of instruction still fit */}
      <div className="flex items-center justify-between gap-2 [@media(max-height:700px)]:hidden">
        <div className="min-w-0 text-[12px] font-semibold text-white/60 truncate">
          <span className="text-lime-200/85">🪴 Seedling Season</span> · Level {index + 1} of {total}
        </div>
      </div>
      <div className="text-[16px] leading-snug font-extrabold text-white">{lesson.steps[0]}</div>
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
    // Same height as a Run's buttons, so the board keeps its size
    "h-11 [@media(min-height:800px)]:h-14 px-1.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-[12px] font-semibold text-white/85 active:scale-95 transition disabled:opacity-40 whitespace-nowrap";
  return artify(
    <div className="ui-zoom w-full max-w-game grid grid-cols-4 gap-1.5">
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
            <Eye className="w-4 h-4 shrink-0 mr-1 inline-block align-[-3px]" aria-hidden="true" />Show<span className="hidden min-[360px]:inline"> me</span>
          </>
        )}
      </button>
      <button type="button" disabled={disabled} onClick={onRestart} className={btn}>
        Restart
      </button>
      <button type="button" onClick={onLeave} className={btn}>
        Skip
      </button>
    </div>
  );
}

export interface LessonResultInfo {
  ok: boolean;
  text: string;
  scoreLine: string;
  isLast: boolean;
  /** Seedling Season level just played (1-based) */
  level: number;
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
  return artify(
    <div className="ui-zoom fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-3">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-[400px] rounded-2xl p-4 space-y-2.5 text-white border-2 ${
          info.ok
            ? "border-emerald-300/70 bg-gradient-to-b from-[#0E2622] to-[#0D1510]"
            : "border-amber-300/70 bg-gradient-to-b from-[#2A1F0E] to-[#140F0A]"
        }`}
      >
        {info.ok ? (
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={miscArt("level-cleared")} alt="" aria-hidden="true" draggable={false} className="h-12 w-12 shrink-0 object-contain" />
            <div className="text-xl font-black">Level {info.level} cleared!</div>
          </div>
        ) : (
          <div className="text-xl font-black">Not quite</div>
        )}
        <p className="text-[14px] leading-snug text-white/90">{info.text}</p>
        {info.ok ? (
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs tabular-nums font-bold"
            >
              Again
            </button>
            <button
              type="button"
              onClick={onNext}
              className="py-2.5 rounded-xl bg-emerald-300 text-slate-950 text-xs tabular-nums font-black flex items-center justify-center gap-1.5"
            >
              {info.isLast ? `Level ${SEEDLING_LEVELS}: Practice garden` : `Level ${info.level + 1}`}
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-2.5 rounded-xl bg-amber-300 text-slate-950 text-xs tabular-nums font-black"
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
    title: `Level ${SEEDLING_LEVELS}`,
    lines: [
      `Reach ${PRACTICE_GARDEN_TARGET.toLocaleString()} points in 4 lines.`,
      "The bar at the top fills as you score.",
      "❤️ Life comes back only when you clear a Garden Bed.",
    ],
    button: "Let's go",
  },
  draw: {
    title: "Line 1",
    lines: ["Draw a long line to the Exit."],
  },
  regrow: {
    title: "New tiles",
    lines: [
      "Used tiles were replaced. ❤️ Life comes back only when you clear the Garden Bed.",
      "Try 🔄 Swap: tap up to 3 tiles to change them.",
    ],
  },
  weeded: {
    title: "Swapped",
    lines: [`Now reach ${PRACTICE_GARDEN_TARGET.toLocaleString()} before your lines run out.`],
  },
  bloom: {
    title: "Seeds earned",
    lines: ["Clear Garden Beds to earn 🌱 Seeds. Finish early or save them to earn more."],
  },
  shop: {
    title: "Shop",
    lines: ["Relics are lasting powers. Buy one, or save 🌱 for later."],
  },
  done: {
    title: "Seedling Season cleared!",
    lines: ["You know every tile. Season 1 is next, and each Season gets harder. Help is in the ☰ menu."],
    button: "Start my Run",
  },
};

/** Steps shown as a card (the intro, over the payout, the Shop, the close) */
export const isPracticeOverlayStep = (step: PracticeStep) =>
  step === "intro" || step === "bloom" || step === "shop" || step === "done";

/** While playing, the Practice Garden speaks in one line above the board (where a Run's hint goes), so the board keeps its size */
export const PRACTICE_HINTS: Partial<Record<PracticeStep, string>> = {
  draw: "Line 1: draw a long line to the Exit.",
  regrow: "New tiles grew in. Try 🔄 Swap below.",
  weeded: `Now reach ${PRACTICE_GARDEN_TARGET.toLocaleString()} before your lines run out.`,
};

/**
 * Coach card for the Practice Garden. During play it sits in the page flow
 * under the board controls, so it never covers them; over the payout and
 * Shop it floats at the top.
 */
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
  const isModal = step === "done" || step === "intro";
  // Over the payout and Shop screens the card sits at the top (their buttons
  // are at the bottom); on the board it is part of the page, below the controls
  const atTop = step === "bloom" || step === "shop";
  return artify(
    <div
      className={
        isModal
          ? "ui-zoom fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3"
          : atTop
          ? "fixed top-2 inset-x-0 z-[70] flex justify-center px-3 pointer-events-none"
          : "w-full max-w-[430px] min-w-0 flex justify-center"
      }
    >
      <motion.div
        key={step}
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto w-full max-w-[430px] rounded-xl border-2 border-emerald-300/70 bg-[#0D1F24] shadow-[0_0_24px_rgba(52,211,153,0.35)] p-2.5 text-white space-y-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] font-bold text-emerald-300">
            <GraduationCap className="w-4 h-4 mr-1 inline-block align-[-3px]" aria-hidden="true" />Practice · {copy.title}
          </div>
          {!isModal && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="h-8 text-[12px] tabular-nums font-bold px-2.5 rounded-md bg-white/10"
              >
                {collapsed ? "Show" : "Hide"}
              </button>
              <button
                type="button"
                onClick={onQuit}
                className="h-8 text-[12px] tabular-nums font-bold px-2.5 rounded-md bg-white/10"
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
                className="w-full py-2 rounded-lg bg-emerald-300 text-slate-950 text-xs tabular-nums font-black"
              >
                {copy.button}
              </button>
            )}
            {step === "intro" && (
              <button type="button" onClick={onQuit} className="w-full py-1.5 text-[12px] font-semibold text-white/55">
                Leave the practice
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
  useBackClose(isOpen, onClose);
  if (!isOpen) return null;
  const canResume = lessonsProgress > 0 && lessonsProgress < totalLessons;
  const option =
    "w-full text-left rounded-xl border p-3 transition active:scale-[0.98] space-y-0.5";
  return artify(
    <div className="ui-zoom fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fit-card w-full max-w-[400px] rounded-2xl p-4 space-y-2.5 text-white border border-emerald-300/40 bg-gradient-to-b from-[#1F3125] to-[#111A14]"
      >
        <div className="text-center space-y-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tileArt("ENEMY", { bloomed: true }) ?? ""} alt="" aria-hidden="true" draggable={false} className="mx-auto h-14 w-14 object-contain" />
          <div className="text-[20px] font-display font-semibold">
            {isFirstVisit ? "Welcome to Bloomline" : "Help"}
          </div>
          <p className="text-[12px] text-indigo-100/80 [text-wrap:balance]">
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
            <div className="text-[12px] text-amber-100/80">Pick up where you left off.</div>
          </button>
        )}
        <button
          type="button"
          onClick={onLessons}
          className={`${option} border-emerald-300/70 bg-emerald-400/10`}
        >
          <div className="text-sm font-black">
            <GraduationCap className="w-4 h-4 mr-1 inline-block align-[-3px]" aria-hidden="true" />Learn by playing {isFirstVisit && <span className="text-emerald-300">(recommended)</span>}
          </div>
          <div className="text-[12px] text-emerald-100/80">
            Seedling Season: {totalLessons} short levels and a practice garden. About{"\u00a0"}4{"\u00a0"}minutes.
          </div>
          {!isFirstVisit && (
            <div className="text-[12px] text-amber-200/80">This ends the Run you&apos;re playing.</div>
          )}
        </button>
        <button type="button" onClick={onGuide} className={`${option} border-white/15 bg-white/5`}>
          <div className="text-sm font-black">
            <BookOpen className="w-4 h-4 mr-1 inline-block align-[-3px]" aria-hidden="true" />Rules at a glance
          </div>
          <div className="text-[12px] text-indigo-100/75">Every tile, rule and relic in short.</div>
        </button>
        <DoneButton onClick={onClose} label={isFirstVisit ? "Skip and start a Run" : "Back to my Run"} />
      </motion.div>
    </div>
  );
}
