"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, Lock, X, Crown, Heart } from "lucide-react";
import { SanctuaryCompanionId } from "@/types/game";

export interface CrystalFacet {
  points: string;
  color: string;
  highlight?: string;
}

export interface SanctuarySceneDefinition {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  unlockGems: number;
  prevUnlockGems: number;
  companionReward?: SanctuaryCompanionId;
  companionEmoji: string;
  companionName: string;
  skyGradient: [string, string];
  accentColor: string;
  facets: CrystalFacet[];
}

export interface CompanionDefinition {
  id: SanctuaryCompanionId;
  icon: string;
  name: string;
  title: string;
  unlockGems: number;
  sceneTitle: string;
  accentColor: string;
}

export const SANCTUARY_COMPANIONS: Record<
  SanctuaryCompanionId,
  CompanionDefinition
> = {
  CAT: {
    id: "CAT",
    icon: "🐱",
    name: "Cozy Cat",
    title: "Sunbeam Keeper",
    unlockGems: 0,
    sceneTitle: "Starter Companion",
    accentColor: "#FBBF24",
  },
  OTTER: {
    id: "OTTER",
    icon: "🦦",
    name: "River Otter",
    title: "Dewdrop Diver",
    unlockGems: 15,
    sceneTitle: "The Whispering Fountain",
    accentColor: "#38BDF8",
  },
  BUTTERFLY: {
    id: "BUTTERFLY",
    icon: "🦋",
    name: "Crystal Butterfly",
    title: "Prism Wing",
    unlockGems: 40,
    sceneTitle: "The Three-Cat Sunroom",
    accentColor: "#E879F9",
  },
  FOX: {
    id: "FOX",
    icon: "🦊",
    name: "Starlight Fox",
    title: "Astral Guide",
    unlockGems: 75,
    sceneTitle: "The Otter's Lantern Pond",
    accentColor: "#FB7185",
  },
};

export const SANCTUARY_COMPANION_LIST: CompanionDefinition[] = [
  SANCTUARY_COMPANIONS.CAT,
  SANCTUARY_COMPANIONS.OTTER,
  SANCTUARY_COMPANIONS.BUTTERFLY,
  SANCTUARY_COMPANIONS.FOX,
];

export const SANCTUARY_SCENES: SanctuarySceneDefinition[] = [
  {
    id: "WHISPERING_FOUNTAIN",
    index: 0,
    title: "The Whispering Fountain",
    subtitle: "Sapphire cascades awaken the sleeping courtyard",
    unlockGems: 15,
    prevUnlockGems: 0,
    companionReward: "OTTER",
    companionEmoji: "🦦",
    companionName: "River Otter",
    skyGradient: ["#1A2942", "#0F172A"],
    accentColor: "#38BDF8",
    facets: [
      { points: "20,140 80,140 50,110", color: "#0284C7" },
      { points: "80,140 160,140 120,108", color: "#0EA5E9" },
      { points: "160,140 220,140 190,110", color: "#0284C7" },
      { points: "50,110 120,108 85,82", color: "#38BDF8" },
      { points: "120,108 190,110 155,82", color: "#38BDF8" },
      { points: "85,82 155,82 120,54", color: "#7DD3FC" },
      { points: "120,54 100,26 140,26", color: "#BAE6FD" },
      { points: "70,60 100,26 120,54", color: "#22D3EE" },
      { points: "170,60 140,26 120,54", color: "#22D3EE" },
      { points: "35,88 70,60 85,82", color: "#10B981" },
      { points: "205,88 170,60 155,82", color: "#10B981" },
      { points: "20,140 50,110 35,88", color: "#34D399" },
      { points: "220,140 190,110 205,88", color: "#34D399" },
      { points: "50,110 85,82 120,108", color: "#67E8F9" },
      { points: "190,110 155,82 120,108", color: "#67E8F9" },
      { points: "100,26 120,10 140,26", color: "#FDE047" },
    ],
  },
  {
    id: "THREE_CAT_SUNROOM",
    index: 1,
    title: "The Three-Cat Sunroom",
    subtitle: "Warm amber sunbeams pour through stained glass arches",
    unlockGems: 40,
    prevUnlockGems: 15,
    companionReward: "BUTTERFLY",
    companionEmoji: "🦋",
    companionName: "Crystal Butterfly",
    skyGradient: ["#3B1D38", "#1F1630"],
    accentColor: "#FBBF24",
    facets: [
      { points: "20,142 90,142 60,105", color: "#D97706" },
      { points: "90,142 150,142 120,102", color: "#F59E0B" },
      { points: "150,142 220,142 180,105", color: "#D97706" },
      { points: "60,105 120,102 90,68", color: "#FBBF24" },
      { points: "120,102 180,105 150,68", color: "#FBBF24" },
      { points: "90,68 150,68 120,34", color: "#FDE047" },
      { points: "30,98 60,105 52,64", color: "#F43F5E" },
      { points: "210,98 180,105 188,64", color: "#F43F5E" },
      { points: "52,64 90,68 75,32", color: "#FB7185" },
      { points: "188,64 150,68 165,32", color: "#FB7185" },
      { points: "75,32 120,34 98,14", color: "#FDBA74" },
      { points: "165,32 120,34 142,14", color: "#FDBA74" },
      { points: "98,14 142,14 120,34", color: "#FEF08A" },
      { points: "60,105 90,142 120,102", color: "#FB923C" },
      { points: "180,105 150,142 120,102", color: "#FB923C" },
      { points: "90,68 120,102 150,68", color: "#FDE68A" },
    ],
  },
  {
    id: "OTTER_LANTERN_POND",
    index: 2,
    title: "The Otter's Lantern Pond",
    subtitle: "Floating lotus lanterns shimmer across emerald lily pads",
    unlockGems: 75,
    prevUnlockGems: 40,
    companionReward: "FOX",
    companionEmoji: "🦊",
    companionName: "Starlight Fox",
    skyGradient: ["#0F292E", "#091921"],
    accentColor: "#34D399",
    facets: [
      { points: "15,140 85,140 55,112", color: "#059669" },
      { points: "85,140 155,140 120,112", color: "#10B981" },
      { points: "155,140 225,140 185,112", color: "#059669" },
      { points: "55,112 120,112 88,84", color: "#34D399" },
      { points: "120,112 185,112 152,84", color: "#34D399" },
      { points: "88,84 152,84 120,52", color: "#6EE7B7" },
      { points: "40,80 88,84 66,48", color: "#2DD4BF" },
      { points: "200,80 152,84 174,48", color: "#2DD4BF" },
      { points: "66,48 120,52 95,22", color: "#F472B6" },
      { points: "174,48 120,52 145,22", color: "#F472B6" },
      { points: "95,22 145,22 120,52", color: "#FBCFE8" },
      { points: "95,22 120,8 145,22", color: "#FDE047" },
      { points: "15,140 55,112 40,80", color: "#14B8A6" },
      { points: "225,140 185,112 200,80", color: "#14B8A6" },
      { points: "55,112 85,140 120,112", color: "#0D9488" },
      { points: "185,112 155,140 120,112", color: "#0D9488" },
    ],
  },
  {
    id: "STARLIGHT_GREENHOUSE",
    index: 3,
    title: "The Starlight Greenhouse",
    subtitle: "Celestial orchids bloom beneath a glass dome of constellations",
    unlockGems: 120,
    prevUnlockGems: 75,
    companionEmoji: "🦋",
    companionName: "Astral Bloom",
    skyGradient: ["#261844", "#120D28"],
    accentColor: "#C084FC",
    facets: [
      { points: "24,142 88,142 58,106", color: "#7C3AED" },
      { points: "88,142 152,142 120,106", color: "#8B5CF6" },
      { points: "152,142 216,142 182,106", color: "#7C3AED" },
      { points: "58,106 120,106 90,72", color: "#A855F7" },
      { points: "120,106 182,106 150,72", color: "#A855F7" },
      { points: "90,72 150,72 120,38", color: "#C084FC" },
      { points: "36,76 90,72 62,40", color: "#38BDF8" },
      { points: "204,76 150,72 178,40", color: "#38BDF8" },
      { points: "62,40 120,38 92,16", color: "#E879F9" },
      { points: "178,40 120,38 148,16", color: "#E879F9" },
      { points: "92,16 148,16 120,38", color: "#F5D0FE" },
      { points: "24,142 58,106 36,76", color: "#34D399" },
      { points: "216,142 182,106 204,76", color: "#34D399" },
      { points: "58,106 88,142 120,106", color: "#6366F1" },
      { points: "182,106 152,142 120,106", color: "#6366F1" },
      { points: "90,72 120,106 150,72", color: "#FDE047" },
    ],
  },
  {
    id: "SAKURA_TEA_BRIDGE",
    index: 4,
    title: "The Sakura Tea Bridge",
    subtitle: "Rose-quartz petals drift over a crimson moon-bridge",
    unlockGems: 180,
    prevUnlockGems: 120,
    companionEmoji: "🦊",
    companionName: "Sakura Kitsune",
    skyGradient: ["#3D1830", "#1E1024"],
    accentColor: "#FB7185",
    facets: [
      { points: "18,136 86,136 54,104", color: "#E11D48" },
      { points: "86,136 154,136 120,98", color: "#F43F5E" },
      { points: "154,136 222,136 186,104", color: "#E11D48" },
      { points: "54,104 120,98 88,68", color: "#FB7185" },
      { points: "120,98 186,104 152,68", color: "#FB7185" },
      { points: "88,68 152,68 120,36", color: "#FDA4AF" },
      { points: "30,72 88,68 58,34", color: "#F472B6" },
      { points: "210,72 152,68 182,34", color: "#F472B6" },
      { points: "58,34 120,36 90,14", color: "#F9A8D4" },
      { points: "182,34 120,36 150,14", color: "#F9A8D4" },
      { points: "90,14 150,14 120,36", color: "#FCE7F3" },
      { points: "18,136 54,104 30,72", color: "#FBBF24" },
      { points: "222,136 186,104 210,72", color: "#FBBF24" },
      { points: "54,104 86,136 120,98", color: "#38BDF8" },
      { points: "186,104 154,136 120,98", color: "#38BDF8" },
      { points: "88,68 120,98 152,68", color: "#FEF08A" },
    ],
  },
  {
    id: "CRYSTAL_OBSERVATORY",
    index: 5,
    title: "The Crystal Observatory",
    subtitle: "Prismatic astrolabes align the grand aurora dome",
    unlockGems: 250,
    prevUnlockGems: 180,
    companionEmoji: "👑",
    companionName: "Grand Sanctuary Keeper",
    skyGradient: ["#1B264F", "#0D132A"],
    accentColor: "#FDE047",
    facets: [
      { points: "20,142 86,142 54,108", color: "#4F46E5" },
      { points: "86,142 154,142 120,108", color: "#6366F1" },
      { points: "154,142 220,142 186,108", color: "#4F46E5" },
      { points: "54,108 120,108 86,72", color: "#06B6D4" },
      { points: "120,108 186,108 154,72", color: "#06B6D4" },
      { points: "86,72 154,72 120,38", color: "#22D3EE" },
      { points: "34,74 86,72 60,36", color: "#A855F7" },
      { points: "206,74 154,72 180,36", color: "#A855F7" },
      { points: "60,36 120,38 92,12", color: "#F59E0B" },
      { points: "180,36 120,38 148,12", color: "#F59E0B" },
      { points: "92,12 148,12 120,38", color: "#FDE047" },
      { points: "20,142 54,108 34,74", color: "#EC4899" },
      { points: "220,142 186,108 206,74", color: "#EC4899" },
      { points: "54,108 86,142 120,108", color: "#10B981" },
      { points: "186,108 154,142 120,108", color: "#10B981" },
      { points: "86,72 120,108 154,72", color: "#FEF9C3" },
    ],
  },
];

export function getActiveSanctuarySceneProgress(totalGems: number) {
  const safeGems = Math.max(0, totalGems || 0);
  const activeScene =
    SANCTUARY_SCENES.find((s) => safeGems < s.unlockGems) ??
    SANCTUARY_SCENES[SANCTUARY_SCENES.length - 1];

  const completedCount = SANCTUARY_SCENES.filter(
    (s) => safeGems >= s.unlockGems
  ).length;
  const allCompleted = completedCount === SANCTUARY_SCENES.length;

  const span = Math.max(1, activeScene.unlockGems - activeScene.prevUnlockGems);
  const earnedInSpan = Math.max(
    0,
    Math.min(span, safeGems - activeScene.prevUnlockGems)
  );
  const progressRatio = allCompleted ? 1 : earnedInSpan / span;
  const filledFacetsCount = allCompleted
    ? activeScene.facets.length
    : Math.max(
        safeGems > activeScene.prevUnlockGems ? 1 : 0,
        Math.floor(progressRatio * activeScene.facets.length)
      );

  return {
    activeScene,
    totalGems: safeGems,
    displayCurrentGems: Math.min(safeGems, activeScene.unlockGems),
    displayTargetGems: activeScene.unlockGems,
    progressRatio,
    filledFacetsCount,
    completedCount,
    allCompleted,
  };
}

/**
 * Stained-Glass / Crystal Mosaic SVG Canvas (Colorever-inspired)
 */
export function SanctuaryGemArtCanvas({
  scene,
  filledFacetsCount,
  compact = false,
}: {
  scene: SanctuarySceneDefinition;
  filledFacetsCount: number;
  compact?: boolean;
}) {
  const totalFacets = scene.facets.length;
  const isComplete = filledFacetsCount >= totalFacets;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${
        isComplete
          ? "border-amber-300/80 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
          : "border-white/20"
      }`}
      style={{
        background: `radial-gradient(circle at 50% 20%, ${scene.skyGradient[0]}, ${scene.skyGradient[1]})`,
      }}
    >
      <svg
        viewBox="0 0 240 155"
        className="w-full h-full block select-none"
      >
        <defs>
          <filter id={`gemGlow-${scene.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Starlight Dots */}
        <circle cx="28" cy="24" r="1.5" fill="#FEF08A" opacity="0.7" />
        <circle cx="212" cy="20" r="1.8" fill="#FEF08A" opacity="0.8" />
        <circle cx="48" cy="14" r="1" fill="#FFFFFF" opacity="0.5" />
        <circle cx="192" cy="30" r="1.2" fill="#FFFFFF" opacity="0.6" />

        {scene.facets.map((facet, idx) => {
          const isFilled = idx < filledFacetsCount;
          // Calculate approximate centroid of the triangle/polygon for the paint-by-number label
          const coords = facet.points
            .trim()
            .split(/\s+/)
            .map((pair) => pair.split(",").map(Number));
          const cx =
            coords.reduce((sum, p) => sum + (p[0] || 0), 0) / coords.length;
          const cy =
            coords.reduce((sum, p) => sum + (p[1] || 0), 0) / coords.length;

          return (
            <g key={idx}>
              <polygon
                points={facet.points}
                fill={isFilled ? facet.color : "rgba(15, 23, 42, 0.65)"}
                fillOpacity={isFilled ? 0.92 : 0.65}
                stroke={isFilled ? "#FEF3C7" : "rgba(148, 163, 184, 0.35)"}
                strokeWidth={compact ? "1.4" : "1.8"}
                strokeLinejoin="round"
                filter={isFilled && !compact ? `url(#gemGlow-${scene.id})` : undefined}
                className="transition-all duration-500"
              />
              {!isFilled && !compact && (
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  className="fill-slate-400/75 font-mono text-[8px] font-bold pointer-events-none"
                >
                  {idx + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {!compact && isComplete && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400/95 text-slate-950 font-mono text-[10px] font-black uppercase shadow-lg flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>100% Restored</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Sanctuary Progress Bar shown directly above the 5x5 grid
 */
export function SanctuaryProgressBar({
  totalGems,
  companionId,
  onOpenSanctuaryModal,
  onSelectCompanion,
}: {
  totalGems: number;
  companionId: SanctuaryCompanionId;
  onOpenSanctuaryModal: () => void;
  onSelectCompanion: (id: SanctuaryCompanionId) => void;
}) {
  const progress = getActiveSanctuarySceneProgress(totalGems);
  const { activeScene, displayCurrentGems, displayTargetGems, filledFacetsCount, allCompleted } =
    progress;

  return (
    <div className="w-full max-w-[430px] mx-auto bg-gradient-to-r from-[#1E2642]/95 via-[#271F4A]/95 to-[#1E2642]/95 backdrop-blur-md border border-amber-300/35 rounded-2xl p-2 shadow-[0_0_24px_rgba(251,191,36,0.14)] flex items-center justify-between gap-2.5 select-none">
      {/* Clickable Mini Stained-Glass Thumbnail + Progress */}
      <button
        type="button"
        onClick={onOpenSanctuaryModal}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
      >
        <div className="w-14 h-10 shrink-0 group-hover:scale-105 transition-transform">
          <SanctuaryGemArtCanvas
            scene={activeScene}
            filledFacetsCount={filledFacetsCount}
            compact
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 text-[11px] font-sans font-extrabold text-amber-100 truncate">
            <span className="truncate">
              💎 {displayCurrentGems} / {displayTargetGems} Gems to complete &ldquo;
              {activeScene.title}&rdquo;
            </span>
          </div>

          {/* Shimmering Gem Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[#0F1424] border border-amber-200/25 overflow-hidden mt-1 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300 transition-all duration-500"
              style={{
                width: `${Math.max(8, Math.round(progress.progressRatio * 100))}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-amber-200/80 mt-0.5">
            <span>
              {allCompleted
                ? "🌸 All 6 Sanctuary Mosaics Complete!"
                : `${filledFacetsCount}/${activeScene.facets.length} Crystal Facets Lit`}
            </span>
            <span className="text-cyan-300 font-bold group-hover:underline">
              Open Gallery 🌸 →
            </span>
          </div>
        </div>
      </button>

      {/* Quick Companion Switcher Pill */}
      <div className="flex items-center gap-1 shrink-0 bg-[#121629]/90 border border-white/15 rounded-xl p-1">
        {SANCTUARY_COMPANION_LIST.map((comp) => {
          const unlocked = totalGems >= comp.unlockGems;
          const active = companionId === comp.id;
          return (
            <button
              key={comp.id}
              type="button"
              disabled={!unlocked}
              onClick={() => onSelectCompanion(comp.id)}
              title={
                unlocked
                  ? `${comp.name} (${comp.title})`
                  : `Unlocks at ${comp.unlockGems} Gems`
              }
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition ${
                active
                  ? "bg-amber-400/25 border border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.45)] scale-105"
                  : unlocked
                  ? "hover:bg-white/10 opacity-85 hover:opacity-100"
                  : "opacity-30 cursor-not-allowed grayscale"
              }`}
            >
              {comp.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Full Sanctuary Gem Art Gallery & Companion Picker Modal
 */
export function SanctuaryModal({
  isOpen,
  totalGems,
  selectedCompanionId,
  onSelectCompanion,
  onClose,
}: {
  isOpen: boolean;
  totalGems: number;
  selectedCompanionId: SanctuaryCompanionId;
  onSelectCompanion: (companionId: SanctuaryCompanionId) => void;
  onClose: () => void;
}) {
  const progress = getActiveSanctuarySceneProgress(totalGems);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(
    progress.activeScene.index
  );

  if (!isOpen) return null;

  const scene =
    SANCTUARY_SCENES[selectedSceneIndex] ?? progress.activeScene;
  const isSceneUnlocked = totalGems >= scene.unlockGems;
  const sceneSpan = Math.max(1, scene.unlockGems - scene.prevUnlockGems);
  const sceneEarned = Math.max(
    0,
    Math.min(sceneSpan, totalGems - scene.prevUnlockGems)
  );
  const sceneFilledFacets = isSceneUnlocked
    ? scene.facets.length
    : Math.max(
        totalGems > scene.prevUnlockGems ? 1 : 0,
        Math.floor((sceneEarned / sceneSpan) * scene.facets.length)
      );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-[440px] bg-gradient-to-b from-[#1E2746] via-[#1B1838] to-[#111526] border border-amber-300/40 rounded-3xl p-4 text-white shadow-[0_0_50px_rgba(251,191,36,0.2)] space-y-3.5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-amber-400/20 border border-amber-300/50 text-amber-200">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Crystal Sanctuary Gallery
            </span>
            <h2 className="text-lg font-sans font-black tracking-tight text-white mt-1">
              Stained-Glass Gem Mosaics
            </h2>
            <p className="text-xs text-amber-100/80">
              Collect 💎 Prismatic Gems on any floor to fill crystal facets and
              unlock adorable Sanctuary Companions!
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Gems & Restored Counter */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#121629]/90 border border-amber-300/30 rounded-2xl px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-sans font-bold text-amber-100/80">
              Sanctuary Gems
            </span>
            <span className="text-sm font-mono font-black text-amber-300">
              💎 {totalGems}
            </span>
          </div>
          <div className="bg-[#121629]/90 border border-emerald-400/30 rounded-2xl px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-sans font-bold text-emerald-100/80">
              Scenes Restored
            </span>
            <span className="text-sm font-mono font-black text-emerald-300">
              🌸 {progress.completedCount} / 6
            </span>
          </div>
        </div>

        {/* Featured Gem Art Canvas */}
        <div className="bg-[#111528]/90 border border-white/15 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-sans font-extrabold text-amber-200 flex items-center gap-1.5">
                <span>
                  Scene {scene.index + 1}: {scene.title}
                </span>
                {isSceneUnlocked && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <div className="text-[11px] text-indigo-200/75">
                {scene.subtitle}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-300/40 font-mono text-[10px] font-bold text-amber-200">
              💎 {Math.min(totalGems, scene.unlockGems)} / {scene.unlockGems}
            </span>
          </div>

          <div className="h-40">
            <SanctuaryGemArtCanvas
              scene={scene}
              filledFacetsCount={sceneFilledFacets}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-amber-100/80 pt-0.5">
            <span>
              {sceneFilledFacets} / {scene.facets.length} Crystal Facets Painted
            </span>
            <span>
              Reward: {scene.companionEmoji} {scene.companionName}
            </span>
          </div>
        </div>

        {/* 6 Scene Selector Grid */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-200/80">
            6 Collectible Gem Art Scenes
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SANCTUARY_SCENES.map((item) => {
              const unlocked = totalGems >= item.unlockGems;
              const isCurrentSelected = item.index === scene.index;
              const itemSpan = Math.max(
                1,
                item.unlockGems - item.prevUnlockGems
              );
              const itemEarned = Math.max(
                0,
                Math.min(itemSpan, totalGems - item.prevUnlockGems)
              );
              const itemFacets = unlocked
                ? item.facets.length
                : Math.max(
                    totalGems > item.prevUnlockGems ? 1 : 0,
                    Math.floor((itemEarned / itemSpan) * item.facets.length)
                  );

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSceneIndex(item.index)}
                  className={`p-2 rounded-xl border text-left transition flex flex-col gap-1 ${
                    isCurrentSelected
                      ? "bg-amber-400/15 border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.3)]"
                      : unlocked
                      ? "bg-[#141A30] border-emerald-400/40 hover:border-amber-300/60"
                      : "bg-[#0F1324] border-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="h-12 w-full">
                    <SanctuaryGemArtCanvas
                      scene={item}
                      filledFacetsCount={itemFacets}
                      compact
                    />
                  </div>
                  <div className="text-[10px] font-sans font-bold text-white truncate">
                    {item.index + 1}. {item.title.replace(/^The\s+/, "")}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span
                      className={
                        unlocked ? "text-emerald-300 font-bold" : "text-amber-200/75"
                      }
                    >
                      {unlocked ? "✓ Complete" : `${item.unlockGems} 💎`}
                    </span>
                    <span>{item.companionEmoji}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Companion Selector */}
        <div className="space-y-1.5 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-200/80 flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
              Equip Sanctuary Companion (Hero Tile)
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {SANCTUARY_COMPANION_LIST.map((comp) => {
              const unlocked = totalGems >= comp.unlockGems;
              const selected = selectedCompanionId === comp.id;
              return (
                <button
                  key={comp.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectCompanion(comp.id)}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-0.5 ${
                    selected
                      ? "bg-amber-400/20 border-amber-300 text-white shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                      : unlocked
                      ? "bg-[#141A30] border-white/15 text-amber-100 hover:border-amber-300/50"
                      : "bg-[#0D1020] border-white/5 text-slate-500 opacity-55 cursor-not-allowed"
                  }`}
                >
                  <span className="text-xl">{comp.icon}</span>
                  <span className="text-[10px] font-sans font-bold truncate max-w-full">
                    {comp.name.split(" ").pop()}
                  </span>
                  <span className="text-[9px] font-mono text-amber-300/80">
                    {unlocked ? (selected ? "Equipped" : "Ready") : `${comp.unlockGems}💎`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-slate-950 font-sans font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-105 transition"
        >
          Back to Crystal Garden
        </button>
      </div>
    </div>
  );
}
