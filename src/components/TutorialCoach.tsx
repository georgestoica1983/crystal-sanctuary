"use client";

import React from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { HeroClassId } from "@/types/game";
import { TutorialStageConfig } from "@/lib/tutorial";

interface TutorialCoachProps {
  currentStage: TutorialStageConfig;
  stageIndex: number; // 0 to 6
  totalStages: number; // 7
  activeHeroClassId: HeroClassId;
  isSanctuary?: boolean;
  onSelectStage: (stageIndex: number) => void;
  onSelectHeroClass?: (classId: HeroClassId) => void;
  onPlayGame: () => void;
  onResetStep?: () => void;
  onOpenGuide?: () => void;
}

const COMPANIONS_SHOWCASE: Array<{
  id: HeroClassId;
  icon: string;
  name: string;
  title: string;
  sanctuaryName: string;
  accentColor: string;
  perkSummary: string;
}> = [
  {
    id: "KNIGHT",
    icon: "🐱",
    name: "The Cozy Keeper",
    title: "Vanguard Knight",
    sanctuaryName: "The Cozy Keeper",
    accentColor: "#FBBF24",
    perkSummary: "🛡️ Starts every floor with +2 Bonus Shield!",
  },
  {
    id: "ROGUE",
    icon: "🦦",
    name: "The River Otter",
    title: "Pathfinder Rogue",
    sanctuaryName: "The River Otter",
    accentColor: "#38BDF8",
    perkSummary: "⚔️ Cross your own line 1x & +2 diagonal attack power!",
  },
  {
    id: "MAGE",
    icon: "🦊",
    name: "The Starlight Fox",
    title: "Mystic Mage",
    sanctuaryName: "The Starlight Fox",
    accentColor: "#C084FC",
    perkSummary: "✦ Warp 2 tiles in 1 leap & +2 extra healing from Berries!",
  },
  {
    id: "VAMPIRE",
    icon: "🦋",
    name: "The Bloom Sprite",
    title: "Nature's Alchemist",
    sanctuaryName: "The Bloom Sprite",
    accentColor: "#34D399",
    perkSummary: "💎 Every Gem collected heals +1 Magic/HP!",
  },
];

export default function TutorialCoach({
  currentStage,
  stageIndex,
  totalStages,
  activeHeroClassId,
  isSanctuary = true,
  onSelectStage,
  onSelectHeroClass,
  onPlayGame,
  onResetStep,
  onOpenGuide,
}: TutorialCoachProps) {
  const isLastStage = stageIndex === totalStages - 1;
  const isFirstStage = stageIndex === 0;
  const isShowcase = stageIndex === 6 && Boolean(onSelectHeroClass);
  const selectedShowcase = COMPANIONS_SHOWCASE.find(
    (c) => c.id === activeHeroClassId
  );

  // Choose companion avatar based on active stage
  const companionAvatars = ["🐱", "🌺", "💧", "☀️", "🍓", "🌵", "🌸"];
  const stageAvatar =
    stageIndex === 6
      ? COMPANIONS_SHOWCASE.find((c) => c.id === activeHeroClassId)?.icon ?? "🐱"
      : companionAvatars[stageIndex] ?? "🐱";

  return (
    <div className="w-full max-w-[430px] min-w-0 mx-auto select-none space-y-1.5">
      {/* Companion Speech Bubble Container */}
      <div
        className={`relative rounded-2xl p-2.5 sm:p-3.5 border shadow-xl transition-all duration-300 ${
          isSanctuary
            ? "bg-gradient-to-br from-[#231A3E]/95 via-[#1D1734]/95 to-[#151228]/95 border-amber-300/40 shadow-[0_0_28px_rgba(251,191,36,0.18)]"
            : "bg-gradient-to-br from-[#121428]/95 via-[#0F1020]/95 to-[#0A0B16]/95 border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.18)]"
        }`}
      >
        {/* Top Meta Header: Lesson Stepper & Actions */}
        <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-white/10">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-wider border shadow-sm ${
                isSanctuary
                  ? "bg-amber-400/20 border-amber-300/60 text-amber-200"
                  : "bg-cyan-500/20 border-cyan-400/60 text-cyan-200"
              }`}
            >
              {currentStage.stageNumber}/{totalStages}
            </span>
            <span className="min-w-0 text-[11px] font-sans font-bold text-white/90 truncate">
              {isSanctuary ? currentStage.sanctuaryTitle : currentStage.title}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                title="Garden Guide"
                aria-label="Garden Guide"
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-indigo-200 hover:text-white transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            )}
            {onResetStep && (
              <button
                type="button"
                onClick={onResetStep}
                title="Restart this lesson"
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-indigo-200 hover:text-white transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onPlayGame}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-[10px] font-bold uppercase whitespace-nowrap transition"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Skip</span>
            </button>
          </div>
        </div>

        {/* Speech Bubble Main Body with Animated Companion Avatar */}
        <div className="flex items-start gap-2.5 pt-2">
          {/* Animated Avatar / Companion Token */}
          <div
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 border shadow-lg transition-transform hover:scale-105 ${
              isSanctuary
                ? "bg-gradient-to-b from-amber-400/30 to-amber-900/40 border-amber-300/60 shadow-[0_0_16px_rgba(251,191,36,0.35)] animate-bounce"
                : "bg-gradient-to-b from-cyan-400/30 to-cyan-900/40 border-cyan-400/60 shadow-[0_0_16px_rgba(6,182,212,0.35)]"
            }`}
          >
            <span>{stageAvatar}</span>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white/50" />
            </span>
          </div>

          {/* Dialog Bubble Text */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-sans leading-snug ${
                isSanctuary ? "text-amber-50" : "text-cyan-50"
              }`}
            >
              {isShowcase
                ? "Each companion has a superpower! Tap one below to try it on this board, then draw to the Archway."
                : isSanctuary
                ? currentStage.sanctuaryCoachBanner
                : currentStage.coachBanner}
            </p>
          </div>
        </div>

        {/* Step 7 Interactive Class / Companion Showcase Switcher (one compact row) */}
        {isShowcase && (
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
            <div className="grid grid-cols-4 gap-1">
              {COMPANIONS_SHOWCASE.map((comp) => {
                const isSelected = activeHeroClassId === comp.id;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => onSelectHeroClass?.(comp.id)}
                    aria-pressed={isSelected}
                    className={`py-1 px-0.5 rounded-lg border flex flex-col items-center gap-0.5 transition-all duration-200 ${
                      isSelected
                        ? "bg-amber-400/25 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                        : "bg-[#111426]/80 border-white/10 hover:border-white/25 text-white/80"
                    }`}
                  >
                    <span className="text-base leading-none">{comp.icon}</span>
                    <span
                      className="text-[9px] font-mono font-bold leading-none whitespace-nowrap"
                      style={{ color: isSelected ? "#FDE68A" : comp.accentColor }}
                    >
                      {comp.name.replace(/^The /, "").split(" ").pop()}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedShowcase && (
              <p className="text-[10px] font-mono text-zinc-200 leading-snug text-center">
                <span className="font-bold" style={{ color: selectedShowcase.accentColor }}>
                  {selectedShowcase.name}:
                </span>{" "}
                {selectedShowcase.perkSummary}
              </p>
            )}
          </div>
        )}

        {/* Speech Bubble Tail pointing down towards the grid */}
        <div
          className={`absolute -bottom-2 left-8 w-4 h-4 rotate-45 border-r border-b ${
            isSanctuary
              ? "bg-[#151228] border-amber-300/40"
              : "bg-[#0A0B16] border-cyan-400/40"
          }`}
        />
      </div>

      {/* Lesson Navigation Bar */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5 min-w-0">
        <button
          type="button"
          disabled={isFirstStage}
          onClick={() => onSelectStage(stageIndex - 1)}
          className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-xl border font-mono text-[11px] font-bold flex items-center gap-1 transition active:scale-95 ${
            isFirstStage
              ? "opacity-30 border-white/10 text-zinc-500 cursor-not-allowed"
              : "bg-white/10 hover:bg-white/15 border-white/20 text-white"
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        {/* 7 Interactive Stage Dots */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-black/40 border border-white/10 min-w-0">
          {Array.from({ length: totalStages }, (_, i) => {
            const isCurrent = i === stageIndex;
            const isCompleted = i < stageIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectStage(i)}
                title={`Lesson ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isCurrent
                    ? "bg-amber-300 ring-2 ring-amber-300/60 scale-125"
                    : isCompleted
                    ? "bg-emerald-400"
                    : "bg-white/20 hover:bg-white/40"
                }`}
              />
            );
          })}
        </div>

        {isLastStage ? (
          <button
            type="button"
            onClick={onPlayGame}
            className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-slate-950 font-sans font-black text-[11px] uppercase tracking-wide shadow-[0_0_16px_rgba(251,191,36,0.5)] hover:brightness-105 transition active:scale-95 flex items-center gap-1"
          >
            <span>Play 🌸</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectStage(stageIndex + 1)}
            className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400/30 to-amber-500/30 hover:bg-amber-400/40 border border-amber-300/60 text-amber-200 font-mono text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
