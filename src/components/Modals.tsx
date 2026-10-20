"use client";

import React, { useState } from "react";
import {
  Calendar,
  Check,
  Copy,
  Crown,
  Layers,
  Lock,
  Palette,
  Play,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  Trophy,
  Unlock,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  CosmeticPreferences,
  DailyPlayerStats,
  DungeonTheme,
  FloorHistoryRecord,
  FloorStarBreakdown,
  HeroClassId,
  HeroEmblemId,
  HeroStats,
  LeaderboardEntry,
  ModifierId,
  MonetizationState,
  RelicDefinition,
  RelicId,
  TrailSkinId,
} from "@/types/game";
import {
  generateShareCardAscii,
  getParPercent,
  getTodayDateKey,
  HERO_CLASS_LIST,
  HERO_CLASS_REGISTRY,
  HERO_EMBLEMS,
  MODIFIER_LIST,
  MODIFIER_REGISTRY,
  RELIC_REGISTRY,
  TRAIL_SKINS,
} from "@/lib/engine";
import { DEV_SIMULATOR_ENABLED, hasExpansionAccess } from "@/lib/supabase";
import { getDungeonDisplay, getRelicDisplay } from "@/lib/sanctuaryCopy";
import { getThemeAwareModifierInfo } from "@/components/HUD";
import { SanctuaryProgressBar } from "@/components/SanctuaryModal";
import EntityIcon from "@/components/EntityIcon";

interface RelicDraftModalProps {
  isOpen: boolean;
  clearedFloorNumber: number;
  totalFloors: number;
  floorStars: FloorStarBreakdown;
  choices: RelicDefinition[];
  ownedRelics: RelicId[];
  isSanctuary?: boolean;
  /** Daily: one fixed Blessing for everyone (no draft) */
  isFixedBlessing?: boolean;
  onSelectRelic: (relicId: RelicId) => void;
}

/**
 * Between-Floor Relic Draft Overlay Modal ("Choose 1 of 3 Tactical Relics")
 */
export function RelicDraftModal({
  isOpen,
  clearedFloorNumber,
  totalFloors,
  floorStars,
  choices,
  ownedRelics,
  isSanctuary = true,
  isFixedBlessing = false,
  onSelectRelic,
}: RelicDraftModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="w-full max-w-[430px] bg-gradient-to-b from-[#15172B] via-[#101220] to-[#0A0B14] border-2 border-violet-400/60 rounded-2xl p-5 text-white shadow-[0_0_50px_rgba(139,92,246,0.35)] space-y-4 my-auto">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-extrabold uppercase tracking-wider">
            <span>
              {isSanctuary ? "Garden" : "Floor"} {clearedFloorNumber}/
              {totalFloors} {isSanctuary ? "Bloomed" : "Cleared"}
            </span>
            <span>·</span>
            <span className="text-amber-300">
              {"★".repeat(floorStars.totalStars)}
              {"☆".repeat(3 - floorStars.totalStars)}
            </span>
          </div>
          <h2 className="text-lg font-sans font-extrabold uppercase tracking-tight text-white">
            {isFixedBlessing
              ? "Today's Blessing"
              : isSanctuary
              ? "Choose a Blessing"
              : "Choose 1 of 3 Tactical Relics"}
          </h2>
          <p className="text-xs font-sans text-indigo-200/80">
            {isFixedBlessing
              ? `Everyone receives the same Blessing today. It stays with you for Garden ${clearedFloorNumber + 1}${clearedFloorNumber + 1 < totalFloors ? " and beyond" : ""}.`
              : isSanctuary
              ? `It stays with you for Garden ${clearedFloorNumber + 1} and beyond`
              : `Draft a passive synergy for Floor ${clearedFloorNumber + 1} and beyond`}
          </p>
        </div>

        {/* 3 Relic Cards */}
        <div className="space-y-2.5">
          {choices.map((baseRelic) => {
            const relic = getRelicDisplay(baseRelic, isSanctuary);
            const currentStacks = ownedRelics.filter(
              (r) => r === relic.id
            ).length;
            return (
              <button
                key={relic.id}
                type="button"
                onClick={() => onSelectRelic(relic.id)}
                style={{
                  borderColor: `${relic.accentColor}66`,
                }}
                className="w-full text-left bg-[#0B0C16]/95 hover:bg-[#14172B] border-2 rounded-xl p-3.5 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] shadow-lg group flex items-start gap-3"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                  style={{
                    backgroundColor: `${relic.accentColor}20`,
                    borderColor: `${relic.accentColor}60`,
                    boxShadow: `0 0 14px ${relic.accentColor}35`,
                  }}
                >
                  {relic.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-sans font-extrabold text-sm text-white group-hover:text-cyan-200 transition">
                        {relic.name}
                      </span>
                      {currentStacks > 0 && (
                        <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300">
                          STACK ×{currentStacks + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-[#141628] border border-white/10 shrink-0"
                      style={{ color: relic.accentColor }}
                    >
                      {relic.shortTag}
                    </span>
                  </div>
                  <p className="text-xs font-sans text-indigo-100/85 mt-1 leading-snug">
                    {relic.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center text-[10px] font-mono text-indigo-300/60">
          {isFixedBlessing
            ? `Tap the Blessing to walk on to Garden ${clearedFloorNumber + 1}`
            : isSanctuary
            ? `Tap a Blessing to keep it and walk on to Garden ${clearedFloorNumber + 1}`
            : `Tap any Relic card to equip it immediately and descend to Floor ${clearedFloorNumber + 1}`}
        </div>
      </div>
    </div>
  );
}

interface RunSummaryModalProps {
  isOpen: boolean;
  survived: boolean;
  dungeon: DungeonTheme;
  hero: HeroStats;
  heroClassId: HeroClassId;
  activeRelics: RelicId[];
  totalCellsVisited: number;
  finalScore: number;
  floorHistory: FloorHistoryRecord[];
  leaderboard: LeaderboardEntry[];
  totalGems?: number;
  companionId?: string;
  isSanctuary?: boolean;
  isDaily?: boolean;
  /** First finished Daily attempt of the day (counts for streak & board) */
  isOfficial?: boolean;
  playerStats?: DailyPlayerStats;
  onOpenSanctuaryGallery?: () => void;
  onClose: () => void;
  onRetryRun: () => void;
  onNewSandbox: () => void;
  onOpenCrafter: () => void;
  onSubmitScore: (playerName: string) => Promise<void>;
}

export function RunSummaryModal({
  isOpen,
  survived,
  dungeon,
  hero,
  heroClassId,
  activeRelics,
  totalCellsVisited,
  finalScore,
  floorHistory,
  leaderboard,
  totalGems,
  companionId,
  isSanctuary = true,
  isDaily = false,
  isOfficial = false,
  playerStats,
  onOpenSanctuaryGallery,
  onClose,
  onRetryRun,
  onNewSandbox,
  onOpenCrafter,
  onSubmitScore,
}: RunSummaryModalProps) {
  const [copied, setCopied] = useState(false);
  const [callsign, setCallsign] = useState(
    isSanctuary ? "GARDENER" : "TACTICIAN"
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalFloors = dungeon.floors.length;
  const maxStars = totalFloors * 3;
  const heroClassDef =
    HERO_CLASS_REGISTRY[heroClassId] ?? HERO_CLASS_REGISTRY.KNIGHT;

  const shareText = generateShareCardAscii({
    dungeon,
    floorHistory,
    finalScore,
    survived,
    remainingHp: hero.hp,
    gold: hero.gold,
    totalCellsVisited,
    heroClassId,
    activeRelics,
    isSanctuary,
    streakDays: isDaily ? playerStats?.currentStreak ?? 0 : 0,
    isPractice: isDaily && !isOfficial,
  });
  const officialToday = isDaily
    ? playerStats?.dailyHistory[dungeon.dateKey]
    : undefined;
  const gardensRestored = floorHistory.filter((f) => f.cleared).length;
  const gardenDisplay = getDungeonDisplay(dungeon, isSanctuary);
  const modifierDisplayName = getThemeAwareModifierInfo(
    dungeon.modifierId,
    isSanctuary
  ).name;
  const floorWord = isSanctuary ? "G" : "F";

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    }
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || submitting) return;
    setSubmitting(true);
    await onSubmitScore(callsign);
    setSubmitting(false);
    setSubmitted(true);
  };

  const totalRunStars = floorHistory.reduce(
    (sum, f) => sum + (f.stars?.totalStars ?? 0),
    0
  );
  const parPercent = getParPercent(floorHistory);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[420px] bg-[#141418] border border-[#26262E] rounded-2xl p-5 text-white shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-block text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded border ${
                  survived
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-[#F43F5E]/20 border-[#F43F5E]/50 text-[#F43F5E]"
                }`}
              >
                {survived
                  ? isSanctuary
                    ? `${totalFloors}/${totalFloors} GARDENS BLOOMED`
                    : `${totalFloors}/${totalFloors} FLOORS CLEARED`
                  : `${gardensRestored}/${totalFloors} GARDENS RESTORED`}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {totalRunStars}/{maxStars} STARS
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0C] border border-white/15"
                style={{ color: heroClassDef.accentColor }}
              >
                {heroClassDef.emblem}{" "}
                {isSanctuary
                  ? heroClassDef.sanctuaryShortName ?? heroClassDef.shortName
                  : heroClassDef.shortName}
              </span>
            </div>
            <h2 className="text-xl font-sans font-extrabold tracking-tight mt-1">
              {survived
                ? isSanctuary
                  ? "Sanctuary Restored 🌸"
                  : "VICTORY ARCHIVED"
                : "See You Tomorrow 🍃"}
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              {gardenDisplay.title} · {modifierDisplayName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Relics Summary */}
        {activeRelics.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0A0A0C] border border-[#26262E] rounded-xl p-2.5">
            <span className="text-[10px] font-mono uppercase text-zinc-400 mr-1">
              {isSanctuary ? "Blessings:" : "Relics:"}
            </span>
            {activeRelics.map((rId, idx) => {
              const r = getRelicDisplay(RELIC_REGISTRY[rId], isSanctuary);
              return (
                <span
                  key={`${rId}-${idx}`}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#141418] border border-white/10 text-zinc-200"
                >
                  {r.icon} {r.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Sanctuary Mosaic Restoration Progress (Gardenscapes Style) */}
        {totalGems !== undefined && (
          <div className="pt-0.5">
            <SanctuaryProgressBar
              totalGems={totalGems}
              companionId={(companionId as any) ?? "CAT"}
              onOpenSanctuaryModal={onOpenSanctuaryGallery ?? (() => {})}
              onSelectCompanion={() => {}}
            />
          </div>
        )}

        {/* Score Breakdown Card */}
        <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3.5 space-y-2 font-mono text-xs">
          <div className="text-[10px] text-zinc-500 leading-snug">
            Each {isSanctuary ? "garden" : "floor"} scores{" "}
            <span className="text-sky-300 font-bold">Chips</span> ×{" "}
            <span className="text-rose-300 font-bold">Mult</span> × relics.
            Chips = Gems + tile values on your line · Mult = line length.
          </div>
          {floorHistory.map((record, idx) =>
            record.scoreBreakdown ? (
              <div
                key={`score-${idx}`}
                className="flex justify-between text-zinc-400 gap-2"
              >
                <span className="truncate">
                  {floorWord}
                  {idx + 1}:{" "}
                  <span className="text-sky-300">{record.scoreBreakdown.chips}</span> ×{" "}
                  <span className="text-rose-300">{record.scoreBreakdown.mult}</span>
                  {record.scoreBreakdown.xMult !== 1 && (
                    <span className="text-fuchsia-300">
                      {" "}× {Math.round(record.scoreBreakdown.xMult * 100) / 100}
                    </span>
                  )}
                </span>
                <span className="text-amber-300 font-bold">
                  +{(record.floorScore ?? 0).toLocaleString()}
                </span>
              </div>
            ) : null
          )}
          <div className="border-t border-[#26262E] pt-2 flex justify-between items-baseline">
            <span className="text-zinc-200 font-sans font-bold uppercase">
              {isSanctuary ? "Today's Score" : "Final Tactical Score"}
            </span>
            <span className="text-xl font-mono font-black text-white">
              {finalScore.toLocaleString()}
            </span>
          </div>
          {/* Per-floor stars + par comparison */}
          <div className="border-t border-[#26262E] pt-2 space-y-1">
            {dungeon.floors.map((floor, idx) => {
              const record = floorHistory[idx];
              const earned = record?.stars?.totalStars ?? 0;
              const pct =
                record?.parScore && record.parScore > 0
                  ? Math.round(((record.floorScore ?? 0) / record.parScore) * 100)
                  : null;
              return (
                <div
                  key={floor.floorNumber}
                  className="flex justify-between items-center text-zinc-400"
                >
                  <span>
                    {floorWord}
                    {idx + 1}{" "}
                    {record ? (
                      <span className="text-amber-400">
                        {"★".repeat(earned)}
                        <span className="text-zinc-600">
                          {"☆".repeat(3 - earned)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-600">
                        {isSanctuary ? "not visited" : "not reached"}
                      </span>
                    )}
                  </span>
                  {pct !== null && (
                    <span
                      className={pct >= 100 ? "text-amber-300" : "text-zinc-300"}
                    >
                      {pct >= 100 ? `✦ Perfect · ${pct}%` : `${pct}% of par`}
                    </span>
                  )}
                </div>
              );
            })}
            {parPercent !== null && (
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-zinc-200 font-sans font-bold uppercase">
                  {isSanctuary ? "Visit vs Par" : "Run vs Par"}
                </span>
                <span
                  className={`font-black ${
                    parPercent >= 100 ? "text-amber-300" : "text-cyan-300"
                  }`}
                >
                  {parPercent}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Daily: official vs practice */}
        {isDaily && !isOfficial && officialToday && (
          <div className="rounded-xl px-3 py-2 bg-indigo-500/10 border border-indigo-400/30 text-indigo-100 text-xs font-sans">
            Practice visit — today&apos;s official score was{" "}
            <span className="font-bold text-white">
              {officialToday.score.toLocaleString()}
            </span>{" "}
            ({officialToday.starsEarned ?? 0}★). Practice doesn&apos;t change your
            streak or the board.
          </div>
        )}

        {/* Garden calendar: the last 4 weeks of Dailies */}
        {isDaily && playerStats && (
          <GardenCalendar
            dailyHistory={playerStats.dailyHistory}
            todayKey={dungeon.dateKey}
            currentStreak={playerStats.currentStreak}
            bestStreak={playerStats.bestStreak}
          />
        )}

        {/* Spoiler-free share card (results only) */}
        <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-bold uppercase text-zinc-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-violet-400" />
              {isSanctuary ? "Share Your Garden" : "Spoiler-Free 5×5 Share Map"}
            </span>
            <button
              type="button"
              onClick={handleCopyShare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs font-bold transition shadow"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isSanctuary ? "COPY" : "COPY SHARE CARD"}</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[11px] font-mono leading-snug text-zinc-200 bg-[#141418] border border-[#26262E] rounded-lg p-2.5 whitespace-pre-wrap break-words">
            {shareText}
          </pre>
        </div>

        {/* Daily board submission: official Daily attempts only */}
        {!(isDaily && isOfficial) ? null : !submitted ? (
          <form
            onSubmit={handleScoreSubmit}
            className="flex items-center gap-2 bg-[#0A0A0C] border border-[#26262E] rounded-xl p-2"
          >
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              maxLength={16}
              placeholder={isSanctuary ? "YOUR NAME" : "CALLSIGN"}
              className="flex-1 bg-transparent px-2 py-1 text-xs font-mono font-bold uppercase text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-extrabold transition"
            >
              {submitting ? "POSTING..." : "POST TO LEADERBOARD"}
            </button>
          </form>
        ) : (
          <div className="text-center py-1.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
            ✓ Score posted to {isSanctuary ? "today's garden board" : "Daily Leaderboard"}{" "}
            ({leaderboard.length} entries)
          </div>
        )}

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onRetryRun}
            className="py-2.5 px-3 rounded-xl bg-white text-[#0A0A0C] font-mono text-xs font-black uppercase hover:bg-zinc-200 transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isSanctuary ? "Play Again" : "Replay Dungeon"}</span>
          </button>
          <button
            type="button"
            onClick={onNewSandbox}
            className="py-2.5 px-3 rounded-xl bg-[#0A0A0C] border border-[#26262E] hover:border-zinc-600 text-white font-mono text-xs font-bold uppercase transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSanctuary ? "Free Play" : "New Sandbox"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCrafter}
          className="w-full py-2 px-3 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-200 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition"
        >
          <Crown className="w-3.5 h-3.5 text-amber-300" />
          <span>
            {isSanctuary
              ? "More companions, past Dailies & the Garden Crafter"
              : "Expansion: Hero Classes, Archive & AI Crafter"}
          </span>
        </button>
      </div>
    </div>
  );
}

/** 4-week calendar of Daily results: stars per day, ✦ for perfect days. */
function GardenCalendar({
  dailyHistory,
  todayKey,
  currentStreak,
  bestStreak,
}: {
  dailyHistory: DailyPlayerStats["dailyHistory"];
  todayKey: string;
  currentStreak: number;
  bestStreak: number;
}) {
  const today = new Date(todayKey + "T00:00:00");
  // Start on the Monday 3 weeks before this week's Monday
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 21);
  const days: { key: string; day: number; isFuture: boolean }[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ key, day: d.getDate(), isFuture: d > today });
  }
  return (
    <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-sans font-bold text-zinc-200">
        <span>Your garden calendar</span>
        <span className="font-mono text-amber-300">
          🔥 {currentStreak} · best {bestStreak}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-mono">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[9px] text-zinc-500">
            {d}
          </span>
        ))}
        {days.map(({ key, day, isFuture }) => {
          const record = dailyHistory[key];
          const stars = record?.starsEarned ?? 0;
          const perfect = (record?.perfectCount ?? 0) > 0;
          return (
            <div
              key={key}
              title={
                record
                  ? `${key}: ${stars}★ · ${record.score.toLocaleString()}`
                  : key
              }
              className={`aspect-square rounded-md flex flex-col items-center justify-center text-[9px] leading-none border ${
                key === todayKey
                  ? "border-amber-300/70"
                  : "border-transparent"
              } ${
                isFuture
                  ? "bg-transparent text-zinc-700"
                  : record
                  ? stars >= 7
                    ? "bg-amber-400/35 text-white"
                    : stars >= 4
                    ? "bg-amber-400/20 text-amber-100"
                    : "bg-amber-400/10 text-amber-200/80"
                  : "bg-white/5 text-zinc-500"
              }`}
            >
              <span>{day}</span>
              {record && (
                <span className="text-[8px] mt-0.5">
                  {perfect ? "✦" : `${stars}★`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LeaderboardModalProps {
  isOpen: boolean;
  dateKey: string;
  entries: LeaderboardEntry[];
  isSanctuary?: boolean;
  onClose: () => void;
}

export function LeaderboardModal({
  isOpen,
  dateKey,
  entries,
  isSanctuary = true,
  onClose,
}: LeaderboardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-[#141418] border border-[#26262E] rounded-2xl p-5 text-white shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-sans font-extrabold uppercase tracking-tight">
                {isSanctuary ? "Today's Garden Board" : "Daily Leaderboard"}
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                {isSanctuary ? "Everyone's Garden" : "Global Seed"} · {dateKey}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#26262E] max-h-[340px] overflow-y-auto pb-6 [mask-image:linear-gradient(to_bottom,black_82%,transparent_100%)]">
            {entries.length === 0 && (
              <div className="px-3.5 py-6 text-center font-mono text-xs text-zinc-500">
                {isSanctuary
                  ? "No one has shared a score for today's garden yet — be the first."
                  : "No scores posted for this seed yet — be the first."}
              </div>
            )}
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                className="px-3.5 py-2.5 flex items-center justify-between font-mono text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-5 text-center font-black ${
                      idx === 0
                        ? "text-amber-400"
                        : idx === 1
                        ? "text-zinc-300"
                        : idx === 2
                        ? "text-amber-600"
                        : "text-zinc-500"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-white">
                      {entry.player_name}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {isSanctuary
                        ? `✨ ${entry.remaining_hp} · 💎 ${entry.gold_collected} · 🌸 ${entry.cells_visited} tiles`
                        : `❤️ ${entry.remaining_hp} · 🪙 ${entry.gold_collected} · 📏 ${entry.cells_visited} steps`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-emerald-400">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase">
                    {entry.survived
                      ? isSanctuary
                        ? "BLOOMED"
                        : "CLEARED"
                      : isSanctuary
                      ? "RESTED"
                      : "FALLEN"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PassAndCrafterModalProps {
  isOpen: boolean;
  monetization: MonetizationState;
  playerStats: DailyPlayerStats;
  totalBankedGold: number;
  heroClassId: HeroClassId;
  cosmetics: CosmeticPreferences;
  isGeneratingAi: boolean;
  isSanctuary?: boolean;
  storeMessage?: string | null;
  isCheckoutPending?: boolean;
  onClose: () => void;
  onSelectHeroClass: (classId: HeroClassId, isFreeTrial?: boolean) => void;
  onSelectCosmetics: (next: CosmeticPreferences) => void;
  onUnlockExpansion: () => void;
  onSendRestoreLink: (email: string) => Promise<void>;
  onToggleDevSimulate: () => void;
  onLaunchGauntlet: () => void;
  onLaunchArchiveDate: (dateKey: string) => void;
  onCraftCustomDungeon: (
    prompt: string,
    preferredModifier?: ModifierId
  ) => Promise<void>;
}

const SANCTUARY_STORE_COPY = {
  title: "Sanctuary Expansion",
  subtitle: "More companions · the Ten-Garden Trail · past Dailies",
  badge: "ONE-TIME PURCHASE",
  cardTitle: "The Full Sanctuary",
  priceNote: "Pay once · yours forever",
  dailyFree: "Today's Daily garden is always free.",
  companionsHeading: "Three more companions",
  trialHint: "Try any for 1 garden free",
  ownedHint: "Tap to choose",
  hpUnit: "Magic",
  chooseBtn: "CHOOSE",
  trialBtn: "TRY 1 GARDEN",
  activeBtn: "WITH YOU ✓",
  trailHeading: "The Ten-Garden Trail",
  trailBody: "Ten gardens in a row, with a new Blessing to choose after each one.",
  trailBtn: "WALK IT",
  buyBtn: "UNLOCK EVERYTHING — $3.99",
  ownedBtn: "EXPANSION UNLOCKED ✓",
  pendingBtn: "OPENING CHECKOUT…",
  finePrint: "Secure checkout by Stripe. A single $3.99 charge — no subscription.",
  archiveHeading: "Past Dailies",
  archiveBody:
    "Missed a day? Replay any past Daily garden and earn its stars. Replays don't count toward your streak or today's board.",
  archiveBtn: "VISIT",
  archivePlay: "PLAY",
  cosmeticsHeading: "Trails & Emblems",
  cosmeticsCurrency: "💎",
  cosmeticsCurrencyLabel: "Gems saved",
  cosmeticsHint: "Unlock with saved Gems, or all at once with the Expansion.",
  crafterHeading: "Garden Crafter",
  crafterTag: "AI · 3 a day",
  crafterBody: "Describe a garden and the Crafter grows a board just for you.",
  crafterPlaceholder: "e.g. a moonlit greenhouse full of thistles",
  crafterAuto: "Let the Crafter choose today's rule",
  crafterBtn: "GROW IT",
  crafterBusy: "GROWING…",
  presets: [
    "Moonlit greenhouse full of thistles",
    "Sunny orchard with lots of gems",
    "Misty pond with sour berries",
    "Winding hedge maze",
  ],
  restoreLink: "Already bought it? Restore your purchase",
  restoreBody:
    "Enter the email from your Stripe receipt. We'll send a sign-in link that unlocks this device.",
  restoreBtn: "SEND LINK",
  lockedLabel: "Expansion",
};

const TACTICIAN_STORE_COPY: typeof SANCTUARY_STORE_COPY = {
  title: "Tactician Full Expansion",
  subtitle: "Hero Classes · 10-Floor Relic Gauntlet · Daily Archive",
  badge: "ONE-TIME UNLOCK",
  cardTitle: "Full Game Expansion",
  priceNote: "Pay once · own forever",
  dailyFree: "The Daily Dungeon is always free.",
  companionsHeading: "3 rule-bending Hero Classes",
  trialHint: "1-floor free preview",
  ownedHint: "Tap to equip",
  hpUnit: "HP",
  chooseBtn: "EQUIP",
  trialBtn: "TRY 1 FLOOR",
  activeBtn: "EQUIPPED ✓",
  trailHeading: "10-Floor Relic Gauntlet",
  trailBody: "Draft 1 of 3 stackable Relics after every floor and build synergies.",
  trailBtn: "PLAY 10F",
  buyBtn: "UNLOCK FULL EXPANSION — $3.99",
  ownedBtn: "FULL EXPANSION UNLOCKED ✓",
  pendingBtn: "OPENING CHECKOUT…",
  finePrint: "Secure checkout by Stripe. One-time $3.99 charge — no subscription.",
  archiveHeading: "Daily Archive",
  archiveBody:
    "Replay any past Daily seed to earn missed 3-star mastery. Archive runs don't count toward your streak or the daily leaderboard.",
  archiveBtn: "LOAD SEED",
  archivePlay: "PLAY",
  cosmeticsHeading: "Armory Cosmetics",
  cosmeticsCurrency: "🪙",
  cosmeticsCurrencyLabel: "Banked Gold",
  cosmeticsHint: "Unlock with banked gold, or all at once with the Expansion.",
  crafterHeading: "AI Dungeon Crafter",
  crafterTag: "AI · 3 per day",
  crafterBody: "Describe a dungeon and AI generates a playable 3-floor seed.",
  crafterPlaceholder: "e.g. Vampire castle with heavy traps",
  crafterAuto: "Auto-select modifier (AI)",
  crafterBtn: "CRAFT SEED",
  crafterBusy: "CRAFTING…",
  presets: [
    "Vampire castle with heavy traps",
    "The glass clockwork vault",
    "Obsidian mirror labyrinth",
    "Kinetic speedrun foundry",
  ],
  restoreLink: "Already purchased? Restore it",
  restoreBody:
    "Enter the email from your Stripe receipt and we'll send a sign-in link that unlocks this device.",
  restoreBtn: "SEND LINK",
  lockedLabel: "Expansion",
};

/**
 * One-time $3.99 Expansion: companions, the 10-garden trail, past Dailies,
 * cosmetics and the AI Crafter. Purchase goes through Stripe Checkout; the
 * unlock is granted only after the server confirms payment.
 */
export function PassAndCrafterModal({
  isOpen,
  monetization,
  playerStats,
  totalBankedGold,
  heroClassId,
  cosmetics,
  isGeneratingAi,
  isSanctuary = true,
  storeMessage,
  isCheckoutPending = false,
  onClose,
  onSelectHeroClass,
  onSelectCosmetics,
  onUnlockExpansion,
  onSendRestoreLink,
  onToggleDevSimulate,
  onLaunchGauntlet,
  onLaunchArchiveDate,
  onCraftCustomDungeon,
}: PassAndCrafterModalProps) {
  const copy = isSanctuary ? SANCTUARY_STORE_COPY : TACTICIAN_STORE_COPY;
  const [archiveDate, setArchiveDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [customPrompt, setCustomPrompt] = useState(copy.presets[0]);
  const [selectedModifier, setSelectedModifier] = useState<
    ModifierId | "AUTO"
  >("AUTO");
  const [showRestore, setShowRestore] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState("");
  const [isSendingRestore, setIsSendingRestore] = useState(false);

  if (!isOpen) return null;

  const isExpansionOwned = hasExpansionAccess(monetization);
  const todayKey = getTodayDateKey();

  // Recent 6 past dates for 1-tap replays
  const recentArchiveDates: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    recentArchiveDates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    );
  }

  const handleCraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExpansionOwned || !customPrompt.trim() || isGeneratingAi) return;
    await onCraftCustomDungeon(
      customPrompt.trim(),
      selectedModifier === "AUTO" ? undefined : selectedModifier
    );
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreEmail.includes("@") || isSendingRestore) return;
    setIsSendingRestore(true);
    await onSendRestoreLink(restoreEmail.trim());
    setIsSendingRestore(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[440px] bg-[#12131F] border border-indigo-500/30 rounded-2xl p-5 text-white shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-base font-sans font-extrabold uppercase tracking-tight">
                {copy.title}
              </h2>
              <p className="text-[11px] font-mono text-indigo-300/75">
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Checkout / restore / crafter feedback */}
        {storeMessage && (
          <div className="rounded-xl px-3 py-2 bg-emerald-500/15 border border-emerald-400/50 text-emerald-100 text-xs font-sans">
            {storeMessage}
          </div>
        )}

        {/* Developer unlock simulator (local development builds only) */}
        {DEV_SIMULATOR_ENABLED && (
          <div className="bg-amber-500/10 border border-dashed border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Dev only: simulate purchase</span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400">
                Hidden and ignored in production builds
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDevSimulate}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-extrabold transition flex items-center gap-1 shrink-0 ${
                monetization.devSimulatePass
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {monetization.devSimulatePass ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>ON</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>OFF</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Offer card */}
        <div className="bg-gradient-to-b from-[#1C1836] via-[#131324] to-[#0B0C16] border-2 border-violet-400/60 rounded-2xl p-4 space-y-3.5 shadow-[0_0_30px_rgba(139,92,246,0.25)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="inline-block text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-violet-500/25 border border-violet-400/50 text-violet-200">
                {copy.badge}
              </span>
              <h3 className="text-lg font-sans font-extrabold text-white mt-1">
                {copy.cardTitle}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-black text-white">
                $3.99
              </div>
              <div className="text-[10px] font-mono text-emerald-300">
                {copy.priceNote}
              </div>
            </div>
          </div>
          <p className="text-[11px] font-sans text-indigo-200/80 -mt-1">
            {copy.dailyFree}
          </p>

          {/* Companions / Hero Classes */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between gap-2">
              <span>{copy.companionsHeading}</span>
              <span className="text-[10px] font-mono normal-case text-indigo-300/75">
                {isExpansionOwned ? copy.ownedHint : copy.trialHint}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {HERO_CLASS_LIST.filter((c) => !c.isFreeDefault).map((cls) => {
                const isSelected = heroClassId === cls.id;
                return (
                  <div
                    key={cls.id}
                    className={`rounded-xl p-2 border flex flex-col justify-between gap-1.5 min-w-0 ${
                      isSelected
                        ? "bg-[#1E223D] border-white"
                        : "bg-[#0A0B14]/90 border-indigo-500/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{cls.emblem}</span>
                        <span
                          className="text-[9px] font-mono font-bold"
                          style={{ color: cls.accentColor }}
                        >
                          {cls.startingHp} {copy.hpUnit}
                        </span>
                      </div>
                      <div className="font-sans font-extrabold text-[11px] text-white mt-0.5 truncate">
                        {isSanctuary
                          ? cls.sanctuaryShortName ?? cls.shortName
                          : cls.shortName}
                      </div>
                      <div className="text-[9px] font-mono text-indigo-200/75 leading-tight mt-0.5">
                        {isSanctuary
                          ? cls.sanctuaryPassiveName ?? cls.passiveName
                          : cls.passiveName.replace(/\s*\(.*\)$/, "")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectHeroClass(cls.id, !isExpansionOwned);
                        onClose();
                      }}
                      className="w-full py-1 rounded-md bg-white/10 hover:bg-white/20 text-[9px] font-mono font-extrabold text-white transition"
                    >
                      {isSelected
                        ? copy.activeBtn
                        : isExpansionOwned
                        ? copy.chooseBtn
                        : copy.trialBtn}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ten-Garden Trail / Gauntlet */}
          <div className="bg-[#0A0B14]/90 border border-indigo-500/30 rounded-xl p-2.5 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-sans font-extrabold text-violet-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>{copy.trailHeading}</span>
              </div>
              <p className="text-[10px] font-sans text-indigo-200/75 leading-snug">
                {copy.trailBody}
              </p>
            </div>
            <button
              type="button"
              disabled={!isExpansionOwned}
              onClick={() => {
                onLaunchGauntlet();
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-mono text-[10px] font-extrabold shrink-0 transition flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{copy.trailBtn}</span>
            </button>
          </div>

          {/* Buy */}
          <button
            type="button"
            disabled={isExpansionOwned || isCheckoutPending}
            onClick={onUnlockExpansion}
            className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg disabled:cursor-default ${
              isExpansionOwned
                ? "bg-emerald-500/20 border border-emerald-400/60 text-emerald-300"
                : "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-[0_0_25px_rgba(250,204,21,0.45)] disabled:opacity-70"
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>
              {isExpansionOwned
                ? copy.ownedBtn
                : isCheckoutPending
                ? copy.pendingBtn
                : copy.buyBtn}
            </span>
          </button>

          {!isExpansionOwned && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono text-indigo-300/60 text-center">
                {copy.finePrint}
              </p>
              {!showRestore ? (
                <button
                  type="button"
                  onClick={() => setShowRestore(true)}
                  className="w-full text-[11px] font-sans text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                >
                  {copy.restoreLink}
                </button>
              ) : (
                <form onSubmit={handleRestoreSubmit} className="space-y-1.5">
                  <p className="text-[10px] font-sans text-indigo-200/80">
                    {copy.restoreBody}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      required
                      value={restoreEmail}
                      onChange={(e) => setRestoreEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 min-w-0 bg-[#141628] border border-indigo-500/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={isSendingRestore}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono text-xs font-extrabold transition shrink-0"
                    >
                      {copy.restoreBtn}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Past Dailies / Archive */}
        <div className="bg-[#0A0B14] border border-indigo-500/25 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-bold text-cyan-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>{copy.archiveHeading}</span>
            </span>
            {!isExpansionOwned && (
              <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> {copy.lockedLabel}
              </span>
            )}
          </div>
          <p className="text-[11px] font-sans text-indigo-200/75 leading-snug">
            {copy.archiveBody}
          </p>

          <div className="flex items-center gap-2">
            <input
              type="date"
              max={todayKey}
              value={archiveDate}
              onChange={(e) => setArchiveDate(e.target.value)}
              className="flex-1 min-w-0 bg-[#141628] border border-indigo-500/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              disabled={!isExpansionOwned || !archiveDate}
              onClick={() => {
                onLaunchArchiveDate(archiveDate);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono text-xs font-extrabold transition shrink-0"
            >
              {copy.archiveBtn}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {recentArchiveDates.map((dKey) => {
              const record = playerStats.dailyHistory[dKey];
              return (
                <button
                  key={dKey}
                  type="button"
                  disabled={!isExpansionOwned}
                  onClick={() => {
                    onLaunchArchiveDate(dKey);
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded-lg bg-[#141628] hover:bg-[#1B1E36] disabled:opacity-45 border border-indigo-500/20 text-left font-mono text-[10px] flex items-center justify-between transition"
                >
                  <span className="text-indigo-200">{dKey.slice(5)}</span>
                  <span className="text-amber-400 font-bold">
                    {record && (record.starsEarned ?? 0) > 0
                      ? "★".repeat(Math.min(9, record.starsEarned ?? 0))
                      : copy.archivePlay}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cosmetics */}
        <div className="bg-[#0A0B14] border border-indigo-500/25 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-sans font-bold text-yellow-300 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-yellow-400" />
              <span>{copy.cosmeticsHeading}</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-yellow-400">
              {copy.cosmeticsCurrency} {totalBankedGold} {copy.cosmeticsCurrencyLabel}
            </span>
          </div>
          <p className="text-[10px] font-sans text-indigo-200/70 -mt-1">
            {copy.cosmeticsHint}
          </p>

          <div className="grid grid-cols-4 gap-1.5">
            {HERO_EMBLEMS.map((emblem) => {
              const unlocked =
                isExpansionOwned || totalBankedGold >= emblem.unlockGold;
              const selected = cosmetics.emblemId === emblem.id;
              return (
                <button
                  key={emblem.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() =>
                    onSelectCosmetics({
                      ...cosmetics,
                      emblemId: emblem.id as HeroEmblemId,
                    })
                  }
                  className={`py-1.5 px-1.5 rounded-lg border font-mono text-[10px] flex flex-col items-center gap-0.5 transition ${
                    selected
                      ? "bg-cyan-500/20 border-cyan-400 text-white"
                      : unlocked
                      ? "bg-[#141628] border-indigo-500/20 text-zinc-300 hover:border-cyan-400/50"
                      : "bg-[#101014] border-zinc-800/80 text-zinc-500 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <span className="text-sm font-black">{emblem.symbol}</span>
                  <span className="truncate max-w-full">
                    {unlocked
                      ? emblem.name.split(" ").pop()
                      : `${emblem.unlockGold}${copy.cosmeticsCurrency}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {TRAIL_SKINS.map((trail) => {
              const unlocked =
                isExpansionOwned || totalBankedGold >= trail.unlockGold;
              const selected = cosmetics.trailId === trail.id;
              return (
                <button
                  key={trail.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() =>
                    onSelectCosmetics({
                      ...cosmetics,
                      trailId: trail.id as TrailSkinId,
                    })
                  }
                  className={`py-1.5 px-1.5 rounded-lg border font-mono text-[10px] flex flex-col items-center gap-1 transition ${
                    selected
                      ? "bg-violet-500/20 border-white text-white"
                      : unlocked
                      ? "bg-[#141628] border-indigo-500/20 text-zinc-300 hover:border-zinc-500"
                      : "bg-[#101014] border-zinc-800/80 text-zinc-500 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <span
                    className="w-5 h-2 rounded-full"
                    style={{
                      backgroundColor: trail.primaryStroke,
                      boxShadow: `0 0 8px ${trail.primaryStroke}`,
                    }}
                  />
                  <span className="truncate max-w-full">
                    {unlocked
                      ? trail.name.split(" ")[0]
                      : `${trail.unlockGold}${copy.cosmeticsCurrency}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Crafter */}
        <form
          onSubmit={handleCraftSubmit}
          className="bg-[#0A0B14] border border-indigo-500/25 rounded-xl p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-sans font-bold text-white flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-violet-400" />
              <span>{copy.crafterHeading}</span>
            </span>
            <span className="text-[10px] font-mono text-violet-300 flex items-center gap-1">
              {!isExpansionOwned && <Lock className="w-3 h-3" />}
              {copy.crafterTag}
            </span>
          </div>
          <p className="text-[11px] font-sans text-indigo-200/75 leading-snug -mt-1">
            {copy.crafterBody}
          </p>

          <input
            type="text"
            value={customPrompt}
            maxLength={200}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={copy.crafterPlaceholder}
            className="w-full bg-[#141628] border border-indigo-500/30 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
          />

          <div className="flex flex-wrap gap-1.5">
            {copy.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCustomPrompt(preset)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141628] hover:bg-zinc-800 border border-indigo-500/20 text-zinc-300"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedModifier}
              onChange={(e) =>
                setSelectedModifier(e.target.value as ModifierId | "AUTO")
              }
              className="flex-1 min-w-0 bg-[#141628] border border-indigo-500/30 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none"
            >
              <option value="AUTO">{copy.crafterAuto}</option>
              {MODIFIER_LIST.map((mod) => {
                const display = getThemeAwareModifierInfo(mod.id, isSanctuary);
                return (
                  <option key={mod.id} value={mod.id}>
                    {display.name} ({display.shortTag})
                  </option>
                );
              })}
            </select>

            <button
              type="submit"
              disabled={!isExpansionOwned || isGeneratingAi}
              className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-40 text-white font-mono text-xs font-black uppercase transition flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingAi ? copy.crafterBusy : copy.crafterBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
