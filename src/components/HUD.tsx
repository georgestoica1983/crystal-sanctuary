"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Flame,
  Heart,
  Info,
  RefreshCw,
  Shield,
  Sparkles,
  Sword,
  Trophy,
  Volume2,
  VolumeX,
  Coins,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Star,
  Palette,
  Lock,
  Zap,
  X,
} from "lucide-react";
import {
  CosmeticPreferences,
  DailyPlayerStats,
  DungeonTheme,
  GameMode,
  GridCell,
  GridCoord,
  HeroClassId,
  HeroEmblemId,
  HeroStats,
  MonetizationState,
  PathSimulationResult,
  RelicId,
  TrailSkinId,
  VisualThemeMode,
} from "@/types/game";
import {
  getFlawlessHpThreshold,
  HERO_CLASS_LIST,
  HERO_CLASS_REGISTRY,
  HERO_EMBLEMS,
  MODIFIER_REGISTRY,
  RELIC_REGISTRY,
  TRAIL_SKINS,
} from "@/lib/engine";
import { hasExpansionAccess } from "@/lib/supabase";
import { getGardenerRank } from "@/lib/unlocks";
import { loadBestClearedAscension } from "@/lib/ascension";
import { FEEDBACK_URL, track } from "@/lib/analytics";
import EntityIcon from "@/components/EntityIcon";
import { getRelicDisplay } from "@/lib/sanctuaryCopy";

export function getLiveStepNarratorText(
  simulation: PathSimulationResult,
  isSanctuary: boolean
): string {
  if (simulation.steps.length <= 1) {
    return isSanctuary
      ? "Step 1: 🌸 At Companion's starting tile — drag toward the Exit!"
      : "Step 1: 🧤 At starting point — drag your path toward the Exit!";
  }

  const lastStep = simulation.steps[simulation.steps.length - 1];
  const stepNum = lastStep.stepIndex;

  if (lastStep.isDead) {
    if (lastStep.cell.type === "ENEMY") {
      return isSanctuary
        ? `Step ${stepNum}: 🌺 Thorn (${lastStep.cell.value}) was too prickly! Life reached 0.`
        : `Step ${stepNum}: 💀 Enemy (${lastStep.cell.value}) dealt lethal damage! HP reached 0.`;
    }
    if (lastStep.cell.type === "TRAP") {
      return isSanctuary
        ? `Step ${stepNum}: ⚙️ Stepped into Spike (${lastStep.cell.value})! Life reached 0.`
        : `Step ${stepNum}: 💀 Stepped into Trap (${lastStep.cell.value})! HP reached 0.`;
    }
  }

  if (lastStep.trapDodgedDiagonally) {
    return isSanctuary
      ? `Step ${stepNum}: ↗️ Diagonal Hop! Dodged ⚙️ Spike (${lastStep.cell.value}) for 0 damage!`
      : `Step ${stepNum}: ↗️ Diagonal Hop! Dodged ⚠️ Trap (${lastStep.cell.value}) for 0 damage!`;
  }

  if (lastStep.cell.type === "ENEMY") {
    const briarName = isSanctuary ? "🌺 Thorn" : "Enemy";
    const magicName = isSanctuary ? "Life" : "HP";
    const hpLoss = Math.abs(lastStep.hpDelta);

    if (lastStep.weaponBefore > 0 && lastStep.shieldBefore > 0) {
      const wName = isSanctuary ? "✂️ Shears" : "⚔️ Weapon";
      const sName = isSanctuary ? "🧤 Gloves" : "🧤 Gloves";
      return `Step ${stepNum}: ${wName} (${lastStep.weaponBefore}) + ${sName} (${lastStep.shieldBefore}) cleared ${briarName} (${lastStep.cell.value}) → ${hpLoss} ${magicName} lost!`;
    } else if (lastStep.weaponBefore > 0) {
      const wName = isSanctuary ? "✂️ Shears" : "⚔️ Weapon";
      return `Step ${stepNum}: ${wName} (${lastStep.weaponBefore}) cleared ${briarName} (${lastStep.cell.value}) → ${hpLoss} ${magicName} lost!`;
    } else if (lastStep.shieldBefore > 0) {
      const sName = isSanctuary ? "🧤 Gloves" : "🧤 Gloves";
      return `Step ${stepNum}: ${sName} (${lastStep.shieldBefore}) absorbed ${briarName} (${lastStep.cell.value}) → ${hpLoss} ${magicName} lost!`;
    } else {
      return `Step ${stepNum}: Cleared ${briarName} (${lastStep.cell.value}) → ${hpLoss} ${magicName} lost!`;
    }
  }

  if (lastStep.cell.type === "SHIELD") {
    return isSanctuary
      ? `Step ${stepNum}: 🧤 Gathered +${lastStep.shieldDelta} Gloves! (Total: ${lastStep.shieldAfter})`
      : `Step ${stepNum}: 🧤 Equipped +${lastStep.shieldDelta} Gloves! (Total: ${lastStep.shieldAfter})`;
  }

  if (lastStep.cell.type === "WEAPON") {
    return isSanctuary
      ? `Step ${stepNum}: ✂️ Soaked up +${lastStep.weaponDelta} Shears! The next Thorn will be easier.`
      : `Step ${stepNum}: ⚔️ Picked up +${lastStep.weaponDelta} Weapon! Next attack hits hard.`;
  }

  if (lastStep.cell.type === "POTION") {
    if (lastStep.hpDelta === 0) {
      return isSanctuary
        ? `Step ${stepNum}: 🍓 Sweet Berries (+${lastStep.cell.value})! Life was already full (${lastStep.hpAfter}/${lastStep.hpAfter}).`
        : `Step ${stepNum}: 🧪 Potion (+${lastStep.cell.value})! HP was already full.`;
    }
    return isSanctuary
      ? `Step ${stepNum}: 🍓 Sweet Berries restored +${lastStep.hpDelta} Life! (Now: ${lastStep.hpAfter})`
      : `Step ${stepNum}: 🧪 Potion restored +${lastStep.hpDelta} HP! (Now: ${lastStep.hpAfter})`;
  }

  if (lastStep.cell.type === "GOLD") {
    return isSanctuary
      ? `Step ${stepNum}: 🌰 Collected +${lastStep.goldDelta} Mosaic Seed${lastStep.goldDelta > 1 ? "s" : ""}!`
      : `Step ${stepNum}: 🪙 Collected +${lastStep.goldDelta} Gold!`;
  }

  if (lastStep.cell.type === "TRAP") {
    return isSanctuary
      ? `Step ${stepNum}: ⚙️ Stepped into Spike (${lastStep.cell.value})! Lost ${Math.abs(lastStep.hpDelta)} Life directly.`
      : `Step ${stepNum}: ⚠️ Stepped onto Trap (${lastStep.cell.value})! Lost ${Math.abs(lastStep.hpDelta)} HP.`;
  }

  if (lastStep.cell.type === "EXIT") {
    return isSanctuary
      ? `Step ${stepNum}: 🌈 Reached the Crystal Exit! Sanctuary restored!`
      : `Step ${stepNum}: 🚪 Reached the Exit Portal! Sector clear!`;
  }

  return `Step ${stepNum}: Path continues...`;
}

export function getSmartLethalCoachTip(
  simulation: PathSimulationResult,
  grid: GridCell[][] | undefined,
  isSanctuary: boolean
): string {
  if (!simulation.firstDeathCoord) return "";
  const deathStep = simulation.steps.find((s) => s.isFirstDeathStep);
  const deathCell = deathStep?.cell;
  const deathCoord = simulation.firstDeathCoord;
  const deficit = Math.max(1, 1 - simulation.projectedHp);

  if (deathCell?.type === "TRAP" && !deathStep?.trapDodgedDiagonally) {
    return isSanctuary
      ? `💡 Tip: Spikes ignore Gloves! Slice DIAGONALLY through (${deathCoord.row + 1},${deathCoord.col + 1}) to hop over it for 0 damage, or drag back to undo.`
      : `💡 Tip: Traps ignore Gloves! Slice DIAGONALLY through (${deathCoord.row + 1},${deathCoord.col + 1}) to hop over it for 0 damage, or drag back to undo.`;
  }

  let remedyStr: string | null = null;
  if (grid) {
    const visitedCoords = new Set(
      simulation.steps.map((s) => `${s.coord.row},${s.coord.col}`)
    );
    const unvisitedShields: GridCell[] = [];
    const unvisitedWeapons: GridCell[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell.type === "VOID" || visitedCoords.has(`${r},${c}`)) continue;
        if (cell.type === "SHIELD") unvisitedShields.push(cell);
        if (cell.type === "WEAPON") unvisitedWeapons.push(cell);
      }
    }

    if (unvisitedShields.length > 0) {
      const s = unvisitedShields[0];
      remedyStr = isSanctuary
        ? `picking up the 🧤${s.value} Gloves tile at (${s.row + 1},${s.col + 1})`
        : `picking up the 🧤${s.value} Gloves at (${s.row + 1},${s.col + 1})`;
    } else if (unvisitedWeapons.length > 0) {
      const w = unvisitedWeapons[0];
      remedyStr = isSanctuary
        ? `grabbing the ✂️${w.value} Shears at (${w.row + 1},${w.col + 1})`
        : `grabbing the ⚔️${w.value} Weapon at (${w.row + 1},${w.col + 1})`;
    }
  }

  if (remedyStr) {
    return isSanctuary
      ? `💡 Tip: You ran out of Life at (${deathCoord.row + 1},${deathCoord.col + 1})! Try ${remedyStr} first, or drag back one tile to undo.`
      : `💡 Tip: You ran out of HP at (${deathCoord.row + 1},${deathCoord.col + 1})! Try ${remedyStr} first, or drag back one tile to undo.`;
  }

  return isSanctuary
    ? `💡 Tip: Ran out of Life at (${deathCoord.row + 1},${deathCoord.col + 1}) (needs +${deficit} Life)! Pick up Gloves or Shears tiles first, or drag back one tile to undo.`
    : `💡 Tip: Path lethal at (${deathCoord.row + 1},${deathCoord.col + 1}) (needs +${deficit} HP)! Gather Gloves or Weapons first, or drag back one tile to undo.`;
}

export function getThemeAwareModifierInfo(
  modifierId: string,
  isSanctuary: boolean
) {
  const mod =
    MODIFIER_REGISTRY[modifierId as keyof typeof MODIFIER_REGISTRY] ||
    MODIFIER_REGISTRY.NONE;
  if (!isSanctuary) {
    return mod;
  }
  switch (modifierId) {
    case "BLOOD_GOLD":
      return {
        ...mod,
        name: "Honeyed Seeds",
        shortTag: "GEMS +1 LIFE / BERRIES -1",
        description:
          "Every Seed restores +1 Life today, but the Berries have turned sour and take 1 Life.",
        tacticalHint: "Walk through Seeds to keep your Life up, and skip the sour Berries.",
      };
    case "GLASS_ARMOR":
      return {
        ...mod,
        name: "Frost Gloves",
        shortTag: "2x SHIELD / MELTS EVERY 3RD STEP",
        description:
          "Gloves are worth double, but any Gloves you're carrying melt away every 3rd step.",
        tacticalHint: "Gather Gloves just 1–2 steps before a big Thorn.",
      };
    case "MOMENTUM":
      return {
        ...mod,
        name: "Sunlit Lanes",
        shortTag: "3+ STRAIGHT = +3 SUN",
        description:
          "Walking 3+ tiles in a straight line gathers +1 ✂️ Shears.",
        tacticalHint: "Line up a 3-tile straight walk before a big Thorn.",
      };
    case "MIRROR_VERTICAL":
      return {
        ...mod,
        name: "Mirror Pond",
        shortTag: "UP/DOWN +2 / SIDEWAYS -1",
        description:
          "Thorns are 2 pricklier when you reach them from above or below, and 1 gentler from the side.",
        tacticalHint: "Step into Thorns from the left or right.",
      };
    case "ORTHOGONAL_ONLY":
      return {
        ...mod,
        name: "Hedgerow Paths",
        shortTag: "NO DIAGONALS",
        description:
          "Tall hedges block diagonal steps. Walk up, down, left and right only.",
        tacticalHint: "You can't hop Spikes diagonally today — plan around them.",
      };
    case "NONE":
      return {
        ...mod,
        name: "Quiet Garden",
        shortTag: "8-WAY",
        description: "No special rules today. Wander in any of the eight directions.",
        tacticalHint: "Diagonal hops let you slip past Spikes unharmed.",
      };
    default:
      return mod;
  }
}

export function CompanionDrawerModal({
  isOpen,
  currentClassId,
  isSanctuary,
  expansionUnlocked,
  trialClassFloorActive,
  onSelectClass,
  onOpenPassModal,
  onClose,
}: {
  isOpen: boolean;
  currentClassId: HeroClassId;
  isSanctuary: boolean;
  expansionUnlocked: boolean;
  trialClassFloorActive: boolean;
  onSelectClass: (classId: HeroClassId, isFreeTrial?: boolean) => void;
  onOpenPassModal: () => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-[430px] bg-gradient-to-b from-[#181A2E] via-[#121322] to-[#0A0B14] border-2 border-indigo-500/40 rounded-2xl p-4 text-white shadow-2xl space-y-3 my-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦊</span>
            <div>
              <h2 className="text-sm font-sans font-extrabold uppercase tracking-tight">
                {isSanctuary ? "Choose Your Companion" : "Select Hero Class"}
              </h2>
              <p className="text-[10px] font-mono text-indigo-300">
                {isSanctuary
                  ? "Each companion has a unique passive ability"
                  : "Passive archetype combat superpowers"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
          {HERO_CLASS_LIST.map((cls) => {
            const isSelected = currentClassId === cls.id;
            const isUnlocked =
              cls.isFreeDefault ||
              expansionUnlocked ||
              (trialClassFloorActive && currentClassId === cls.id);

            return (
              <div
                key={cls.id}
                className={`p-3 rounded-xl border transition flex flex-col gap-2 ${
                  isSelected
                    ? "bg-indigo-950/60 border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.25)]"
                    : isUnlocked
                    ? "bg-[#0E1020]/90 border-indigo-500/30 hover:border-indigo-400/60"
                    : "bg-[#090A14]/90 border-zinc-800 opacity-85"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                      style={{
                        backgroundColor: `${cls.accentColor}20`,
                        borderColor: `${cls.accentColor}50`,
                      }}
                    >
                      <EntityIcon type="HERO" companionId={cls.id} size={26} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="font-sans font-extrabold text-xs text-white">
                          {isSanctuary
                            ? cls.sanctuaryName || cls.name
                            : cls.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-400 text-slate-950">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-indigo-300">
                        {isSanctuary
                          ? cls.sanctuaryTitle || cls.title
                          : cls.title}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono shrink-0">
                    <span
                      className="font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10 whitespace-nowrap"
                      style={{ color: cls.accentColor }}
                    >
                      {cls.startingHp} {isSanctuary ? "Life" : "HP"}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-sans text-indigo-100/90 bg-black/30 rounded-lg p-2 border border-white/5">
                  <span
                    className="font-mono font-bold uppercase mr-1"
                    style={{ color: cls.accentColor }}
                  >
                    {isSanctuary
                      ? cls.sanctuaryPassiveName || cls.passiveName
                      : cls.passiveName}
                    :
                  </span>
                  <span>
                    {isSanctuary
                      ? cls.sanctuaryPassiveSummary || cls.passiveSummary
                      : cls.passiveSummary}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {isSelected ? (
                    <span className="text-[10px] font-mono font-bold text-cyan-300">
                      {isSanctuary ? "✓ With you" : "✓ Equipped"}
                    </span>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectClass(cls.id, false);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-[10px] font-extrabold transition active:scale-95"
                    >
                      {isSanctuary
                        ? `Choose ${cls.sanctuaryShortName ?? cls.shortName}`
                        : `Equip ${cls.shortName}`}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectClass(cls.id, true);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 font-mono text-[10px] font-extrabold transition flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>
                          {isSanctuary ? "Try 1 Garden (Free)" : "Try 1 Floor (Free)"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenPassModal();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 text-white font-mono text-[10px] font-extrabold transition flex items-center gap-1 shadow"
                      >
                        <Crown className="w-3 h-3 text-amber-300" />
                        <span>Unlock ($3.99)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-100 font-mono text-xs font-bold transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

interface TopHUDProps {
  mode: GameMode;
  /** Hides the mode tabs and Daily-only bits (the app is Run-only) */
  runOnly?: boolean;
  /** Best stars collected across all Garden Beds (shown in the menu) */
  totalStars?: number;
  /** Opens the Help menu (lessons and guide) */
  onOpenGuide?: () => void;
  /** Companion and line colour picker (looks earned by playing) */
  onOpenLooks?: () => void;
  /** Garden Run: the companion button opens this instead of the old companion drawer */
  onCompanionTap?: () => void;
  /** Otter's cross / Fox's hop on the line being drawn: false = ready, true = used, null = no such move */
  companionMoveUsed?: boolean | null;
  /** Opens the Run leaderboard (Run-only game) */
  onOpenRunLeaderboard?: () => void;
  /** Run-only menu actions */
  onNewRun?: () => void;
  /** Relics that just added to a line's score (they light up briefly) */
  flashRelics?: RelicId[];
  onEndRun?: () => void;
  /** Hides the one-line goal under the stats (e.g. during a lesson) */
  hideGoalLine?: boolean;
  /** Daily is always played with the Keeper (fair scores). */
  isDailyCompanionLocked?: boolean;
  dungeon: DungeonTheme;
  currentFloorIndex: number;
  grid?: GridCell[][];
  hero: HeroStats;
  heroClassId: HeroClassId;
  trialClassFloorActive: boolean;
  activeRelics: RelicId[];
  simulation: PathSimulationResult;
  drawnPathLength: number;
  isResolving: boolean;
  playerStats: DailyPlayerStats;
  monetization: MonetizationState;
  cosmetics: CosmeticPreferences;
  soundEnabled: boolean;
  retractNotice: string | null;
  showTutorial: boolean;
  isInteractiveTutorial?: boolean;
  tutorialStageNumber?: number;
  tutorialStageTitle?: string;
  tutorialCoachBanner?: string;
  onToggleTutorial: (show?: boolean) => void;
  onSkipTutorial?: () => void;
  onSelectTutorialStage?: (stageIdx: number) => void;
  onOpenReferenceManual?: () => void;
  onToggleSound: () => void;
  /** Settings (Run menu): vibration and reduce motion */
  vibrationOn?: boolean;
  onToggleVibration?: () => void;
  reduceMotion?: boolean;
  onToggleReduceMotion?: () => void;
  onSwitchMode: (mode: GameMode) => void;
  onSelectHeroClass: (classId: HeroClassId, isFreeTrial?: boolean) => void;
  onSelectCosmetics: (next: CosmeticPreferences) => void;
  onOpenSanctuaryGallery?: () => void;
  onOpenPassModal: () => void;
  onOpenLeaderboard: () => void;
}

export function TopHUD({
  mode,
  runOnly = false,
  totalStars,
  onOpenGuide,
  onOpenLooks,
  onCompanionTap,
  companionMoveUsed = null,
  hideGoalLine = false,
  onOpenRunLeaderboard,
  onNewRun,
  onEndRun,
  flashRelics = [],
  isDailyCompanionLocked = false,
  dungeon,
  currentFloorIndex,
  grid,
  hero,
  heroClassId,
  trialClassFloorActive,
  activeRelics,
  simulation,
  drawnPathLength,
  isResolving,
  playerStats,
  monetization,
  cosmetics,
  soundEnabled,
  retractNotice,
  showTutorial,
  isInteractiveTutorial = false,
  tutorialStageNumber = 1,
  tutorialStageTitle = "",
  tutorialCoachBanner = "",
  onToggleTutorial,
  onSkipTutorial,
  onSelectTutorialStage,
  onOpenReferenceManual,
  onToggleSound,
  vibrationOn,
  onToggleVibration,
  reduceMotion,
  onToggleReduceMotion,
  onSwitchMode,
  onSelectHeroClass,
  onSelectCosmetics,
  onOpenSanctuaryGallery,
  onOpenPassModal,
  onOpenLeaderboard,
}: TopHUDProps) {
  const [showModifierDetail, setShowModifierDetail] = useState(false);
  const [showStarBreakdown, setShowStarBreakdown] = useState(false);
  const [showCosmeticsDrawer, setShowCosmeticsDrawer] = useState(false);
  const [showCompanionDrawer, setShowCompanionDrawer] = useState(false);
  const [showRunMenu, setShowRunMenu] = useState(false);
  const [openRelic, setOpenRelic] = useState<RelicId | null>(null);

  const isAnyTutorialActive = showTutorial || isInteractiveTutorial;
  // Sanctuary is the game's only voice; the theme setting is a visual skin.
  const visualTheme: VisualThemeMode = cosmetics.visualTheme ?? "SANCTUARY";
  const isSanctuary = true;
  const isSanctuarySkin = visualTheme === "SANCTUARY";

  const stepNarratorText = getLiveStepNarratorText(simulation, isSanctuary);
  const smartCoachTip = getSmartLethalCoachTip(simulation, grid, isSanctuary);

  const modifier = getThemeAwareModifierInfo(dungeon.modifierId, isSanctuary);
  const currentFloor = dungeon.floors[currentFloorIndex] ?? dungeon.floors[0];
  const totalFloors = dungeon.floors.length;
  const isDrawingPreview = drawnPathLength > 1 && !isResolving;
  const expansionUnlocked = hasExpansionAccess(monetization);
  const bankedGold = playerStats.totalBankedGold || 0;
  const showActiveStatusBar =
    isDrawingPreview || isResolving || Boolean(retractNotice);

  const activeClassDef =
    HERO_CLASS_REGISTRY[heroClassId] ?? HERO_CLASS_REGISTRY.KNIGHT;

  const stars = simulation.stars;
  const flawlessHp = getFlawlessHpThreshold(
    hero.maxHp +
      activeRelics.filter((r) => r === "ALCHEMIST_FLASK").length * 4
  );
  const starFlags = [
    {
      earned: stars.star1Survivor,
      label: isSanctuary ? "Star 1 (Keeper)" : "Star 1 (Survivor)",
      desc: isSanctuary
        ? "Reach the Exit with Life ≥ 1"
        : "Reach EXIT with HP ≥ 1",
    },
    {
      earned: stars.star2Greed,
      label: isSanctuary ? "Star 2 (Collector)" : "Star 2 (Greed)",
      desc: isSanctuary
        ? `Collect ≥80% Mosaic Seeds (${stars.goldNodesCollected}/${stars.totalGoldNodesOnFloor})`
        : `Collect ≥80% Floor Gold (${stars.goldNodesCollected}/${stars.totalGoldNodesOnFloor})`,
    },
    {
      earned: stars.star3Flawless,
      label: isSanctuary ? "Star 3 (Full Bloom)" : "Star 3 (Flawless)",
      desc: isSanctuary
        ? `Finish with Life ≥ ${flawlessHp} OR restore 14+ tiles`
        : `Finish with HP ≥ ${flawlessHp} OR visit 14+ cells`,
    },
  ];

  const relicCounts = React.useMemo(() => {
    const counts = new Map<RelicId, number>();
    for (const r of activeRelics) {
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [activeRelics]);

  const handleToggleVisualTheme = () => {
    const nextTheme: VisualThemeMode = isSanctuarySkin ? "TACTICIAN" : "SANCTUARY";
    onSelectCosmetics({
      ...cosmetics,
      visualTheme: nextTheme,
    });
  };

  // Run-only game: one slim row — Companion, the four stats, and a ☰ menu
  if (runOnly && !isInteractiveTutorial) {
    const lowMagic = hero.hp <= Math.max(2, Math.floor(hero.maxHp * 0.3));
    const stats = [
      {
        key: "magic",
        label: "Life",
        icon: <span className="text-[13px] leading-none" aria-hidden="true">❤️</span>,
        value: (
          <>
            {hero.hp}
            <span className="text-[10px] font-bold text-white/40">/{hero.maxHp}</span>
          </>
        ),
        color: lowMagic ? "text-rose-300" : "text-white",
      },
      {
        key: "dew",
        label: "Gloves",
        icon: <EntityIcon type="SHIELD" size={13} />,
        value: heroClassId === "VAMPIRE" ? "—" : hero.shield,
        color: "text-sky-300",
      },
      { key: "sun", label: "Shears", icon: <EntityIcon type="WEAPON" size={13} />, value: hero.weapon, color: "text-amber-300" },
      { key: "gems", label: "Seeds", icon: <span className="text-[12px] leading-none" aria-hidden="true">🌱</span>, value: hero.gold, color: "text-yellow-200" },
    ];
    const menuRow =
      "w-full h-12 px-3 rounded-xl flex items-center gap-3 text-left text-[14px] font-semibold text-white/90 hover:bg-white/[0.06] active:bg-white/[0.1] transition";
    return (
      <div className="w-full max-w-[430px] mx-auto select-none">
        <div className="flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={() => (onCompanionTap ? onCompanionTap() : setShowCompanionDrawer(true))}
            aria-label={`Companion: ${activeClassDef.sanctuaryShortName ?? activeClassDef.shortName}. ${
              onCompanionTap ? "Tap to see its rule." : "Tap to change."
            }${companionMoveUsed === null ? "" : companionMoveUsed ? " Special move used on this line." : " Special move ready."}`}
            className="relative h-11 w-11 shrink-0 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center active:scale-95 transition"
          >
            <EntityIcon type="HERO" companionId={heroClassId} size={22} />
            {companionMoveUsed !== null && (
              <span
                aria-hidden="true"
                className={`absolute top-1 right-1 h-2.5 w-2.5 rounded-full border border-black/40 ${
                  companionMoveUsed ? "bg-white/25" : "bg-lime-300 shadow-[0_0_6px_rgba(190,242,100,0.8)]"
                }`}
              />
            )}
          </button>
          <div className="flex-1 min-w-0 h-11 grid grid-cols-4 rounded-xl bg-white/[0.04] border border-white/[0.07] divide-x divide-white/[0.06]">
            {stats.map((st) => (
              <div key={st.key} className="min-w-0 flex flex-col items-center justify-center" aria-label={`${st.label}`}>
                <div className="flex items-center gap-1 leading-none">
                  {st.icon}
                  <span className={`text-[15px] font-mono font-black leading-none ${st.color}`}>{st.value}</span>
                </div>
                <div className="mt-1 text-[10px] leading-none text-white/45">{st.label}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowRunMenu(true)}
            aria-label="Menu"
            className="relative h-11 w-11 shrink-0 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-white/80 text-lg active:scale-95 transition"
          >
            <span aria-hidden="true">☰</span>

          </button>
        </div>

        {/* Your relics, always in view once you have one: tap for details */}
        {relicCounts.length > 0 && (
          <div className="relative mt-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {relicCounts.map(([relicId, count]) => {
                const rDef = getRelicDisplay(RELIC_REGISTRY[relicId], isSanctuary);
                const lit = flashRelics.includes(relicId);
                const isOpen = openRelic === relicId;
                return (
                  <motion.button
                    key={relicId}
                    type="button"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={lit ? { scale: [1, 1.25, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
                    transition={{ duration: lit ? 0.5 : 0.25 }}
                    onClick={() => setOpenRelic(isOpen ? null : relicId)}
                    aria-label={`${rDef.name}: ${rDef.description}`}
                    aria-expanded={isOpen}
                    className={`relative shrink-0 h-9 min-w-9 px-1.5 rounded-lg border flex items-center justify-center gap-1 text-[17px] transition-colors ${
                      lit
                        ? "bg-teal-300/25 border-teal-200"
                        : isOpen
                        ? "bg-white/[0.1] border-white/30"
                        : "bg-white/[0.04] border-white/[0.08]"
                    }`}
                  >
                    <span aria-hidden="true">{rDef.icon}</span>
                    {count > 1 && <span className="text-[10px] font-black text-teal-200">×{count}</span>}
                  </motion.button>
                );
              })}
            </div>
            {openRelic && relicCounts.some(([id]) => id === openRelic) && (
              <div className="absolute left-0 right-0 top-full mt-1 z-40 rounded-xl bg-[#18213A] border border-white/[0.12] shadow-xl p-2.5 flex gap-2.5">
                <span className="text-2xl leading-7" aria-hidden="true">
                  {getRelicDisplay(RELIC_REGISTRY[openRelic], isSanctuary).icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-white">
                    {getRelicDisplay(RELIC_REGISTRY[openRelic], isSanctuary).name}
                  </div>
                  <div className="text-[12px] leading-snug text-white/70">
                    {getRelicDisplay(RELIC_REGISTRY[openRelic], isSanctuary).description}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenRelic(null)}
                  aria-label="Close"
                  className="h-8 w-8 shrink-0 rounded-lg bg-white/[0.08] flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            )}
          </div>
        )}

        {showRunMenu && (
          <div
            className="fixed inset-0 z-[55] bg-black/60 flex items-end justify-center"
            onClick={() => setShowRunMenu(false)}
          >
            <div
              role="dialog"
              aria-label="Menu"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#121A2E] border border-white/[0.08] p-2"
            >
              <div className="flex items-center justify-between px-2 pt-1 pb-2">
                <div className="text-[15px] font-bold text-white">Menu</div>
                <button
                  type="button"
                  onClick={() => setShowRunMenu(false)}
                  aria-label="Close menu"
                  className="h-9 w-9 rounded-lg bg-white/[0.06] flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white/80" />
                </button>
              </div>

              {totalStars !== undefined && (() => {
                const { rank, next } = getGardenerRank();
                const flame = loadBestClearedAscension();
                return (
                  <div className="mx-1 mb-2 rounded-xl bg-amber-400/[0.07] border border-amber-300/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-amber-100">
                        {rank.icon} {rank.name}
                        {flame > 0 && (
                          <span
                            className="ml-1.5 rounded bg-orange-400/15 px-1 text-[11px] text-orange-200"
                            title={`Season 3 Boss cleared on Ascension ${flame}`}
                          >
                            🔥A{flame}
                          </span>
                        )}
                      </span>
                      <span className="text-[15px] font-mono font-black text-amber-200">⭐ {totalStars}</span>
                    </div>
                    {next && (
                      <div className="text-[11px] text-white/50 mt-0.5">
                        Next: {next.icon} {next.name} — {next.needText}
                      </div>
                    )}
                  </div>
                );
              })()}

              {relicCounts.length > 0 && (
                <div className="mx-1 mb-2 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2 space-y-1.5">
                  <div className="text-[11px] font-semibold text-white/50 px-1">Your relics</div>
                  {relicCounts.map(([relicId, count]) => {
                    const rDef = getRelicDisplay(RELIC_REGISTRY[relicId], isSanctuary);
                    return (
                      <div key={relicId} className="flex gap-2.5 px-1">
                        <span className="text-lg leading-6" aria-hidden="true">{rDef.icon}</span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-white">
                            {rDef.name}
                            {count > 1 && <span className="text-teal-300"> ×{count}</span>}
                          </div>
                          <div className="text-[12px] leading-snug text-white/60">{rDef.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-0.5">
                {onOpenLooks && (
                  <button type="button" className={menuRow} onClick={() => { setShowRunMenu(false); onOpenLooks(); }}>
                    <span className="w-6 text-center" aria-hidden="true">🎨</span> Companions &amp; looks
                    <span className="ml-auto text-[12px] text-white/50">Rules · line</span>
                  </button>
                )}
                {onOpenGuide && (
                  <button type="button" className={menuRow} onClick={() => { setShowRunMenu(false); onOpenGuide(); }}>
                    <span className="w-6 text-center" aria-hidden="true">❓</span> How to play
                  </button>
                )}
                {onOpenRunLeaderboard && (
                  <button type="button" className={menuRow} onClick={() => { setShowRunMenu(false); onOpenRunLeaderboard(); }}>
                    <Trophy className="w-5 h-5 mx-0.5 text-amber-300" /> Leaderboard
                  </button>
                )}
                {FEEDBACK_URL && (
                  <a
                    href={FEEDBACK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={menuRow}
                    onClick={() => {
                      track("feedback_open");
                      setShowRunMenu(false);
                    }}
                  >
                    <span className="w-6 text-center" aria-hidden="true">💬</span> Send feedback
                    <span className="ml-auto text-[12px] text-white/50">2 min</span>
                  </a>
                )}
                <div className="px-3 pt-2 pb-0.5 text-[11px] font-semibold text-white/40">Settings</div>
                <button type="button" className={menuRow} onClick={onToggleSound}>
                  {soundEnabled ? <Volume2 className="w-5 h-5 mx-0.5 text-white/80" /> : <VolumeX className="w-5 h-5 mx-0.5 text-white/50" />}
                  Sound
                  <span className="ml-auto text-[12px] text-white/50">{soundEnabled ? "On" : "Off"}</span>
                </button>
                <button type="button" className={menuRow} onClick={handleToggleVisualTheme}>
                  <span className="w-6 text-center" aria-hidden="true">{isSanctuarySkin ? "🌸" : "🌙"}</span>
                  Board look
                  <span className="ml-auto text-[12px] text-white/50">{isSanctuarySkin ? "Garden" : "Night"}</span>
                </button>
                {onToggleVibration && (
                  <button type="button" className={menuRow} onClick={onToggleVibration} aria-pressed={vibrationOn}>
                    <span className="w-6 text-center" aria-hidden="true">📳</span>
                    Vibration
                    <span className="ml-auto text-[12px] text-white/50">{vibrationOn ? "On" : "Off"}</span>
                  </button>
                )}
                {onToggleReduceMotion && (
                  <button type="button" className={menuRow} onClick={onToggleReduceMotion} aria-pressed={reduceMotion}>
                    <span className="w-6 text-center" aria-hidden="true">🍃</span>
                    Reduce motion
                    <span className="ml-auto text-[12px] text-white/50">{reduceMotion ? "On" : "Off"}</span>
                  </button>
                )}
                <div className="px-3 pt-2 pb-0.5 text-[11px] font-semibold text-white/40">Garden Run</div>
                {onNewRun && (
                  <button type="button" className={menuRow} onClick={() => { setShowRunMenu(false); onNewRun(); }}>
                    <RefreshCw className="w-5 h-5 mx-0.5 text-white/80" /> New Garden Run
                  </button>
                )}
                {onEndRun && (
                  <button type="button" className={`${menuRow} !text-rose-200`} onClick={() => { setShowRunMenu(false); onEndRun(); }}>
                    <span className="w-6 text-center" aria-hidden="true">🌙</span> End this Garden Run
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <CompanionDrawerModal
          isOpen={showCompanionDrawer}
          currentClassId={heroClassId}
          isSanctuary={isSanctuary}
          expansionUnlocked={expansionUnlocked}
          trialClassFloorActive={trialClassFloorActive}
          onSelectClass={onSelectHeroClass}
          onOpenPassModal={onOpenPassModal}
          onClose={() => setShowCompanionDrawer(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[430px] mx-auto flex flex-col gap-1 sm:gap-1.5 select-none">
      {/* ROW 1: Game Title / Theme Pill (Left) + Gallery & Icon Buttons (Right) */}
      <div className={`flex items-center justify-between gap-1 bg-[#121320]/80 backdrop-blur-md border border-indigo-500/20 rounded-xl shadow-lg ${runOnly ? "pl-2 pr-1 py-1" : "px-2.5 py-1 sm:py-1.5"}`}>
        {/* Left: Brand Icon + Title */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isSanctuary
                ? "bg-amber-300 shadow-[0_0_8px_#FDE68A]"
                : "bg-cyan-400 shadow-[0_0_8px_#00D2FF]"
            }`}
          />
          <span
            className={
              runOnly
                ? "text-[12px] min-[360px]:text-[13px] font-sans font-extrabold text-white whitespace-nowrap"
                : "text-[11px] font-sans font-black tracking-wide uppercase text-white whitespace-nowrap"
            }
          >
            {isSanctuary ? "Bloomline" : "1-Stroke Tactician"}
          </span>
        </div>

        {/* Right: Gallery, Theme Toggle, Streak, Sound */}
        <div className={`flex items-center shrink-0 ${runOnly ? "gap-1" : "gap-1.5"}`}>
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              title="Help: lessons and the full guide"
              aria-label="Help"
              className="flex items-center gap-1 h-9 min-w-9 justify-center px-1.5 min-[360px]:px-2 rounded-lg bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-300/40 text-[11px] font-mono font-extrabold text-emerald-100 active:scale-95 transition"
            >
              <span aria-hidden="true">❓</span>
              <span className="hidden min-[360px]:inline">Help</span>
            </button>
          )}

          {onOpenRunLeaderboard && (
            <button
              type="button"
              onClick={onOpenRunLeaderboard}
              title="Leaderboard"
              aria-label="Leaderboard"
              className="flex items-center h-9 min-w-9 justify-center px-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-300/35 active:scale-95 transition"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
            </button>
          )}

          {/* Sleek 💎 Gallery Button */}
          {onOpenSanctuaryGallery && (
            <button
              type="button"
              onClick={onOpenSanctuaryGallery}
              title="Open Sanctuary Seed Mosaic Gallery"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-300/40 text-[10px] font-mono font-extrabold text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.2)] active:scale-95 transition"
            >
              <span>🌰</span>
              <span className="hidden xs:inline">Gallery</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={handleToggleVisualTheme}
            title={
              isSanctuarySkin
                ? "Switch to the Night board skin"
                : "Switch to the Garden board skin"
            }
            aria-label={isSanctuarySkin ? "Board skin: Garden" : "Board skin: Night"}
            className={`${runOnly ? "h-9 min-w-9 justify-center px-1.5" : "px-2 py-1"} rounded-lg border text-[10px] font-mono font-bold transition active:scale-95 flex items-center gap-1 ${
              isSanctuarySkin
                ? "bg-amber-400/20 border-amber-300/50 text-amber-100"
                : "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
            }`}
          >
            <span>{isSanctuarySkin ? "🌸" : "🌙"}</span>
            {!runOnly && (
              <span className="hidden xs:inline">
                {isSanctuarySkin ? "Garden" : "Night"}
              </span>
            )}
          </button>

          {/* Today's board (Daily leaderboard) */}
          {!runOnly && (mode === "DAILY" || mode === "ARCHIVE") && !isAnyTutorialActive && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              title="Today's board"
              aria-label="Today's board"
              className="flex items-center px-2 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-300/35 active:scale-95 transition"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
            </button>
          )}

          {/* Daily Streak */}
          {!runOnly && (
          <div
            title="Daily Streak"
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-mono font-bold"
          >
            <Flame className="w-3 h-3 fill-amber-400/25 text-amber-400" />
            <span>{playerStats.currentStreak}</span>
          </div>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? "Mute Audio" : "Enable Audio"}
            aria-label={soundEnabled ? "Mute sound" : "Turn sound on"}
            className={`${runOnly ? "h-9 min-w-9 flex items-center justify-center" : "p-1.5"} rounded-lg bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white transition`}
          >
            {soundEnabled ? (
              <Volume2 className={`${runOnly ? "w-4 h-4" : "w-3.5 h-3.5"} text-cyan-400`} />
            ) : (
              <VolumeX className={`${runOnly ? "w-4 h-4" : "w-3.5 h-3.5"} text-zinc-500`} />
            )}
          </button>
        </div>
      </div>

      {/* ROW 2: Full-Width 4-Tab Segmented Mode Control */}
      {!runOnly && (
      <div className="flex items-center justify-between gap-1 bg-[#0F101C]/80 backdrop-blur-md border border-indigo-500/20 rounded-xl p-1 shadow-md">
        <button
          type="button"
          disabled={isResolving}
          onClick={() => {
            onToggleTutorial(false);
            onSwitchMode("DAILY");
          }}
          className={`flex-1 py-1 sm:py-1.5 text-center rounded-lg text-[10px] font-mono font-bold transition active:scale-95 ${
            !isAnyTutorialActive && (mode === "DAILY" || mode === "ARCHIVE")
              ? "bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.45)]"
              : "text-indigo-200/70 hover:text-white hover:bg-white/5"
          }`}
        >
          DAILY
        </button>

        <button
          type="button"
          disabled={isResolving}
          onClick={() => {
            onToggleTutorial(false);
            onSwitchMode("SANDBOX");
          }}
          className={`flex-1 py-1 sm:py-1.5 text-center rounded-lg text-[10px] font-mono font-bold transition active:scale-95 ${
            !isAnyTutorialActive && mode === "SANDBOX"
              ? "bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.45)]"
              : "text-indigo-200/70 hover:text-white hover:bg-white/5"
          }`}
        >
          SANDBOX
        </button>

        <button
          type="button"
          disabled={isResolving}
          onClick={() => {
            onToggleTutorial(false);
            onSwitchMode("RUN");
          }}
          className={`flex-1 py-1 sm:py-1.5 text-center rounded-lg text-[10px] font-mono font-bold transition active:scale-95 ${
            !isAnyTutorialActive && mode === "RUN"
              ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(52,211,153,0.45)]"
              : "text-emerald-300/90 hover:text-white hover:bg-white/5"
          }`}
        >
          RUN
        </button>

        <button
          type="button"
          disabled={isResolving}
          onClick={() => {
            if (expansionUnlocked) {
              onToggleTutorial(false);
              onSwitchMode("GAUNTLET");
            } else {
              onOpenPassModal();
            }
          }}
          className={`flex-1 py-1 sm:py-1.5 text-center rounded-lg text-[10px] font-mono font-bold transition active:scale-95 flex items-center justify-center gap-0.5 ${
            !isAnyTutorialActive && mode === "GAUNTLET"
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-black shadow-[0_0_12px_rgba(168,85,247,0.45)]"
              : "text-violet-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>GAUNTLET</span>
          {!expansionUnlocked && (
            <Lock className="w-2.5 h-2.5 opacity-80" />
          )}
        </button>

        <button
          type="button"
          disabled={isResolving}
          onClick={() => onToggleTutorial(!isAnyTutorialActive)}
          className={`flex-1 py-1 sm:py-1.5 text-center rounded-lg text-[10px] font-mono font-bold transition active:scale-95 ${
            isAnyTutorialActive
              ? "bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.45)]"
              : "text-cyan-300/80 hover:text-cyan-200 hover:bg-white/5"
          }`}
        >
          TUTORIAL
        </button>
      </div>
      )}

      {/* ROW 3: Floor & Modifier Pill + Companion Picker & 4 Stat Pills */}
      <div className={`flex flex-col bg-[#121320]/80 backdrop-blur-md border border-indigo-500/20 rounded-xl shadow-lg ${runOnly ? "gap-1 p-1" : "gap-1 sm:gap-1.5 p-1.5 sm:p-2"}`}>
        {runOnly && !isInteractiveTutorial && (
          <div className="grid grid-cols-[2.75rem_repeat(4,minmax(0,1fr))] gap-1">
            <button
              type="button"
              onClick={() => setShowCompanionDrawer(true)}
              aria-label={`Companion: ${activeClassDef.sanctuaryShortName ?? activeClassDef.shortName}. Tap to change.`}
              title="Switch Companion"
              className="relative h-11 rounded-lg bg-[#0E1022] border border-amber-400/40 flex items-center justify-center active:scale-95 transition"
            >
              <EntityIcon type="HERO" companionId={heroClassId} size={22} />
              <span className="absolute bottom-0.5 right-1 text-[9px] leading-none text-amber-200/80" aria-hidden="true">▾</span>
            </button>
            {[
              {
                key: "magic",
                label: "Life",
                icon: <span className="text-[13px] leading-none">❤️</span>,
                value: (
                  <>
                    {hero.hp}
                    <span className="text-[10px] font-bold text-white/55">/{hero.maxHp}</span>
                  </>
                ),
                color: "text-white",
                box: "bg-[#1A1530]/80 border-rose-400/35",
              },
              {
                key: "dew",
                label: "Gloves",
                icon: <EntityIcon type="SHIELD" size={14} />,
                value: heroClassId === "VAMPIRE" ? "—" : hero.shield,
                color: "text-[#38BDF8]",
                box: "bg-[#142038]/80 border-sky-400/35",
              },
              {
                key: "sun",
                label: "Shears",
                icon: <EntityIcon type="WEAPON" size={14} />,
                value: hero.weapon,
                color: "text-[#FBBF24]",
                box: "bg-[#231B2E]/80 border-amber-400/35",
              },
              {
                key: "gems",
                label: "Seeds",
                icon: <span className="text-[13px] leading-none" aria-hidden="true">🌱</span>,
                value: hero.gold,
                color: "text-[#FACC15]",
                box: "bg-[#221D32]/80 border-yellow-300/40",
              },
            ].map((st) => (
              <div
                key={st.key}
                className={`h-11 min-w-0 rounded-lg border px-1 flex flex-col items-center justify-center ${st.box}`}
              >
                <div className="flex items-center gap-1 leading-none">
                  {st.icon}
                  <span className={`text-[15px] font-mono font-black leading-none ${st.color}`}>
                    {st.value}
                  </span>
                </div>
                <div className="mt-1 text-[10px] font-sans font-bold leading-none text-white/70">
                  {st.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top of Row 2: Floor & Theme-Aware Modifier Pill Bar */}
        {!runOnly && (
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Floor Stepper */}
            {isInteractiveTutorial ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/25 border border-cyan-400 text-white shadow-[0_0_8px_rgba(34,211,238,0.35)]">
                T{tutorialStageNumber}/7
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/25 border border-violet-400 text-white shadow-[0_0_8px_rgba(139,92,246,0.35)]">
                {isSanctuary ? "G" : "F"}
                {currentFloorIndex + 1}
                {mode === "RUN" ? "" : `/${totalFloors}`}
              </span>
            )}

            {/* Live 3-Star Mastery Indicator */}
            {mode !== "RUN" && (
            <button
              type="button"
              onClick={() => setShowStarBreakdown((prev) => !prev)}
              title="Live 3-Star Mastery (Tap for targets)"
              className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-[#0A0B14] border border-amber-400/30 hover:border-amber-300 transition"
            >
              {starFlags.map((st, idx) => (
                <Star
                  key={idx}
                  className={`w-3 h-3 ${
                    st.earned
                      ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]"
                      : "text-indigo-400/25"
                  }`}
                />
              ))}
            </button>
            )}
          </div>

          {/* Consolidated Theme-Aware Modifier Pill */}
          {!isInteractiveTutorial && (
            <button
              type="button"
              onClick={() => setShowModifierDetail((prev) => !prev)}
              title="Tap for modifier details & tactical tips"
              className="flex-1 min-w-0 flex items-center justify-between gap-1 px-2 py-0.5 rounded-lg bg-[#0A0B14]/80 border border-white/10 hover:border-indigo-400/40 text-[10px] font-mono transition"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: modifier.accentColor,
                    boxShadow: `0 0 6px ${modifier.accentColor}`,
                  }}
                />
                <span
                  className="font-extrabold uppercase truncate"
                  style={{ color: modifier.accentColor }}
                >
                  {modifier.shortTag}
                </span>
              </div>
              <Info className="w-3 h-3 text-indigo-300/70 shrink-0" />
            </button>
          )}

          {/* Compact Companion Picker Pill Button */}
          <button
            type="button"
            onClick={() => setShowCompanionDrawer(true)}
            title={
              isDailyCompanionLocked
                ? "Today's Daily is played with the Keeper. Other companions play in Free Play."
                : "Switch Companion"
            }
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0E1022] hover:bg-[#151832] border border-amber-400/35 text-[10px] font-mono font-bold text-amber-200 transition active:scale-95 shrink-0"
          >
            <EntityIcon type="HERO" companionId={heroClassId} size={13} />
            <span className="truncate max-w-[65px]">
              {activeClassDef.sanctuaryShortName ?? activeClassDef.shortName}
            </span>
            {isDailyCompanionLocked ? (
              <Lock className="w-2.5 h-2.5 opacity-70" />
            ) : (
              <span className="text-[8px] opacity-70">▾</span>
            )}
          </button>
        </div>
        )}

        {/* Bottom of Row 2: The 4 Unified Stat Pills with EntityIcon */}
        {!(runOnly && !isInteractiveTutorial) && (
        <div className="grid grid-cols-4 gap-1.5">
          {/* Life / HP */}
          <div
            className={`rounded-lg px-1.5 py-0.5 sm:py-1 flex items-center justify-between gap-0.5 min-w-0 border ${
              isSanctuary
                ? "bg-[#1A1530]/80 border-rose-400/30 text-rose-100"
                : "bg-[#121320]/80 border-red-500/30 text-red-100"
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-[11px] leading-none">{isSanctuary ? "❤️" : "❤️"}</span>
              <span className="text-[9px] font-sans font-bold uppercase opacity-80">
                {isSanctuary ? "LIFE" : "HP"}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-white">
              {hero.hp}
              <span className="text-[9px] opacity-50">/{hero.maxHp}</span>
            </span>
          </div>

          {/* Shield / SHD */}
          <div
            className={`rounded-lg px-1.5 py-0.5 sm:py-1 flex items-center justify-between gap-0.5 min-w-0 border ${
              isSanctuary
                ? "bg-[#142038]/80 border-sky-400/30 text-sky-100"
                : "bg-[#121320]/80 border-cyan-500/30 text-cyan-100"
            }`}
          >
            <div className="flex items-center gap-1">
              <EntityIcon type="SHIELD" size={13} />
              <span className="text-[9px] font-sans font-bold uppercase opacity-80">
                {isSanctuary ? "SHIELD" : "SHD"}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-[#38BDF8]">
              {heroClassId === "VAMPIRE"
                ? isSanctuary
                  ? "—"
                  : "0🩸"
                : hero.shield}
            </span>
          </div>

          {/* Power / WPN */}
          <div
            className={`rounded-lg px-1.5 py-0.5 sm:py-1 flex items-center justify-between gap-0.5 min-w-0 border ${
              isSanctuary
                ? "bg-[#231B2E]/80 border-amber-400/30 text-amber-100"
                : "bg-[#121320]/80 border-amber-500/30 text-amber-100"
            }`}
          >
            <div className="flex items-center gap-1">
              <EntityIcon type="WEAPON" size={13} />
              <span className="text-[9px] font-sans font-bold uppercase opacity-80">
                {isSanctuary ? "SUN" : "WPN"}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-[#FBBF24]">
              {hero.weapon}
            </span>
          </div>

          {/* Gems / GLD */}
          <div
            onClick={isSanctuary ? onOpenSanctuaryGallery : undefined}
            className={`rounded-lg px-1.5 py-0.5 sm:py-1 flex items-center justify-between gap-0.5 min-w-0 border cursor-pointer ${
              isSanctuary
                ? "bg-[#221D32]/80 border-yellow-300/35 hover:border-amber-300 text-yellow-100"
                : "bg-[#121320]/80 border-yellow-500/30 hover:border-yellow-400 text-yellow-100"
            }`}
          >
            <div className="flex items-center gap-1">
              <EntityIcon type="GOLD" size={13} />
              <span className="text-[9px] font-sans font-bold uppercase opacity-80">
                {isSanctuary ? "GEMS" : "GLD"}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-[#FACC15]">
              {hero.gold}
            </span>
          </div>
        </div>
        )}

        {/* Today's goal in one line (stars), instead of the score formula */}
        {!runOnly && !isInteractiveTutorial && !hideGoalLine && mode === "RUN" && (
          <div className="text-[10px] font-sans text-indigo-100/80 leading-tight truncate">
            <span className="text-amber-300 font-bold">Goal:</span> beat the target ·
            end every stroke on the 🌈
          </div>
        )}
        {!isInteractiveTutorial && mode !== "RUN" && (
          <div className="text-[10px] font-sans text-indigo-100/80 leading-tight truncate">
            <span className="text-amber-300 font-bold">Goal:</span> reach the 🌈
            Exit
            {stars.totalGoldNodesOnFloor > 0
              ? ` · ★ ${Math.ceil(stars.totalGoldNodesOnFloor * 0.8)}+ 🌰`
              : ""}
            {` · ★ finish with ${flawlessHp}+ ❤️ or 14 tiles`}
          </div>
        )}

        {/* Optional Expanded Modifier Rule Tooltip */}
        {showModifierDetail && !isInteractiveTutorial && (
          <div className="pt-1.5 border-t border-indigo-500/20 text-[10px] space-y-0.5">
            <p className="text-white font-sans">{modifier.description}</p>
            <p className="font-mono text-cyan-300">
              TIP: {modifier.tacticalHint}
            </p>
          </div>
        )}

        {/* Optional 3-Star Targets Tooltip */}
        {showStarBreakdown && !showTutorial && (
          <div className="pt-1.5 border-t border-amber-500/20 text-[10px] font-mono space-y-0.5">
            {starFlags.map((st, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between ${
                  st.earned
                    ? "text-emerald-300 font-bold"
                    : "text-indigo-200/60"
                }`}
              >
                <span>
                  {st.earned ? "★" : "☆"} {st.label}
                </span>
                <span>{st.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Active Drafted Relics Row (shown only when 1+ Relics are active) */}
        {!isInteractiveTutorial && relicCounts.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-indigo-500/15">
            <span className="text-[10px] font-mono font-bold uppercase text-indigo-300/70 shrink-0">
              {runOnly ? "Relics" : isSanctuary ? "BLESSINGS:" : "RELICS:"}
            </span>
            {relicCounts.map(([relicId, count]) => {
              const rDef = getRelicDisplay(RELIC_REGISTRY[relicId], isSanctuary);
              return (
                <div
                  key={relicId}
                  title={rDef.description}
                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md bg-[#0A0B14] border border-white/10 text-[10px] font-mono font-bold text-white shrink-0 whitespace-nowrap"
                >
                  <span>{rDef.icon}</span>
                  <span>{rDef.name}</span>
                  {count > 1 && (
                    <span className="text-amber-300 font-black">×{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Ghost Preview Status Bar (Only appears while drawing, resolving, or retract notice) */}
      {showActiveStatusBar && !showTutorial && !runOnly && (
        <div
          className={`rounded-xl px-2.5 py-1.5 backdrop-blur-md border transition flex items-center justify-between gap-2 ${
            isDrawingPreview
              ? simulation.firstDeathCoord
                ? isSanctuary
                  ? "bg-amber-500/20 border-amber-400 text-amber-50 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
                  : "bg-[#F43F5E]/20 border-[#F43F5E] text-white shadow-[0_0_16px_rgba(244,63,94,0.35)]"
                : simulation.canCommit
                ? "bg-[#8B5CF6]/25 border-[#8B5CF6] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]"
                : "bg-[#121320]/90 border-[#00D2FF]/50 text-cyan-50 shadow-[0_0_14px_rgba(0,210,255,0.2)]"
              : retractNotice
              ? "bg-amber-500/15 border-amber-500/50 text-amber-200"
              : "bg-[#121320]/80 border-[#2A2D4A] text-indigo-200/75"
          }`}
        >
          {isDrawingPreview ? (
            <>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {simulation.firstDeathCoord ? (
                  isSanctuary ? (
                    <span className="text-sm shrink-0">❤️</span>
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F43F5E] shrink-0 animate-pulse" />
                  )
                ) : simulation.canCommit ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Compass className="w-3.5 h-3.5 text-[#00D2FF] shrink-0 animate-spin-slow" />
                )}
                <div className="min-w-0 flex-1 flex flex-col">
                  <div className="text-[10px] font-sans font-bold text-white truncate leading-tight">
                    {stepNarratorText}
                  </div>
                  <div className="text-[9px] font-mono truncate leading-tight">
                    {simulation.firstDeathCoord ? (
                      <span
                        className={
                          isSanctuary
                            ? "text-amber-200 font-semibold"
                            : "text-rose-200 font-semibold"
                        }
                      >
                        {smartCoachTip}
                      </span>
                    ) : simulation.canCommit ? (
                      <span className="text-emerald-300 font-bold">
                        {isSanctuary
                          ? `🌈 ARCHWAY LINKED · ${stars.totalStars}/3 ★`
                          : `EXIT LINKED · ${stars.totalStars}/3 ★`}
                      </span>
                    ) : (
                      <span className="text-indigo-200/80">
                        {isSanctuary
                          ? `GARDEN PATH · ${drawnPathLength - 1} STEPS`
                          : `TRAIL · ${drawnPathLength - 1} STEPS`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Projected Stats */}
              <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] font-black">
                <span
                  className={`px-1.5 py-0.5 rounded border ${
                    simulation.projectedHp <= 0
                      ? isSanctuary
                        ? "bg-amber-500/35 border-amber-300/60 text-amber-100"
                        : "bg-[#F43F5E] border-white/30 text-white"
                      : "bg-[#0A0B14]/80 border-emerald-400/40 text-emerald-400"
                  }`}
                >
                  {isSanctuary ? "❤️" : "HP:"} {simulation.projectedHp}/
                  {hero.maxHp}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#0A0B14]/80 border border-yellow-500/40 text-[#FACC15]">
                  {isSanctuary ? "🌰" : "GLD:"} {simulation.projectedGold}
                </span>
              </div>
            </>
          ) : isResolving ? (
            <div className="w-full flex items-center justify-between text-xs font-mono text-cyan-300">
              <span className="animate-pulse font-bold">
                {isSanctuary
                  ? "🌸 BLOOMING CRYSTAL PATH..."
                  : "⚡ EXECUTING NEON STROKE..."}
              </span>
              <span>{isSanctuary ? "" : "180ms / STEP"}</span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between text-xs font-mono">
              <span>❤️ {retractNotice}</span>
              <span className="text-[10px] text-amber-300/80">Re-draw</span>
            </div>
          )}
        </div>
      )}

      {/* Companion Drawer Modal */}
      <CompanionDrawerModal
        isOpen={showCompanionDrawer}
        currentClassId={heroClassId}
        isSanctuary={isSanctuary}
        expansionUnlocked={expansionUnlocked}
        trialClassFloorActive={trialClassFloorActive}
        onSelectClass={onSelectHeroClass}
        onOpenPassModal={onOpenPassModal}
        onClose={() => setShowCompanionDrawer(false)}
      />
    </div>
  );
}

interface BottomControlsProps {
  mode: GameMode;
  visualTheme?: VisualThemeMode;
  isResolving: boolean;
  hintsRemaining: number;
  onRequestHint: () => void;
  onResetFloorStroke: () => void;
  onRestartRun: () => void;
  onNewSandboxDungeon: () => void;
  onForfeitRun: () => void;
}

export function BottomControls({
  mode,
  visualTheme = "SANCTUARY",
  isResolving,
  hintsRemaining,
  onRequestHint,
  onResetFloorStroke,
  onRestartRun,
  onNewSandboxDungeon,
  onForfeitRun,
}: BottomControlsProps) {
  void visualTheme;
  const isSanctuary = true;
  return (
    <div className="w-full max-w-[430px] mx-auto flex flex-col gap-1.5 select-none">
      {/* Clean Tactile Action Row */}
      <div
        className={
          mode === "RUN"
            ? "grid grid-cols-2 gap-2 [&>button]:w-full [&>button]:min-w-0 [&>button]:justify-center [&>button]:px-1"
            : "flex items-center justify-between gap-1.5"
        }
      >
        <button
          type="button"
          disabled={isResolving}
          onClick={onResetFloorStroke}
          className={mode === "RUN" ? "h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[13px] font-semibold text-white/85 active:scale-95 transition disabled:opacity-40" : "flex-1 h-10 px-2 rounded-xl whitespace-nowrap bg-[#131526]/80 hover:bg-[#1C1F3A]/90 border border-indigo-500/40 text-[11px] font-mono font-bold text-indigo-200 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.15)] active:scale-95 transition disabled:opacity-40"}
        >
          {mode === "RUN" ? "Clear line" : "CLEAR LINE"}
        </button>

        <button
          type="button"
          disabled={isResolving || hintsRemaining <= 0}
          onClick={onRequestHint}
          title="Highlight 3 safe steps of a winning path for 5 seconds"
          className={mode === "RUN" ? "h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[13px] font-semibold text-amber-200 active:scale-95 transition disabled:opacity-35 flex items-center gap-1.5" : "h-10 px-2 rounded-xl whitespace-nowrap bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-[11px] font-mono font-extrabold text-amber-300 hover:text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 transition disabled:opacity-35 flex items-center gap-1.5"}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {mode === "RUN" ? `Hint · ${hintsRemaining}` : `Hint (${hintsRemaining})`}
          </span>
        </button>

        {mode !== "RUN" && (
          <>
        <button
          type="button"
          disabled={isResolving}
          onClick={onRestartRun}
          className="h-10 px-2 rounded-xl whitespace-nowrap bg-[#131526]/80 hover:bg-[#1C1F3A]/90 border border-indigo-500/40 text-[11px] font-mono font-bold text-indigo-200 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.15)] active:scale-95 transition flex items-center justify-center gap-1 disabled:opacity-40"
        >
          <RefreshCw className="w-3 h-3 text-cyan-400" />
          <span>{isSanctuary ? "RESTART" : "RESET"}</span>
        </button>

        <button
          type="button"
          disabled={isResolving}
          onClick={onForfeitRun}
          className="h-10 px-2 rounded-xl whitespace-nowrap bg-[#131526]/80 hover:bg-[#2A1526]/90 border border-indigo-500/40 hover:border-red-500/50 text-[11px] font-mono font-bold text-indigo-200 hover:text-red-200 shadow-[0_0_15px_rgba(99,102,241,0.15)] active:scale-95 transition disabled:opacity-40 flex items-center"
        >
          {isSanctuary ? "END VISIT" : "END RUN"}
        </button>
          </>
        )}

        {mode !== "DAILY" && mode !== "RUN" && (
          <button
            type="button"
            disabled={isResolving}
            onClick={onNewSandboxDungeon}
            className="h-10 px-2 rounded-xl whitespace-nowrap bg-[#131526]/80 hover:bg-[#1C1F3A]/90 border border-indigo-500/40 text-[11px] font-mono font-bold text-indigo-200 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.15)] active:scale-95 transition flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span>{isSanctuary ? "NEW GARDEN" : "SEED"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
