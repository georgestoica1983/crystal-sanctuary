"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CosmeticPreferences,
  DailyPlayerStats,
  DungeonTheme,
  FloorHistoryRecord,
  FloorStarBreakdown,
  GameMode,
  GamePhase,
  GridCell,
  GridCoord,
  HeroClassId,
  HeroStats,
  LeaderboardEntry,
  ModifierId,
  MonetizationState,
  BossRuleId,
  FloorScoreBreakdown,
  RelicCounters,
  RelicId,
  RelicScoreContext,
  RunGardenState,
  RunUpgrades,
  SeedTile,
  ShopOffer,
} from "@/types/game";
import {
  BOSS_RULE_REGISTRY,
  countPathBlinks,
  countPathSelfCrosses,
  RUN_SEED_BAG_SIZE,
  calculateFloorScoreBreakdown,
  findEntityCoord,
  calculateRunScore,
  DAILY_COMPANION,
  DailyShopLoadout,
  generateShopOffers,
  getGardenClearReward,
  getParPercent,
  NO_RUN_UPGRADES,
  pickLegendaryRelic,
  SHOP_REROLL_COST,
  SHOP_STAT_BOOSTS,
  isPerfectFloor,
  replayDailyProgress,
  findSurvivableHintPath,
  generateDeterministicDungeon,
  generateGauntletDungeon,
  generateShareCardAscii,
  getInitialHeroStatsForClass,
  getNextFloorHeroStats,
  getTodayDateKey,
  HERO_CLASS_REGISTRY,
  isSameCoord,
  MODIFIER_LIST,
  RELIC_REGISTRY,
  simulatePath,
  getRunGardenLabel,
  hasSurvivableRunLine,
  refillRunGarden,
  RUN_STROKES_PER_GARDEN,
  RUN_WEEDOUT_MAX_TILES,
  saveRunBestRecord,
  getRunGardenPosition,
  getRunGardenTarget,
  getRunRerollCost,
  explainWilt,
} from "@/lib/engine";
import { soundEngine } from "@/lib/audio";
import { getRelicDisplay } from "@/lib/sanctuaryCopy";
import { completedRelicSets, RELIC_SET_X, RELIC_TAG_INFO } from "@/lib/relicTags";
import {
  requestDailyPar,
  requestFloorPar,
  requestParLine,
} from "@/lib/parClient";
import {
  addBankedGold,
  DEFAULT_COSMETIC_PREFS,
  DEFAULT_MONETIZATION_STATE,
  DEFAULT_PLAYER_STATS,
  fetchDailyLeaderboard,
  hasExpansionAccess,
  loadCosmeticPreferences,
  loadMonetizationState,
  loadPlayerStats,
  saveCosmeticPreferences,
  saveDailyRunCompletion,
  getOrCreatePlayerId,
  hasOfficialDailyResult,
  loadDailyProgress,
  saveDailyProgress,
  saveMonetizationState,
  sendRestoreLink,
  startExpansionCheckout,
  completeRestoreFromMagicLink,
  fetchExpansionEntitlement,
  submitDailyLeaderboardScore,
} from "@/lib/supabase";
import GridCanvas from "@/components/GridCanvas";
import { BottomControls, TopHUD } from "@/components/HUD";
import {
  LeaderboardModal,
  PassAndCrafterModal,
  RunSummaryModal,
} from "@/components/Modals";
import ShopModal from "@/components/ShopModal";
import ScoreTally from "@/components/ScoreTally";
import TutorialView from "@/components/TutorialView";
import RunGuide, { RUN_GUIDE_STORAGE_KEY } from "@/components/RunGuide";
import RunLeaderboardModal from "@/components/RunLeaderboard";
import { submitRunToLeaderboard } from "@/lib/runLeaderboard";
import LineMeter from "@/components/LineMeter";
import LineCompare from "@/components/LineCompare";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  FIRST_LINE_DONE_KEY,
  getLineTier,
  LONG_LINE_LEARNED_KEY,
  LONG_LINE_LEARNED_TILES,
  SEEN_TILE_INTROS_KEY,
  SHORT_LINE_NUDGE_TILES,
  TILE_INTRO_ORDER,
  TILE_INTROS,
} from "@/lib/lineTiers";
import EntityIcon from "@/components/EntityIcon";
import {
  applyRunShopPrune,
  applyRunShopPurchase,
  applyRunShopReroll,
  applyRunShopSell,
  createNextRunGarden,
  createRunLog,
  getRunBloomResult,
  packCoords,
  RunActionLog,
  RunLogAction,
  RUN_LOG_VERSION,
  RUN_PRUNE_COST,
  runClearLifeFor,
  runRulesAllowPrune,
  runRulesUseRelicSets,
  runModifierFor,
  scoreRunStroke,
  startRunGarden,
} from "@/lib/runReplay";
import { clearRunSave, readRunSave, rebuildRunFromSave, writeRunSave } from "@/lib/runSave";
import {
  LessonResultInfo,
  PracticeCoach,
  isPracticeOverlayStep,
  PracticeStep,
  RunHelpMenu,
  RunLessonCoach,
  RunLessonControls,
  RunLessonResult,
} from "@/components/RunTutorialUI";
import {
  PRACTICE_GARDEN_GEMS,
  PRACTICE_GARDEN_SEED,
  PRACTICE_GARDEN_TARGET,
  RUN_LESSONS,
  RUN_LESSONS_DONE_KEY,
  RunLesson,
} from "@/lib/runLessons";

/** The walkthrough lesson that opens with the "how to score big" demo */
const DEMO_LESSON_ID = "chips-mult";
import { loadBestStars, saveBestStars, totalBestStars } from "@/lib/runStars";
import {
  CLASS_COMPANION,
  getNextStarUnlocks,
  isCompanionUnlocked,
  loadChosenCompanion,
  loadUnlockProgress,
  recordBedReached,
  saveChosenCompanion,
  takeNewUnlocks,
  unlockedRunCompanions,
} from "@/lib/unlocks";
import LooksModal from "@/components/LooksModal";
import { applyReduceMotion, loadReduceMotion, saveReduceMotion } from "@/lib/motionPrefs";
import { track } from "@/lib/analytics";
import {
  ASCENSION_UNLOCK_BED,
  loadChosenAscension,
  loadUnlockedAscension,
  recordAscensionCleared,
  saveChosenAscension,
  unlockAscensionAfter,
} from "@/lib/ascension";
import AscensionPicker, { COMPANION_RULES } from "@/components/AscensionPicker";
import {
  getRunBedStars,
  RunClearInfo,
  RunEndReason,
  RunGardenClearModal,
  RunHudStrip,
  RunOverInfo,
  RunOverModal,
  RunWeedOutOverlay,
} from "@/components/RunModeUI";
import TutorialCoach from "@/components/TutorialCoach";
import {
  SanctuaryModal,
  SanctuaryProgressBar,
} from "@/components/SanctuaryModal";
import {
  isTutorialMarkedDone,
  markTutorialDone,
  TUTORIAL_STAGES,
} from "@/lib/tutorial";

const COACH_STORAGE_KEY = "ost_first_daily_coach_v1";
/** The game is Run-only: other modes stay in the code but have no way in */
const RUN_ONLY = true;
const RUN_WELCOME_KEY = "ost_run_welcome_v1";
/** Set when the walkthrough is skipped; a one-time Thorn tip then shows in play */
const WALKTHROUGH_SKIPPED_KEY = "ost_walkthrough_skipped_v1";
const THORN_TIP_SEEN_KEY = "ost_thorn_tip_seen_v1";
/** After this many full score screens, lines 1–3 of a bed show a small card instead */
const FULL_TALLIES_SEEN_KEY = "ost_full_tallies_seen_v1";
const SHOP_INTRO_SEEN_KEY = "ost_shop_intro_seen_v1";
const LAST_OPEN_KEY = "ost_last_open_v1";
const FULL_TALLIES_BEFORE_COMPACT = 3;
const THORN_TIP = "🌺 Thorns cost ❤️ Life. Grab ✂️ Shears first to cut one, or 🧤 Gloves to block it.";
const RUN_LESSONS_PROGRESS_KEY = "ost_run_lessons_progress_v1";
const RUN_ONLY_NOTICE = "The Sanctuary is in Run mode for now — Gauntlet, past Dailies and the Crafter are resting.";

export default function OneStrokeTacticianPage() {
  // Initial deterministic daily dungeon so page loads instantaneously without layout shift
  const initialDungeon = useMemo(
    () => generateDeterministicDungeon(getTodayDateKey()),
    []
  );

  const [mode, setMode] = useState<GameMode>("DAILY");
  const [dungeon, setDungeon] = useState<DungeonTheme>(initialDungeon);
  const [currentFloorIndex, setCurrentFloorIndex] = useState<number>(0);
  const [heroClassId, setHeroClassId] = useState<HeroClassId>("KNIGHT");
  const [trialClassFloorActive, setTrialClassFloorActive] =
    useState<boolean>(false);
  const [activeRelics, setActiveRelics] = useState<RelicId[]>([]);
  // Run: growth of scaling relics (Oak Sapling, Compost Heap…)
  const [relicCounters, setRelicCounters] = useState<RelicCounters>({});
  // Sanctuary Shop (between gardens) and run-long upgrades bought there
  const [shopOffers, setShopOffers] = useState<ShopOffer[]>([]);
  const [shopSoldIds, setShopSoldIds] = useState<string[]>([]);
  const [shopRerolls, setShopRerolls] = useState<number>(0);
  // Pruning Shears used in this Shop visit (once per visit)
  const [shopPruned, setShopPruned] = useState(false);
  const [shopPurchases, setShopPurchases] = useState<number>(0);
  const [runUpgrades, setRunUpgrades] = useState<RunUpgrades>(NO_RUN_UPGRADES);
  const [gemsSpent, setGemsSpent] = useState<number>(0);
  const [legendaryAward, setLegendaryAward] = useState<RelicId | null>(null);
  // Loadout leaving each garden's Shop (saved with Daily progress)
  const shopLoadoutsRef = useRef<Array<DailyShopLoadout | null>>([]);
  // Value × Length tally shown after a garden; what to do once it's dismissed
  const [tally, setTally] = useState<{
    breakdown: FloorScoreBreakdown;
    stars: FloorStarBreakdown;
    floorLabel: string;
    runTotalBefore: number;
    bossRuleId?: BossRuleId;
    parPercent: number | null;
    isFinal: boolean;
    clearReward: number;
    runStroke?: {
      target: number;
      continueLabel: string;
      halfLineNote: string | null;
      compare: {
        token: number;
        grid: GridCell[][];
        yourPath: GridCoord[];
        yourScore: number;
        bestPath: GridCoord[] | null;
        bestScore: number | null;
        yourMagicCost: number;
        bestMagicCost: number | null;
      } | null;
    };
  } | null>(null);
  const afterTallyRef = useRef<(() => void) | null>(null);
  // Run mode: the run's Tile Bag, the garden in play, and its screens
  const [runBag, setRunBag] = useState<SeedTile[]>([]);
  const [runGarden, setRunGarden] = useState<RunGardenState | null>(null);
  const [runNoSafeLine, setRunNoSafeLine] = useState<boolean>(false);
  const [weedOutMode, setWeedOutMode] = useState<boolean>(false);
  const [weedOutSelection, setWeedOutSelection] = useState<GridCoord[]>([]);
  const [runClear, setRunClear] = useState<RunClearInfo | null>(null);
  const [runOver, setRunOver] = useState<RunOverInfo | null>(null);
  // The Run's action log (sent with leaderboard submissions so the server can
  // replay it) and the Shop a bloomed garden opens; null for practice
  const runLogRef = useRef<RunActionLog | null>(null);
  const runBloomRef = useRef<{ statsWithPayout: HeroStats; offers: ShopOffer[] } | null>(null);
  const logRunAction = (action: RunLogAction) => {
    runLogRef.current?.a.push(action);
  };
  // How-to-play guide (opens by itself on the first launch)
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  // Hands-on lessons, the guided Practice Garden, and the welcome / Help menu
  const [lessonIndex, setLessonIndex] = useState<number | null>(null);
  const [lessonResult, setLessonResult] = useState<LessonResultInfo | null>(null);
  const [showLessonGhost, setShowLessonGhost] = useState<boolean>(false);
  // "How to score big" demo on the Longer = more points lesson: short way, long way, then a card
  const [lessonDemo, setLessonDemo] = useState<"short" | "long" | "card" | null>(null);
  const demoTimersRef = useRef<number[]>([]);
  const [lessonsProgress, setLessonsProgress] = useState<number>(0);
  /** Set on a first visit: the walkthrough opens once the page is ready */
  const [pendingWalkthrough, setPendingWalkthrough] = useState<boolean>(false);
  /** Set while a committed line is replaying: jumps to its end */
  const skipPlaybackRef = useRef<(() => void) | null>(null);
  const [looksOpen, setLooksOpen] = useState<boolean>(false);
  /** Ascension picker before a new Garden Run (only once a level is unlocked) */
  const [ascPickerOpen, setAscPickerOpen] = useState<boolean>(false);
  /** Ascension level for new Garden Runs (the picker comes in the next step) */
  const runAscensionRef = useRef<number>(0);
  // Companion for new Garden Runs (each plays by its own rule)
  const runCompanionRef = useRef<HeroClassId>("KNIGHT");
  const [vibrationOn, setVibrationOn] = useState<boolean>(true);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  useEffect(() => {
    setVibrationOn(soundEngine.hapticsEnabled);
    const rm = loadReduceMotion();
    applyReduceMotion(rm);
    setReduceMotion(rm);
  }, []);
  /** Best stars collected across all Garden Beds (this device), for the menu */
  const [totalStars, setTotalStars] = useState<number>(0);
  useEffect(() => {
    setTotalStars(totalBestStars());
  }, []);
  /** One-line Shop explanation, shown on the first real Shop visit only */
  const [shopIntroVisible, setShopIntroVisible] = useState<boolean>(false);
  /** The best line on this board can't keep pace with the target: nudge Swap */
  const [swapSuggested, setSwapSuggested] = useState<boolean>(false);
  /** Small score card over the meter after lines 1–3 of a bed */
  const [lineToast, setLineToast] = useState<{
    key: number;
    points: number;
    score: number;
    target: number;
    strokesLeft: number;
  } | null>(null);
  /** Big "Vine!" style callout over the board after a long line */
  const [lineCallout, setLineCallout] = useState<{
    key: number;
    name: string;
    color: string;
    tiles: number;
    points: number;
  } | null>(null);
  const [practiceStep, setPracticeStep] = useState<PracticeStep | null>(null);
  const [practiceCollapsed, setPracticeCollapsed] = useState<boolean>(false);
  const [helpMenu, setHelpMenu] = useState<"welcome" | "help" | null>(null);
  // Run leaderboard: open state, a bump after each submission, and the last rank
  const [isRunLeaderboardOpen, setIsRunLeaderboardOpen] = useState<boolean>(false);
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState<number>(0);
  const [runRankLine, setRunRankLine] = useState<string | null>(null);
  // First-time teaching: until a 12+ tile stroke, short lines get tips and the
  // stroke result compares your line with a long line on the same board
  const [longLineLearned, setLongLineLearned] = useState<boolean>(true);
  // First-time teaching on the board: tile types already introduced, and
  // whether a first line has ever been walked (until then home and Exit pulse)
  const [seenTileIntros, setSeenTileIntros] = useState<string[] | null>(null);
  const [firstLineDone, setFirstLineDone] = useState<boolean>(true);
  // Relics that added to the last line light up in the relic row
  const [flashRelics, setFlashRelics] = useState<RelicId[]>([]);
  const pendingFlashRef = useRef<RelicId[]>([]);
  const compareTokenRef = useRef(0);
  const [pendingPostFloorStats, setPendingPostFloorStats] =
    useState<HeroStats | null>(null);
  const [lastClearedFloorStars, setLastClearedFloorStars] =
    useState<FloorStarBreakdown>({
      star1Survivor: true,
      star2Greed: false,
      star3Flawless: false,
      totalStars: 1,
      goldNodesCollected: 0,
      totalGoldNodesOnFloor: 0,
    });

  const [hero, setHero] = useState<HeroStats>(() =>
    getInitialHeroStatsForClass("KNIGHT")
  );
  const [floorStartHero, setFloorStartHero] = useState<HeroStats>(() =>
    getInitialHeroStatsForClass("KNIGHT")
  );
  const [drawnPath, setDrawnPath] = useState<GridCoord[]>([]);
  const [phase, setPhase] = useState<GamePhase>("PLANNING");
  const [activeResolutionStep, setActiveResolutionStep] = useState<
    number | null
  >(null);
  const [totalCellsVisited, setTotalCellsVisited] = useState<number>(0);
  const [floorHistory, setFloorHistory] = useState<FloorHistoryRecord[]>([]);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [retractNotice, setRetractNotice] = useState<string | null>(null);

  // Scout Hint (1 per floor, illuminates first 4 cells for 4 seconds)
  const [hintsRemaining, setHintsRemaining] = useState<number>(1);
  const [hintCoords, setHintCoords] = useState<GridCoord[]>([]);

  // Persistence, Cosmetics & Modals
  const [playerStats, setPlayerStats] =
    useState<DailyPlayerStats>(DEFAULT_PLAYER_STATS);
  const [monetization, setMonetization] = useState<MonetizationState>(
    DEFAULT_MONETIZATION_STATE
  );
  const [cosmetics, setCosmetics] = useState<CosmeticPreferences>(
    DEFAULT_COSMETIC_PREFS
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(false);

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState<boolean>(false);
  const [isSanctuaryModalOpen, setIsSanctuaryModalOpen] =
    useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  // Message shown inside the Expansion screen (checkout / restore / crafter)
  const [storeMessage, setStoreMessage] = useState<string | null>(null);
  const [isCheckoutPending, setIsCheckoutPending] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [isInteractiveTutorial, setIsInteractiveTutorial] =
    useState<boolean>(false);
  const [tutorialStageIndex, setTutorialStageIndex] = useState<number>(0);
  const [trainingToastBanner, setTrainingToastBanner] = useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Fair Daily: fixed per-garden par for today's board (null while computing),
  // whether this Daily visit is the official (first) attempt, and whether the
  // run shown in the summary was official.
  const [dailyPars, setDailyPars] = useState<number[] | null>(null);
  const [isOfficialDailyRun, setIsOfficialDailyRun] = useState<boolean>(false);
  const [lastRunWasOfficial, setLastRunWasOfficial] = useState<boolean>(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState<boolean>(false);
  // First-visit coaching on the real Daily (null = hidden)
  const [coachStep, setCoachStep] = useState<number | null>(null);

  const resolutionTimersRef = useRef<number[]>([]);

  const clearResolutionTimers = useCallback(() => {
    for (const timerId of resolutionTimersRef.current) {
      window.clearTimeout(timerId);
    }
    resolutionTimersRef.current = [];
  }, []);

  const loadTutorialStage = useCallback(
    (stageIdx: number) => {
      clearResolutionTimers();
      const safeIdx = Math.max(0, Math.min(TUTORIAL_STAGES.length - 1, stageIdx));
      const stageCfg = TUTORIAL_STAGES[safeIdx];
      setShowTutorial(false);
      setIsInteractiveTutorial(true);
      setTutorialStageIndex(safeIdx);
      setHero({ ...stageCfg.initialHero });
      setFloorStartHero({ ...stageCfg.initialHero });
      setDrawnPath([]);
      setPhase("PLANNING");
      setActiveResolutionStep(null);
      setRetractNotice(null);
      setHintCoords([]);
      setHintsRemaining(1);
    },
    [clearResolutionTimers]
  );

  // Load client-side persistence & Leaderboard on mount. The Daily board is always
  // the canonical generateDeterministicDungeon(dateKey) so every player gets the
  // same puzzle; Gemini is only used for the custom crafter (POST).
  useEffect(() => {
    setIsMounted(true);
    setPlayerStats(loadPlayerStats());
    setMonetization(loadMonetizationState());
    setCosmetics(loadCosmeticPreferences());
    setSoundEnabled(soundEngine.soundEnabled);
    setMusicEnabled(soundEngine.musicEnabled);

    // New players start on the real Daily with a short coach (the 7 lessons
    // stay available from the Tutorial tab). Resumes an unfinished official
    // Daily visit if there is one.
    if (RUN_ONLY) {
      // New Garden Runs use the last Ascension level chosen
      runAscensionRef.current = loadChosenAscension();
      runCompanionRef.current = loadChosenCompanion(loadCosmeticPreferences().companionId);
      // Continue a Run saved on this device, or start a new one
      resumeSavedRun();
      try {
        setLessonsProgress(
          Number(window.localStorage.getItem(RUN_LESSONS_PROGRESS_KEY)) || 0
        );
        setLongLineLearned(Boolean(window.localStorage.getItem(LONG_LINE_LEARNED_KEY)));
        setFirstLineDone(Boolean(window.localStorage.getItem(FIRST_LINE_DONE_KEY)));
        try {
          const seen = JSON.parse(window.localStorage.getItem(SEEN_TILE_INTROS_KEY) || "[]");
          setSeenTileIntros(Array.isArray(seen) ? seen : []);
        } catch {
          setSeenTileIntros([]);
        }
        // Anonymous tester stats: first visit or a return (and after how many days)
        const lastOpen = Number(window.localStorage.getItem(LAST_OPEN_KEY)) || 0;
        track("app_open", {
          first_visit: !window.localStorage.getItem(RUN_WELCOME_KEY),
          days_since_last: lastOpen ? Math.floor((Date.now() - lastOpen) / 86400000) : null,
        });
        window.localStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
        // First visit: a short hands-on walkthrough starts right away (Skip leaves it)
        if (!window.localStorage.getItem(RUN_WELCOME_KEY)) {
          window.localStorage.setItem(RUN_WELCOME_KEY, "1");
          setPendingWalkthrough(true);
        }
      } catch {
        setPendingWalkthrough(true);
      }
    } else {
      startDaily();
    }
    try {
      if (RUN_ONLY) throw new Error("no Daily coach");
      const coachState = window.localStorage.getItem(COACH_STORAGE_KEY);
      if (coachState === "pending" || (!coachState && !isTutorialMarkedDone())) {
        window.localStorage.setItem(COACH_STORAGE_KEY, "pending");
        markTutorialDone();
        setCoachStep(0);
      }
    } catch {
      // Storage unavailable: skip the coach
    }

    const today = getTodayDateKey();
    fetchDailyLeaderboard(today, initialDungeon.modifierId).then(
      setLeaderboard
    );

    // Sync the Expansion with the server (purchase return, restore link, or a
    // plain refresh). If the server can't answer, keep the cached local state.
    const params = new URLSearchParams(window.location.search);
    const purchaseParam = params.get("purchase");
    const sessionId = params.get("session_id") ?? undefined;
    const isRestoreReturn = params.get("restore") === "1";
    if (purchaseParam || isRestoreReturn) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    const applyEntitlement = (expansion: boolean) => {
      const updated = saveMonetizationState({
        ...loadMonetizationState(),
        expansionUnlocked: expansion,
        lifetimePassUnlocked: false,
      });
      setMonetization(updated);
      if (expansion) setTrialClassFloorActive(false);
    };
    if (isRestoreReturn) {
      completeRestoreFromMagicLink().then((result) => {
        if (result) applyEntitlement(result.expansion);
        setStoreMessage(
          result?.expansion
            ? "Welcome back! Your Expansion is restored on this device. 🌸"
            : "We couldn't find a purchase for that email. Use the address from your Stripe receipt."
        );
        setIsPassModalOpen(true);
      });
    } else {
      fetchExpansionEntitlement({ sessionId }).then((result) => {
        if (result) applyEntitlement(result.expansion);
        if (purchaseParam === "success") {
          setStoreMessage(
            result?.expansion
              ? "Thank you! The Expansion is yours. 🌸"
              : "Payment received — your unlock may take a minute. Reopen this screen shortly."
          );
          if (result?.expansion) soundEngine.playVictoryChord();
          setIsPassModalOpen(true);
        } else if (purchaseParam === "cancelled") {
          setStoreMessage("Checkout cancelled — you haven't been charged.");
          setIsPassModalOpen(true);
        }
      });
    }

    return () => clearResolutionTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fixed par for today's Daily, computed off the main thread (cached per date)
  useEffect(() => {
    if (mode !== "DAILY") {
      setDailyPars(null);
      return;
    }
    let cancelled = false;
    const seedKey = dungeon.seedKey;
    requestDailyPar(dungeon).then((pars) => {
      if (cancelled) return;
      setDailyPars(pars);
      // Fill in par for gardens committed before it was ready
      setFloorHistory((prev) =>
        prev.map((r, idx) =>
          r.parScore ? r : { ...r, parScore: pars[idx] || undefined }
        )
      );
      void seedKey;
    });
    return () => {
      cancelled = true;
    };
  }, [mode, dungeon]);

  // Advance the first-visit coach once the player starts drawing
  useEffect(() => {
    if (coachStep === 0 && drawnPath.length >= 2) setCoachStep(1);
  }, [coachStep, drawnPath.length]);

  const currentFloor =
    dungeon.floors[currentFloorIndex] ?? dungeon.floors[0];
  const activeTutorialStage = TUTORIAL_STAGES[tutorialStageIndex] ?? TUTORIAL_STAGES[0];
  // A hands-on Run lesson replaces the board, stats and relics while it's open
  const lesson = lessonIndex !== null ? RUN_LESSONS[lessonIndex] ?? null : null;
  const activeGrid = lesson
    ? lesson.grid
    : isInteractiveTutorial
    ? activeTutorialStage.grid
    : currentFloor.grid;
  const activeModifierId: ModifierId = lesson
    ? runModifierFor(RUN_LOG_VERSION)
    : isInteractiveTutorial
    ? "NONE"
    : dungeon.modifierId;
  const activeClassForBoard: HeroClassId = lesson
    ? "KNIGHT"
    : isInteractiveTutorial
    ? (tutorialStageIndex === 6 ? heroClassId : (activeTutorialStage.recommendedClass ?? "KNIGHT"))
    : heroClassId;
  const activeRelicsForBoard: RelicId[] = useMemo(
    () => (isInteractiveTutorial || lesson ? [] : activeRelics),
    [isInteractiveTutorial, lesson, activeRelics]
  );
  // Run facts some relics score on: scaling growth and which stroke this is
  const relicScoreCtx: RelicScoreContext = useMemo(
    () =>
      isInteractiveTutorial || lesson || mode !== "RUN"
        ? {}
        : {
            counters: relicCounters,
            strokesLeft: runGarden?.strokesLeft,
            relicSets: runRulesUseRelicSets(runLogRef.current?.v ?? RUN_LOG_VERSION),
          },
    [isInteractiveTutorial, lesson, mode, relicCounters, runGarden?.strokesLeft]
  );

  // Live Ghost Preview deterministic calculation with Hero Class & Active Relics
  const simulation = useMemo(() => {
    return simulatePath(
      activeGrid,
      drawnPath,
      floorStartHero,
      activeModifierId,
      activeClassForBoard,
      activeRelicsForBoard
    );
  }, [
    activeGrid,
    drawnPath,
    floorStartHero,
    activeModifierId,
    activeClassForBoard,
    activeRelicsForBoard,
  ]);

  // Live Value × Length meter: this line and the same line one step shorter
  const lineMeter = useMemo(() => {
    const len = drawnPath.length;
    const now = calculateFloorScoreBreakdown(simulation, floorStartHero, len, activeRelicsForBoard, relicScoreCtx);
    const prevPath = drawnPath.slice(0, -1);
    const prevSim = simulatePath(
      activeGrid,
      prevPath,
      floorStartHero,
      activeModifierId,
      activeClassForBoard,
      activeRelicsForBoard
    );
    const prev = calculateFloorScoreBreakdown(prevSim, floorStartHero, prevPath.length, activeRelicsForBoard, relicScoreCtx);
    const tilesOnBoard = activeGrid
      .flat()
      .filter((c) => c.type !== "VOID" && c.type !== "HERO").length;
    return {
      now,
      previousPoints: prevPath.length >= 2 ? Math.round(prev.chips * prev.mult * prev.xMult) : 0,
      lastTileValue: Math.max(0, now.chips - prev.chips),
      tilesOnBoard,
    };
  }, [
    drawnPath,
    simulation,
    floorStartHero,
    activeRelicsForBoard,
    relicScoreCtx,
    activeGrid,
    activeModifierId,
    activeClassForBoard,
  ]);

  // Each new board in a Run: if even the best line (par) can't score the
  // points still needed per line, gently suggest a Swap
  const swapCheckKey =
    mode === "RUN" && !lesson && runGarden && phase === "PLANNING" && runGarden.weedOutsLeft > 0
      ? `${runGarden.gardenIndex}-${runGarden.strokesLeft}-${runGarden.weedOutsLeft}-${activeGrid.flat().map((c) => c.id).join(",")}`
      : null;
  useEffect(() => {
    setSwapSuggested(false);
    if (!swapCheckKey || !runGarden) return;
    // Very slow phones skip this background search (Hint still works)
    const nav = navigator as Navigator & { deviceMemory?: number };
    if ((nav.hardwareConcurrency ?? 4) <= 2 || (nav.deviceMemory ?? 4) <= 1) return;
    let cancelled = false;
    const grid = activeGrid;
    const startHero = floorStartHero;
    const need = (runGarden.target - runGarden.score) / Math.max(1, runGarden.strokesLeft);
    requestParLine({
      grid,
      startHero,
      modifierId: activeModifierId,
      heroClassId: activeClassForBoard,
      activeRelics: activeRelicsForBoard,
      scoreCtx: relicScoreCtx,
    }).then(
      (best) => {
        if (cancelled || !best || best.length < 2) return;
        const sim = simulatePath(grid, best, startHero, activeModifierId, activeClassForBoard, activeRelicsForBoard);
        const par = calculateFloorScoreBreakdown(sim, startHero, best.length, activeRelicsForBoard, relicScoreCtx).total;
        setSwapSuggested(par < need);
      },
      () => undefined
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapCheckKey]);

  // Shop: what each score relic would have added to your best line of the
  // Garden Bed just cleared (same tiles, same start, relic added)
  const shopScorePreview = useMemo(() => {
    if (phase !== "SHOP" || mode !== "RUN") return undefined;
    const bedNumber = floorHistory[floorHistory.length - 1]?.floorNumber;
    const bedLines = floorHistory.filter((r) => r.floorNumber === bedNumber);
    if (bedLines.length === 0) return undefined;
    const bestIdx = bedLines.reduce((bi, r, i) => ((r.floorScore ?? 0) > (bedLines[bi].floorScore ?? 0) ? i : bi), 0);
    const best = bedLines[bestIdx];
    const first = best.steps[0];
    if (!first) return undefined;
    const start: HeroStats = {
      hp: first.hpBefore,
      maxHp: floorStartHero.maxHp,
      shield: first.shieldBefore,
      weapon: first.weaponBefore,
      gold: first.goldBefore,
    };
    const ctx: RelicScoreContext = {
      counters: relicCounters,
      strokesLeft: RUN_STROKES_PER_GARDEN - bestIdx,
      relicSets: runRulesUseRelicSets(runLogRef.current?.v ?? RUN_LOG_VERSION),
    };
    // Relics that count Seeds held use your purse as it would be after buying
    const purse = (pendingPostFloorStats ?? hero).gold;
    const scoreWith = (relics: RelicId[], gold: number) => {
      const from = { ...start, gold };
      const sim = simulatePath(best.gridSnapshot, best.path, from, dungeon.modifierId, heroClassId, relics);
      return calculateFloorScoreBreakdown(sim, from, best.path.length, relics, ctx).total;
    };
    const out: Record<string, number> = {};
    for (const offer of shopOffers) {
      if (offer.kind !== "RELIC" || !offer.relicId) continue;
      const cat = RELIC_REGISTRY[offer.relicId]?.category;
      if (cat !== "CHIPS" && cat !== "MULT" && cat !== "XMULT") continue;
      const gold = Math.max(0, purse - offer.cost);
      out[offer.id] = Math.max(0, scoreWith([...activeRelics, offer.relicId], gold) - scoreWith(activeRelics, gold));
    }
    return out;
  }, [phase, mode, floorHistory, floorStartHero.maxHp, relicCounters, dungeon.modifierId, heroClassId, activeRelics, shopOffers, pendingPostFloorStats, hero]);

  // First real Shop visit: show the one-line explanation (once per device)
  useEffect(() => {
    if (phase !== "SHOP") {
      setShopIntroVisible(false);
      return;
    }
    if (mode !== "RUN" || practiceStep) return;
    try {
      if (!window.localStorage.getItem(SHOP_INTRO_SEEN_KEY)) {
        window.localStorage.setItem(SHOP_INTRO_SEEN_KEY, "1");
        setShopIntroVisible(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, [phase, mode, practiceStep]);

  const handleNotice = useCallback((msg: string) => {
    setRetractNotice(msg);
    // Longer explanations stay up longer (about 2.5s + reading time, max 6s)
    const ms = Math.min(6000, 2500 + msg.length * 35);
    const id = window.setTimeout(() => {
      setRetractNotice((prev) => (prev === msg ? null : prev));
    }, ms);
    resolutionTimersRef.current.push(id);
  }, []);

  const resetRunWithDungeon = useCallback(
    (
      targetDungeon: DungeonTheme,
      targetMode: GameMode,
      overrideClassId?: HeroClassId,
      isTrial?: boolean
    ) => {
      clearResolutionTimers();
      // The Daily is always played with the Keeper so scores are comparable
      const nextClassId =
        targetMode === "DAILY"
          ? DAILY_COMPANION
          : overrideClassId ?? heroClassId;
      const startStats = getInitialHeroStatsForClass(nextClassId);
      setIsOfficialDailyRun(
        targetMode === "DAILY" && !hasOfficialDailyResult(targetDungeon.dateKey)
      );
      setIsInteractiveTutorial(false);
      setShowTutorial(false);
      setMode(targetMode);
      setDungeon(targetDungeon);
      setCurrentFloorIndex(0);
      setHeroClassId(nextClassId);
      setTrialClassFloorActive(targetMode !== "DAILY" && Boolean(isTrial));
      setActiveRelics([]);
      setRelicCounters({});
      setShopOffers([]);
      setShopSoldIds([]);
      setShopRerolls(0);
      setShopPruned(false);
      setRunUpgrades(NO_RUN_UPGRADES);
      setGemsSpent(0);
      setLegendaryAward(null);
      shopLoadoutsRef.current = [];
      setTally(null);
      afterTallyRef.current = null;
      setPendingPostFloorStats(null);
      setHero(startStats);
      setFloorStartHero(startStats);
      setDrawnPath([]);
      setPhase("PLANNING");
      setActiveResolutionStep(null);
      setTotalCellsVisited(0);
      setFloorHistory([]);
      setFinalScore(0);
      setRetractNotice(null);
      setHintsRemaining(1);
      setHintCoords([]);
      setIsSummaryModalOpen(false);
      setRunGarden(null);
      setRunNoSafeLine(false);
      setWeedOutMode(false);
      setWeedOutSelection([]);
      setRunClear(null);
      setRunOver(null);
    },
    [clearResolutionTimers, heroClassId]
  );

  /**
   * Records a finished run. Only the canonical Daily feeds the streak / daily
   * history, and only its first finished attempt is official; everything else
   * just banks its gems. Returns whether the run was official.
   */
  const recordFinishedRun = useCallback(
    (params: {
      runMode: GameMode;
      runDungeon: DungeonTheme;
      score: number;
      survived: boolean;
      floorsCleared: number;
      starsEarned: number;
      history: FloorHistoryRecord[];
      gold: number;
    }): boolean => {
      if (params.runMode !== "DAILY") {
        if (params.gold > 0) setPlayerStats(addBankedGold(params.gold));
        return false;
      }
      const isOfficial = !hasOfficialDailyResult(params.runDungeon.dateKey);
      const streakAfter = isOfficial
        ? (() => {
            const stats = loadPlayerStats();
            const y = new Date(params.runDungeon.dateKey + "T00:00:00");
            y.setDate(y.getDate() - 1);
            const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(y.getDate()).padStart(2, "0")}`;
            return stats.lastCompletedDate === yKey ? stats.currentStreak + 1 : 1;
          })()
        : loadPlayerStats().currentStreak;
      const shareAscii = generateShareCardAscii({
        dungeon: params.runDungeon,
        floorHistory: params.history,
        finalScore: params.score,
        survived: params.survived,
        streakDays: streakAfter,
        isPractice: !isOfficial,
      });
      const { stats } = saveDailyRunCompletion({
        dateKey: params.runDungeon.dateKey,
        score: params.score,
        survived: params.survived,
        floorsCleared: params.floorsCleared,
        starsEarned: params.starsEarned,
        parPercent: getParPercent(params.history),
        perfectCount: params.history.filter(isPerfectFloor).length,
        heroClassId: DAILY_COMPANION,
        shareAscii,
        goldEarned: params.gold,
      });
      setPlayerStats(stats);
      if (isOfficial) {
        saveDailyProgress(null);
        setIsOfficialDailyRun(false);
      }
      return isOfficial;
    },
    []
  );

  /**
   * Ends a run (all gardens done, or the player ended the visit early) and
   * opens the summary.
   */
  const finishRun = useCallback(
    (params: {
      runMode: GameMode;
      runDungeon: DungeonTheme;
      history: FloorHistoryRecord[];
      finalStats: HeroStats;
      cellsVisited: number;
      completedAll: boolean;
      gemsSpent?: number;
    }) => {
      const totalStars = params.history.reduce(
        (sum, f) => sum + (f.stars?.totalStars ?? 0),
        0
      );
      // Value × Length: the visit's score is the sum of its gardens' scores
      const score = calculateRunScore(params.history);
      setFinalScore(score);
      const official = recordFinishedRun({
        runMode: params.runMode,
        runDungeon: params.runDungeon,
        score,
        survived: params.completedAll,
        floorsCleared: params.history.filter((f) => f.cleared).length,
        starsEarned: totalStars,
        history: params.history,
        // Gems spent in the Shop still count toward the Sanctuary Mosaic
        gold: params.finalStats.gold + (params.gemsSpent ?? 0),
      });
      setLastRunWasOfficial(official);
      if (params.completedAll) {
        soundEngine.playVictoryChord();
        if (params.history.some(isPerfectFloor)) {
          window.setTimeout(() => soundEngine.playSanctuaryHarpChime(5), 450);
        }
      }
      setPhase(params.completedAll ? "VICTORY" : "DEFEAT");
      setActiveResolutionStep(null);
      setIsSummaryModalOpen(true);
    },
    [recordFinishedRun]
  );

  /**
   * Starts today's Daily. If an official visit is already in progress on this
   * device (e.g. after a reload), it resumes from the saved lines instead of
   * starting over — so garden 1 can't be redone for a better official score.
   */
  const startDaily = useCallback(() => {
    const daily = generateDeterministicDungeon(getTodayDateKey());
    resetRunWithDungeon(daily, "DAILY");
    if (hasOfficialDailyResult(daily.dateKey)) return;
    const progress = loadDailyProgress(daily.dateKey);
    if (!progress || progress.paths.length === 0) return;

    const replay = replayDailyProgress(
      daily,
      progress.paths,
      null,
      progress.loadouts ?? []
    );
    shopLoadoutsRef.current = progress.loadouts ?? [];
    setFloorHistory(replay.history);
    setTotalCellsVisited(replay.totalCellsVisited);
    if (
      !replay.survived ||
      progress.paths.length >= daily.floors.length
    ) {
      finishRun({
        runMode: "DAILY",
        runDungeon: daily,
        history: replay.history,
        finalStats: replay.lastFinalStats,
        cellsVisited: replay.totalCellsVisited,
        completedAll: replay.survived,
        gemsSpent: replay.gemsSpent,
      });
      return;
    }
    setActiveRelics(replay.relics);
    setRunUpgrades(replay.upgrades);
    setGemsSpent(replay.gemsSpent);
    if (replay.shopPending) {
      // Reloaded during a Shop: reopen it for the garden just cleared
      const clearedIdx = progress.paths.length - 1;
      setCurrentFloorIndex(clearedIdx);
      setHero(replay.lastFinalStats);
      setFloorStartHero(replay.lastFinalStats);
      setPendingPostFloorStats({ ...replay.lastFinalStats });
      setShopOffers(
        generateShopOffers(
          daily.seedKey,
          daily.floors[clearedIdx].floorNumber,
          0,
          replay.relics
        )
      );
      setPhase("SHOP");
      return;
    }
    setCurrentFloorIndex(progress.paths.length);
    setHero(replay.nextFloorHero);
    setFloorStartHero(replay.nextFloorHero);
    handleNotice(
      `Welcome back — continuing today's visit at Garden ${progress.paths.length + 1}.`
    );
  }, [resetRunWithDungeon, finishRun, handleNotice]);

  /**
   * Starts a fresh Run: a new seed, a new Tile Bag and Season 1's Small Garden.
   */
  const startRun = useCallback(
    (overrideClassId?: HeroClassId, _isTrial?: boolean, options?: { practice?: boolean; asc?: number }) => {
      const practice = Boolean(options?.practice);
      // Ascension level: the one passed in, or the last one chosen
      const asc = practice ? 0 : options?.asc ?? runAscensionRef.current;
      // A new Run (or the Practice Garden) replaces any saved one
      clearRunSave();
      const runSeed = practice
        ? PRACTICE_GARDEN_SEED
        : `run-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      // Each Run gets its own musical phrases
      soundEngine.setMusicSeed(runSeed);
      // Companions are earned by playing (no free trials): a locked one falls back to the Keeper
      const wanted = overrideClassId ?? runCompanionRef.current;
      const classId: HeroClassId = practice || !isCompanionUnlocked(wanted) ? "KNIGHT" : wanted;
      const { bag, ...first } = startRunGarden(runSeed, classId, RUN_LOG_VERSION, asc);
      const runDungeon: DungeonTheme = {
        seedKey: runSeed,
        dateKey: getTodayDateKey(),
        title: "Garden Run",
        lore: "Season after season the gardens grow wilder. Clear each one before your lines run out.",
        modifierId: runModifierFor(RUN_LOG_VERSION),
        source: "deterministic-fallback",
        floors: [first.floor],
      };
      resetRunWithDungeon(runDungeon, "RUN", classId, false);
      setRunBag(bag);
      runLogRef.current = practice ? null : createRunLog(runSeed, classId, asc);
      runBloomRef.current = null;
      setLessonIndex(null);
      setLessonResult(null);
      setShowLessonGhost(false);
      setPracticeCollapsed(false);
      if (practice) {
        // Guided Practice Garden: a lower target and a few Gems for its Shop
        const startStats = { ...getInitialHeroStatsForClass("KNIGHT"), gold: PRACTICE_GARDEN_GEMS };
        setRunGarden({ ...first.state, target: PRACTICE_GARDEN_TARGET });
        setHero(startStats);
        setFloorStartHero(startStats);
        setPracticeStep("intro");
      } else {
        setRunGarden(first.state);
        // The level can change the starting Companion (Ascension 5: 8 Life)
        setHero(first.hero);
        setFloorStartHero(first.hero);
        setPracticeStep(null);
      }
    },
    [resetRunWithDungeon]
  );

  /** A new Garden Run: pick the companion (and Ascension level) once there's a choice */
  const requestNewRun = () => {
    if (loadUnlockedAscension() > 0 || unlockedRunCompanions().length > 1) setAscPickerOpen(true);
    else startRun();
  };

  /** Opens hands-on lesson `index` on a fresh board */
  const stopLessonDemo = () => {
    demoTimersRef.current.forEach((t) => window.clearTimeout(t));
    demoTimersRef.current = [];
  };

  /** Plays the ~10-second demo: the short way (one step), then the long way tile by tile */
  const playLessonDemo = (l: RunLesson) => {
    stopLessonDemo();
    setShowLessonGhost(false);
    setDrawnPath([]);
    if (reduceMotion) {
      // No animation: the two results side by side
      setLessonDemo("card");
      return;
    }
    const at = (ms: number, fn: () => void) => demoTimersRef.current.push(window.setTimeout(fn, ms));
    const start = l.solution[0];
    const exit = findEntityCoord(l.grid, "EXIT");
    setLessonDemo("short");
    at(400, () => setDrawnPath([start]));
    if (exit) at(900, () => setDrawnPath([start, exit]));
    at(2700, () => {
      setLessonDemo("long");
      setDrawnPath([start]);
    });
    const step = 420;
    l.solution.slice(1).forEach((_, i) => at(3100 + i * step, () => setDrawnPath(l.solution.slice(0, i + 2))));
    at(3100 + (l.solution.length - 1) * step + 1000, () => setLessonDemo("card"));
  };

  const endLessonDemo = (how: "done" | "skip") => {
    stopLessonDemo();
    setLessonDemo(null);
    setDrawnPath([]);
    track(how === "skip" ? "demo_skip" : "demo_done");
  };

  const startLesson = (index: number, autoDemo = true) => {
    const next = RUN_LESSONS[index];
    if (!next) return;
    stopLessonDemo();
    setLessonDemo(null);
    clearResolutionTimers();
    setLessonIndex(index);
    setLessonResult(null);
    setShowLessonGhost(false);
    setPracticeStep(null);
    setTally(null);
    afterTallyRef.current = null;
    setRunClear(null);
    setRunOver(null);
    setWeedOutMode(false);
    setWeedOutSelection([]);
    setRunNoSafeLine(false);
    setHero({ ...next.hero });
    setFloorStartHero({ ...next.hero });
    setDrawnPath([]);
    setHintCoords([]);
    setActiveResolutionStep(null);
    setRetractNotice(null);
    setPhase("PLANNING");
    if (autoDemo && next.id === DEMO_LESSON_ID) {
      track("demo_start");
      playLessonDemo(next);
    }
  };

  // Leaving the lessons stops a demo that's still playing
  useEffect(() => {
    if (lessonIndex === null || RUN_LESSONS[lessonIndex]?.id !== DEMO_LESSON_ID) {
      demoTimersRef.current.forEach((t) => window.clearTimeout(t));
      demoTimersRef.current = [];
      setLessonDemo(null);
    }
  }, [lessonIndex]);

  /** Real scores of the demo's two lines (the card quotes them) */
  const demoScores = useMemo(() => {
    const l = RUN_LESSONS.find((x) => x.id === DEMO_LESSON_ID);
    if (!l) return null;
    const exit = findEntityCoord(l.grid, "EXIT");
    const score = (path: GridCoord[]) => {
      const sim = simulatePath(l.grid, path, l.hero, runModifierFor(RUN_LOG_VERSION), "KNIGHT", []);
      return calculateFloorScoreBreakdown(sim, l.hero, path.length, []).total;
    };
    return { short: exit ? score([l.solution[0], exit]) : 0, long: score(l.solution) };
  }, []);

  useEffect(() => {
    if (!pendingWalkthrough) return;
    setPendingWalkthrough(false);
    track("walkthrough_start");
    startLesson(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingWalkthrough]);

  const markWelcomeSeen = () => {
    try {
      window.localStorage.setItem(RUN_WELCOME_KEY, "1");
    } catch {
      // Storage unavailable: the welcome shows again next launch
    }
  };

  /**
   * Hero Class Selection Handler (supports both full Expansion unlock and 1-Floor Free Preview)
   */
  const handleSelectHeroClass = useCallback(
    (nextClassId: HeroClassId, isFreeTrial: boolean = false) => {
      if (phase === "RESOLVING" || phase === "FLOOR_CLEARED") return;
      const clsDef = HERO_CLASS_REGISTRY[nextClassId];
      if (mode === "RUN" && !isInteractiveTutorial) {
        // A Run keeps its Companion; picking another one starts a new Run
        if (floorHistory.length > 0 && phase !== "DEFEAT") {
          handleNotice("Your Companion is set for this run — end it to pick another.");
          return;
        }
        startRun(nextClassId, isFreeTrial);
        soundEngine.playWeaponPickup();
        handleNotice(
          `${clsDef.emblem} ${clsDef.sanctuaryName ?? clsDef.name} starts a new run!`
        );
        return;
      }
      if (
        mode === "DAILY" &&
        !isInteractiveTutorial &&
        nextClassId !== DAILY_COMPANION
      ) {
        // Keep the Daily fair: other companions play in Free Play instead
        const sandboxDungeon = generateDeterministicDungeon(
          `sandbox-${Date.now()}`,
          {
            preferredModifier:
              MODIFIER_LIST[Math.floor(Math.random() * MODIFIER_LIST.length)].id,
          }
        );
        resetRunWithDungeon(sandboxDungeon, "SANDBOX", nextClassId, isFreeTrial);
        handleNotice(
          `Today's Daily is played with the Keeper so everyone's on equal terms — ${clsDef.emblem} ${
            clsDef.sanctuaryShortName ?? clsDef.shortName
          } is with you in Free Play.`
        );
        return;
      }
      setHeroClassId(nextClassId);
      setTrialClassFloorActive(isFreeTrial);
      setDrawnPath([]);
      setHintCoords([]);

      if (isInteractiveTutorial || currentFloorIndex === 0) {
        const freshStats = getInitialHeroStatsForClass(nextClassId);
        setHero(freshStats);
        setFloorStartHero(freshStats);
      } else {
        // Adapt current floor starting stats to the newly selected class
        const adapted = getNextFloorHeroStats(
          floorStartHero,
          nextClassId,
          activeRelics,
          runUpgrades
        );
        setHero(adapted);
        setFloorStartHero(adapted);
      }

      soundEngine.playWeaponPickup();
      const sanctuaryNotice = true;
      const companionName = sanctuaryNotice
        ? clsDef.sanctuaryName ?? clsDef.name
        : clsDef.name;
      if (isFreeTrial) {
        handleNotice(
          sanctuaryNotice
            ? `${clsDef.emblem} ${companionName} joins you for one free garden!`
            : `${clsDef.emblem} ${companionName} equipped for 1-Floor Free Preview!`
        );
      } else {
        handleNotice(
          `${clsDef.emblem} ${companionName} (${
            sanctuaryNotice
              ? clsDef.sanctuaryPassiveName ?? clsDef.passiveName
              : clsDef.passiveName
          })`
        );
      }
    },
    [
      phase,
      mode,
      isInteractiveTutorial,
      resetRunWithDungeon,
      currentFloorIndex,
      floorStartHero,
      activeRelics,
      runUpgrades,
      handleNotice,
      floorHistory.length,
      startRun,
    ]
  );

  /** Sanctuary Shop: buy one offer with this visit's Gems */
  const handleBuyShopOffer = useCallback(
    (offer: ShopOffer) => {
      const bought = applyRunShopPurchase({
        stats: pendingPostFloorStats ?? hero,
        offer,
        relics: activeRelics,
        upgrades: runUpgrades,
        soldIds: shopSoldIds,
      });
      if (!bought) return;
      track("shop_buy", {
        item: offer.relicId ?? offer.stat ?? offer.id,
        kind: offer.kind,
        cost: offer.cost,
        bed: currentFloorIndex,
      });
      const next = bought.stats;
      setActiveRelics(bought.relics);
      setRunUpgrades(bought.upgrades);
      if (offer.kind === "RELIC" && offer.relicId) {
        const relic = getRelicDisplay(RELIC_REGISTRY[offer.relicId], true);
        const newSets = runRulesUseRelicSets(runLogRef.current?.v ?? RUN_LOG_VERSION)
          ? completedRelicSets(bought.relics).filter((t) => !completedRelicSets(activeRelics).includes(t))
          : [];
        handleNotice(
          newSets.length > 0
            ? `${relic.name} joins your relics! ${newSets
                .map((t) => `${RELIC_TAG_INFO[t].icon} ${RELIC_TAG_INFO[t].name}`)
                .join(" + ")} set complete: every line ×${RELIC_SET_X}`
            : `${relic.name} joins your relics!`
        );
        if (newSets.length > 0) track("relic_set", { tag: newSets.join(","), bed: currentFloorIndex });
        if (newSets.length > 0) soundEngine.playSetComplete();
        else soundEngine.playShopBuy();
      } else if (offer.stat === "MAX_MAGIC") {
        handleNotice(`${SHOP_STAT_BOOSTS.MAX_MAGIC.icon} +2 Max Life for this visit!`);
      } else if (offer.stat === "START_DEW") {
        handleNotice(`${SHOP_STAT_BOOSTS.START_DEW.icon} +1 Gloves at the start of every garden!`);
      }
      if (mode === "RUN") logRunAction({ k: "b", o: offer.id });
      setPendingPostFloorStats(next);
      setHero(next);
      setGemsSpent((prev) => prev + offer.cost);
      setShopSoldIds((prev) => [...prev, offer.id]);
      setShopPurchases((prev) => prev + 1);
      if (offer.kind !== "RELIC") soundEngine.playShopBuy();
    },
    [pendingPostFloorStats, hero, shopSoldIds, activeRelics, runUpgrades, mode, handleNotice]
  );

  /** Sanctuary Shop (Run): sell a relic for half its price to free its slot */
  const handleSellRelic = useCallback(
    (relicId: RelicId) => {
      if (mode !== "RUN") return;
      const sold = applyRunShopSell({
        stats: pendingPostFloorStats ?? hero,
        relics: activeRelics,
        counters: relicCounters,
        relicId,
      });
      if (!sold) return;
      logRunAction({ k: "x", r: relicId });
      setActiveRelics(sold.relics);
      setRelicCounters(sold.counters);
      setPendingPostFloorStats(sold.stats);
      setHero(sold.stats);
      setShopPurchases((prev) => prev + 1);
      const relic = getRelicDisplay(RELIC_REGISTRY[relicId], true);
      handleNotice(`${relic.name} sold for ${sold.value} 🌱`);
      soundEngine.playGoldPickup(2);
    },
    [mode, pendingPostFloorStats, hero, activeRelics, relicCounters, handleNotice]
  );

  /** Sanctuary Shop: pay to draw 3 new (seeded) offers */
  const rerollCost =
    mode === "RUN" ? getRunRerollCost(shopRerolls, activeRelics) : SHOP_REROLL_COST;
  const handleRerollShop = useCallback(() => {
    const base = pendingPostFloorStats ?? hero;
    let next: HeroStats;
    let offers: ShopOffer[];
    if (mode === "RUN") {
      const reroll = applyRunShopReroll({
        stats: base,
        rerolls: shopRerolls,
        runSeed: dungeon.seedKey,
        floorNumber: currentFloor.floorNumber,
        relics: activeRelics,
      });
      if (!reroll) return;
      next = reroll.stats;
      offers = reroll.offers;
      logRunAction({ k: "r" });
    } else {
      if (base.gold < rerollCost) return;
      next = { ...base, gold: base.gold - rerollCost };
      offers = generateShopOffers(
        dungeon.seedKey,
        currentFloor.floorNumber,
        shopRerolls + 1,
        activeRelics
      );
    }
    setPendingPostFloorStats(next);
    setHero(next);
    setGemsSpent((prev) => prev + rerollCost);
    setShopRerolls(shopRerolls + 1);
    setShopSoldIds([]);
    setShopOffers(offers);
    soundEngine.playHintReveal();
  }, [mode, pendingPostFloorStats, hero, shopRerolls, rerollCost, dungeon.seedKey, currentFloor, activeRelics]);

  /** Pruning Shears (Run, rules v9+): remove one tile from the bag for the rest of the Run */
  const canPrune = mode === "RUN" && runRulesAllowPrune(runLogRef.current?.v ?? 0);
  const handlePruneTile = useCallback(
    (index: number) => {
      if (mode !== "RUN" || !runRulesAllowPrune(runLogRef.current?.v ?? 0)) return;
      const pruned = applyRunShopPrune({
        stats: pendingPostFloorStats ?? hero,
        bag: runBag,
        index,
        prunedThisShop: shopPruned,
      });
      if (!pruned) return;
      logRunAction({ k: "p", i: index });
      track("shop_prune", { type: pruned.tile.type, value: pruned.tile.value, bed: currentFloorIndex });
      setRunBag(pruned.bag);
      setShopPruned(true);
      setPendingPostFloorStats(pruned.stats);
      setHero(pruned.stats);
      setGemsSpent((prev) => prev + RUN_PRUNE_COST);
      setShopPurchases((prev) => prev + 1);
      soundEngine.playGoldPickup(2);
    },
    [mode, pendingPostFloorStats, hero, runBag, shopPruned, currentFloorIndex]
  );

  /** Leave the Shop and start the next garden */
  const handleLeaveShop = useCallback(() => {
    const expansionActive = hasExpansionAccess(monetization);
    let nextClassId = heroClassId;

    // A locked companion's one free garden ends here
    if (trialClassFloorActive && !expansionActive && heroClassId !== "KNIGHT") {
      nextClassId = "KNIGHT";
      setHeroClassId("KNIGHT");
      setTrialClassFloorActive(false);
      handleNotice(
        `Your free garden with ${
          HERO_CLASS_REGISTRY[heroClassId].sanctuaryShortName ??
          HERO_CLASS_REGISTRY[heroClassId].shortName
        } is over — unlock the Expansion ($3.99) to keep them.`
      );
    }

    const baseStats = pendingPostFloorStats ?? hero;
    let nextFloorStats = getNextFloorHeroStats(
      baseStats,
      nextClassId,
      activeRelics,
      runUpgrades
    );

    if (mode === "RUN" && practiceStep) {
      // The Practice Garden ends after its Shop
      setPracticeStep("done");
      track("walkthrough_done");
      try {
        window.localStorage.setItem(RUN_LESSONS_DONE_KEY, "1");
      } catch {
        // Ignore storage errors
      }
    }

    if (mode === "RUN" && runGarden) {
      // Lay out the next garden of the run from a fresh shuffle of the bag
      const nextIndex = runGarden.gardenIndex + 1;
      const next = createNextRunGarden({
        stats: baseStats,
        classId: nextClassId,
        relics: activeRelics,
        upgrades: runUpgrades,
        runSeed: dungeon.seedKey,
        bag: runBag,
        gardenIndex: nextIndex,
        // A resumed older Run keeps its own rules (it replays on the server)
        logVersion: runLogRef.current?.v,
        asc: runLogRef.current?.asc,
      });
      logRunAction({ k: "l", h: nextClassId });
      // The Run's own rules decide the next garden's Companion (same as its replay)
      nextFloorStats = next.hero;
      setDungeon((d) => ({ ...d, floors: [...d.floors.slice(0, nextIndex), next.floor] }));
      setRunGarden(next.state);
      setRunNoSafeLine(false);
    }

    if (mode === "DAILY" && isOfficialDailyRun) {
      const loadouts = [...shopLoadoutsRef.current];
      loadouts[currentFloorIndex] = {
        relics: activeRelics,
        upgrades: runUpgrades,
        gemsSpent,
        nextFloorHero: nextFloorStats,
      };
      shopLoadoutsRef.current = loadouts;
      saveDailyProgress({
        dateKey: dungeon.dateKey,
        paths: floorHistory.map((r) => r.path),
        loadouts,
      });
    }

    soundEngine.playCommitPath();
    setCurrentFloorIndex((prev) => prev + 1);
    setFloorStartHero(nextFloorStats);
    setHero(nextFloorStats);
    setPendingPostFloorStats(null);
    setShopOffers([]);
    setShopSoldIds([]);
    setShopRerolls(0);
    setShopPruned(false);
    setShopPurchases(0);
    setLegendaryAward(null);
    setDrawnPath([]);
    setHintCoords([]);
    setHintsRemaining(1);
    setActiveResolutionStep(null);
    setPhase("PLANNING");
  }, [
    monetization,
    heroClassId,
    trialClassFloorActive,
    pendingPostFloorStats,
    hero,
    activeRelics,
    runUpgrades,
    mode,
    isOfficialDailyRun,
    currentFloorIndex,
    gemsSpent,
    dungeon.dateKey,
    dungeon.seedKey,
    dungeon.modifierId,
    floorHistory,
    handleNotice,
    runGarden,
    runBag,
    practiceStep,
  ]);

  /** Dismiss the Value × Length tally and continue (Shop or results) */
  const handleTallyContinue = useCallback(() => {
    if (pendingFlashRef.current.length > 0) {
      const lit = pendingFlashRef.current;
      pendingFlashRef.current = [];
      setFlashRelics(lit);
      window.setTimeout(() => setFlashRelics((prev) => (prev === lit ? [] : prev)), 2200);
    }
    const next = afterTallyRef.current;
    afterTallyRef.current = null;
    setTally(null);
    next?.();
  }, []);

  // ── Run mode ──────────────────────────────────────────────────────────────

  /** Puts a refilled board into the garden being played */
  const setRunGrid = (gardenIndex: number, grid: GridCell[][]) => {
    setDungeon((d) => ({
      ...d,
      floors: d.floors.map((f, i) => (i === gardenIndex ? { ...f, grid } : f)),
    }));
  };

  /** Sends a Run checkpoint / finished Run to the leaderboard (never practice) */
  const sendRunToLeaderboard = (score: number, gardenIndex: number) => {
    const log = runLogRef.current;
    if (practiceStep || score <= 0 || !log || log.seed === PRACTICE_GARDEN_SEED) return;
    void submitRunToLeaderboard({
      score,
      gardenIndex,
      log: { ...log, a: [...log.a] },
    }).then(
      (board) => {
        setLeaderboardRefreshKey((k) => k + 1);
        const you = board?.you;
        if (board?.configured && you) {
          setRunRankLine(
            `🏆 Leaderboard: #${you.rank} of ${board.totalPlayers.toLocaleString()} · best ${you.score.toLocaleString()}`
          );
        }
      }
    );
  };

  /** Ends the run and shows how far it got */
  const endRunMode = (
    reason: RunEndReason,
    garden: RunGardenState,
    history: FloorHistoryRecord[],
    finalStats: HeroStats,
    spent: number = gemsSpent
  ) => {
    clearRunSave();
    const runScore = calculateRunScore(history);
    setFinalScore(runScore);
    if (!practiceStep) {
      track("run_over", { reason, bed: garden.gardenIndex, season: garden.season, run_score: runScore });
    }
    const { record, isNew } = practiceStep
      ? {
          record: { season: 1, gardenIndex: garden.gardenIndex, score: runScore },
          isNew: false,
        }
      : saveRunBestRecord(garden.gardenIndex, runScore);
    recordFinishedRun({
      runMode: "RUN",
      runDungeon: dungeon,
      score: runScore,
      survived: false,
      floorsCleared: garden.gardenIndex,
      starsEarned: 0,
      history,
      gold: finalStats.gold + spent,
    });
    setRunRankLine(null);
    sendRunToLeaderboard(runScore, garden.gardenIndex);
    setRunOver({
      reason,
      gardenIndex: garden.gardenIndex,
      gardenScore: garden.score,
      target: garden.target,
      runScore,
      gardensCleared: garden.gardenIndex,
      best: record,
      isNewBest: isNew,
      asc: practiceStep ? 0 : runLogRef.current?.asc ?? 0,
    });
    setRunNoSafeLine(false);
    setWeedOutMode(false);
    setWeedOutSelection([]);
    setDrawnPath([]);
    setActiveResolutionStep(null);
    setPhase("DEFEAT");
    soundEngine.playDefeatSound();
  };

  /**
   * After a refill or weed-out: if Life can't carry any line to the Exit
   * the garden is lost — unless a Swap can still change the board.
   */
  const checkRunSafeLine = (
    grid: GridCell[][],
    stats: HeroStats,
    garden: RunGardenState,
    history: FloorHistoryRecord[]
  ): boolean => {
    if (hasSurvivableRunLine(grid, stats, dungeon.modifierId, heroClassId, activeRelics)) {
      setRunNoSafeLine(false);
      return true;
    }
    if (garden.weedOutsLeft > 0) {
      setRunNoSafeLine(true);
      handleNotice("No safe line on this board — use a 🌿 Swap to swap tiles.");
      return false;
    }
    endRunMode("NO_SAFE_LINE", garden, history, stats);
    return false;
  };

  /** A committed Run stroke has finished walking: score it and move on */
  const runStrokeResolved = (
    simResult: ReturnType<typeof simulatePath>,
    path: GridCoord[]
  ) => {
    const garden = runGarden;
    if (!garden) return;
    setTotalCellsVisited((prev) => prev + path.length - 1);
    // Gems picked up on the board scored as Value; the purse stays as it was
    const strokeCtx = relicScoreCtx;
    const { breakdown, afterStroke, countersAfter } = scoreRunStroke(
      simResult,
      floorStartHero,
      path,
      activeRelicsForBoard,
      relicCounters,
      garden.strokesLeft,
      !!strokeCtx.relicSets
    );
    setRelicCounters(countersAfter);
    logRunAction({ k: "s", p: packCoords(path) });
    track("line_drawn", {
      bed: garden.gardenIndex,
      line: (garden.strokesTotal ?? RUN_STROKES_PER_GARDEN) - garden.strokesLeft + 1,
      tiles: path.length - 1,
      score: breakdown.total,
      survived: simResult.survives,
      practice: Boolean(practiceStep),
    });
    const record: FloorHistoryRecord = {
      floorNumber: garden.gardenIndex + 1,
      path,
      gridSnapshot: currentFloor.grid,
      steps: simResult.steps,
      endStats: simResult.finalStats,
      cleared: simResult.survives && simResult.endsOnExit,
      stars: simResult.stars,
      floorScore: breakdown.total,
      scoreBreakdown: breakdown,
    };
    const history = [...floorHistory, record];
    setFloorHistory(history);
    // Which relics added to this line (shown lighting up after the result)
    const sources = [...breakdown.chipSources, ...breakdown.multSources, ...breakdown.xMultSources];
    pendingFlashRef.current = activeRelicsForBoard.filter((id) =>
      sources.some((src) => src.label.includes(RELIC_REGISTRY[id].name))
    );

    if (!simResult.survives) {
      endRunMode("WILTED", garden, history, afterStroke);
      return;
    }

    // Teaching: what half of this line would have scored
    let halfLineNote: string | null = null;
    if (path.length >= 6 && breakdown.total > 0) {
      const half = path.slice(0, Math.ceil(path.length / 2));
      const halfSim = simulatePath(
        currentFloor.grid,
        half,
        floorStartHero,
        dungeon.modifierId,
        heroClassId,
        activeRelicsForBoard
      );
      const hb = calculateFloorScoreBreakdown(halfSim, floorStartHero, half.length, activeRelicsForBoard, strokeCtx);
      const halfPoints = Math.round(hb.chips * hb.mult * hb.xMult);
      if (halfPoints > 0 && breakdown.total > halfPoints) {
        const ratio = Math.round((breakdown.total / halfPoints) * 10) / 10;
        halfLineNote = `Half this line (${half.length} tiles) would score about ${halfPoints.toLocaleString()} — the full ${path.length} tiles scored ${breakdown.total.toLocaleString()}, ${ratio}× as much.`;
      }
    }
    // First-time players (and the Practice Garden): compare with a long line
    const teachCompare = !longLineLearned || Boolean(practiceStep);
    if (path.length >= LONG_LINE_LEARNED_TILES && !longLineLearned) {
      setLongLineLearned(true);
      try {
        window.localStorage.setItem(LONG_LINE_LEARNED_KEY, "1");
      } catch {
        // Ignore storage errors
      }
    }
    const compareToken = ++compareTokenRef.current;
    if (teachCompare) {
      const strokeGrid = currentFloor.grid;
      const strokeHero = floorStartHero;
      const relicsNow = activeRelicsForBoard;
      requestParLine({
        grid: strokeGrid,
        startHero: strokeHero,
        modifierId: dungeon.modifierId,
        heroClassId,
        activeRelics: relicsNow,
        scoreCtx: strokeCtx,
      }).then((best) => {
        if (!best || best.length < 2) return;
        const bestSim = simulatePath(strokeGrid, best, strokeHero, dungeon.modifierId, heroClassId, relicsNow);
        const bestScore = calculateFloorScoreBreakdown(bestSim, strokeHero, best.length, relicsNow, strokeCtx).total;
        setTally((prev) =>
          prev?.runStroke?.compare?.token === compareToken
            ? {
                ...prev,
                runStroke: {
                  ...prev.runStroke,
                  compare: {
                    ...prev.runStroke.compare,
                    bestPath: best,
                    bestScore,
                    bestMagicCost: Math.max(0, strokeHero.hp - bestSim.finalStats.hp),
                  },
                },
              }
            : prev
        );
      });
    }

    const strokeNumber = (garden.strokesTotal ?? RUN_STROKES_PER_GARDEN) - garden.strokesLeft + 1;
    const scored: RunGardenState = {
      ...garden,
      score: garden.score + breakdown.total,
      strokesLeft: garden.strokesLeft - 1,
      bestStars: Math.max(garden.bestStars, simResult.stars.totalStars),
    };
    setRunGarden(scored);
    const bloomed = scored.score >= scored.target;
    const outOfStrokes = !bloomed && scored.strokesLeft <= 0;

    // Lines 1–3 of a bed get a small score card instead of the full screen,
    // once the player has seen the full screen a few times and learned long lines
    let fullTalliesSeen = 0;
    try {
      fullTalliesSeen = Number(window.localStorage.getItem(FULL_TALLIES_SEEN_KEY)) || 0;
    } catch {
      // Ignore storage errors
    }
    const compactTally =
      !bloomed && !outOfStrokes && !teachCompare && !practiceStep && fullTalliesSeen >= FULL_TALLIES_BEFORE_COMPACT;
    if (!compactTally) {
      try {
        window.localStorage.setItem(FULL_TALLIES_SEEN_KEY, String(fullTalliesSeen + 1));
      } catch {
        // Ignore storage errors
      }
    }

    soundEngine.playFloorClear();
    setActiveResolutionStep(null);
    setPhase("FLOOR_CLEARED");
    if (compactTally) {
      const key = Date.now();
      setLineToast({ key, points: breakdown.total, score: scored.score, target: scored.target, strokesLeft: scored.strokesLeft });
      const id = window.setTimeout(() => setLineToast((t) => (t?.key === key ? null : t)), 2600);
      resolutionTimersRef.current.push(id);
    }
    const tallyInfo: typeof tally = {
      breakdown,
      stars: simResult.stars,
      floorLabel: `Line ${strokeNumber}/${garden.strokesTotal ?? RUN_STROKES_PER_GARDEN} · ${getRunGardenLabel(garden.gardenIndex)}`,
      runTotalBefore: garden.score,
      bossRuleId: bloomed ? garden.bossRuleId : undefined,
      parPercent: null,
      isFinal: false,
      clearReward: 0,
      runStroke: {
        halfLineNote,
        compare: teachCompare
          ? {
              token: compareToken,
              grid: currentFloor.grid,
              yourPath: path,
              yourScore: breakdown.total,
              bestPath: null,
              bestScore: null,
              yourMagicCost: Math.max(0, floorStartHero.hp - simResult.finalStats.hp),
              bestMagicCost: null,
            }
          : null,
        target: garden.target,
        continueLabel: bloomed
          ? "Garden Bed cleared! →"
          : outOfStrokes
          ? "See the run →"
          : "Next line →",
      },
    };
    if (!compactTally) setTally(tallyInfo);
    afterTallyRef.current = () => {
      if (bloomed) {
        runGardenBloomed(scored, afterStroke, countersAfter);
        // Checkpoint: the Run has reached the next garden with this score
        sendRunToLeaderboard(calculateRunScore(history), scored.gardenIndex + 1);
      } else if (outOfStrokes) {
        endRunMode("MISSED_TARGET", scored, history, afterStroke);
      } else {
        // Refill the tiles this stroke used; the Companion restarts at home
        const refill = refillRunGarden(currentFloor.grid, path, scored, dungeon.seedKey);
        if (practiceStep === "intro" || practiceStep === "draw") {
          setPracticeStep("regrow");
          setPracticeCollapsed(false);
        }
        setRunGrid(scored.gardenIndex, refill.grid);
        setRunGarden(refill.state);
        setHero(afterStroke);
        setFloorStartHero(afterStroke);
        setDrawnPath([]);
        setHintCoords([]);
        setPhase("PLANNING");
        checkRunSafeLine(refill.grid, afterStroke, refill.state, history);
      }
    };
    // Compact: the next line can start right away
    if (compactTally) handleTallyContinue();
  };
  const runStrokeRef = useRef(runStrokeResolved);
  runStrokeRef.current = runStrokeResolved;

  /** A lesson line has been walked: check its goal and explain the result */
  const lessonResolved = (
    sim: ReturnType<typeof simulatePath>,
    path: GridCoord[]
  ) => {
    if (!lesson || lessonIndex === null) return;
    const breakdown = calculateFloorScoreBreakdown(sim, lesson.hero, path.length, []);
    const status = lesson.checkGoal(sim, breakdown, lesson.hero);
    setActiveResolutionStep(null);
    setPhase("FLOOR_CLEARED");
    if (status.ok) {
      soundEngine.playFloorClear();
      const reached = Math.max(lessonsProgress, lessonIndex + 1);
      setLessonsProgress(reached);
      try {
        window.localStorage.setItem(RUN_LESSONS_PROGRESS_KEY, String(reached));
      } catch {
        // Ignore storage errors
      }
    }
    setLessonResult({
      ok: status.ok,
      text: status.ok ? lesson.success : `${lesson.failHint} (${status.detail})`,
      scoreLine: `${breakdown.chips} Value × ${breakdown.mult} Length = ${breakdown.total.toLocaleString()} · Life ${lesson.hero.hp} → ${sim.finalStats.hp}`,
      isLast: lessonIndex === RUN_LESSONS.length - 1,
    });
  };
  const lessonResolvedRef = useRef(lessonResolved);
  lessonResolvedRef.current = lessonResolved;
  const lessonActiveRef = useRef(false);
  lessonActiveRef.current = lesson !== null;
  const firstLineDoneRef = useRef(true);
  firstLineDoneRef.current = firstLineDone;

  // The next tile type on this board the player hasn't been introduced to
  const tileIntroQueue =
    mode === "RUN" && !lesson && seenTileIntros
      ? TILE_INTRO_ORDER.filter(
          (t) => !seenTileIntros.includes(t) && activeGrid.some((row) => row.some((c) => c.type === t))
        )
      : [];
  // Before any Gloves tile appears, say where the Gloves in the top bar come from
  const START_GLOVES_INTRO = "START_GLOVES";
  const showStartGlovesIntro =
    mode === "RUN" &&
    !lesson &&
    !!seenTileIntros &&
    !seenTileIntros.includes(START_GLOVES_INTRO) &&
    !seenTileIntros.includes("SHIELD") &&
    floorStartHero.shield > 0;
  const dismissTileIntro = (type: string) => {
    const next = [...(seenTileIntros ?? []), type];
    setSeenTileIntros(next);
    try {
      window.localStorage.setItem(SEEN_TILE_INTROS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  /** The garden reached its target: pay out Gems (and a Legendary for a Boss) */
  const runGardenBloomed = (
    garden: RunGardenState,
    stats: HeroStats,
    counters: RelicCounters
  ) => {
    if (practiceStep) {
      setPracticeStep("bloom");
      setPracticeCollapsed(false);
    }
    const { payout, legendary, relicsAfter, countersAfter, statsWithPayout, offers } =
      getRunBloomResult({
        garden,
        stats,
        runSeed: dungeon.seedKey,
        relics: activeRelics,
        counters,
        logVersion: runLogRef.current?.v ?? RUN_LOG_VERSION,
        asc: runLogRef.current?.asc,
      });
    runBloomRef.current = { statsWithPayout, offers };
    setRelicCounters(countersAfter);
    if (legendary) setActiveRelics(relicsAfter);
    setLegendaryAward(legendary);
    setHero(stats);
    soundEngine.playVictoryChord();
    setRunClear({
      gardenIndex: garden.gardenIndex,
      score: garden.score,
      target: garden.target,
      strokesLeft: garden.strokesLeft,
      ...payout,
      gemsBefore: stats.gold,
      legendary,
      relicsAfter,
      lifeBonus: runClearLifeFor(runLogRef.current?.v ?? RUN_LOG_VERSION, runLogRef.current?.asc),
      asc: practiceStep ? 0 : runLogRef.current?.asc ?? 0,
      ...bedStarsInfo(garden, !practiceStep),
    });
  };

  /** Saves this bed's stars (not in practice) and reads the Season's bests */
  const bedStarsInfo = (garden: RunGardenState, save: boolean) => {
    const stars = getRunBedStars(garden.score, garden.target, garden.strokesLeft);
    const saved = save ? saveBestStars(garden.gardenIndex, stars) : { best: loadBestStars(), improved: false };
    setTotalStars(totalBestStars(saved.best));
    const first = garden.gardenIndex - (garden.gardenIndex % 3);
    const seasonBestStars: [number, number, number] = [0, 1, 2].map(
      (k) => saved.best[first + k] ?? 0
    ) as [number, number, number];
    if (save) {
      track("bed_cleared", { bed: garden.gardenIndex, season: garden.season, stars, score: garden.score, target: garden.target, lines_left: garden.strokesLeft });
    }
    // Looks earned by playing: new stars or a new Season can unlock some
    if (save) recordBedReached(garden.gardenIndex + 1);
    // Clearing the Season 3 Boss unlocks the next Ascension level (and Ascension rewards)
    let ascLevel: number | null = null;
    if (save && garden.gardenIndex === ASCENSION_UNLOCK_BED) {
      recordAscensionCleared(runLogRef.current?.asc ?? 0);
      ascLevel = unlockAscensionAfter(runLogRef.current?.asc ?? 0);
    }
    const unlocked = save ? takeNewUnlocks().map((u) => ({ icon: u.icon, name: u.name })) : [];
    if (ascLevel !== null) unlocked.push({ icon: "🔥", name: `Ascension ${ascLevel}` });
    const progress = loadUnlockProgress();
    const deepestSeason = Math.floor(progress.highestBed / 3) + 1;
    const next = getNextStarUnlocks(progress);
    const nextUnlock = next
      ? { stars: next.stars, have: progress.stars, text: next.items.map((u) => `${u.icon} ${u.name}`).join(" · ") }
      : null;
    return { seasonBestStars, newBestStars: saved.improved, unlocked, deepestSeason, nextUnlock };
  };

  const handleRunClearContinue = () => {
    const info = runClear;
    if (!info) return;
    setRunClear(null);
    if (practiceStep) {
      setPracticeStep("shop");
      setPracticeCollapsed(false);
    }
    const bloom = runBloomRef.current;
    runBloomRef.current = null;
    const withPayout = bloom?.statsWithPayout ?? { ...hero, gold: info.gemsBefore + info.total };
    setPendingPostFloorStats(withPayout);
    setHero(withPayout);
    setShopOffers(
      bloom?.offers ??
        generateShopOffers(dungeon.seedKey, info.gardenIndex + 1, 0, info.relicsAfter)
    );
    setShopSoldIds([]);
    setShopRerolls(0);
    setShopPruned(false);
    setShopPurchases(0);
    setPhase("SHOP");
  };

  const handleToggleWeedOut = () => {
    if (!runGarden || phase !== "PLANNING") return;
    if (weedOutMode) {
      setWeedOutMode(false);
      setWeedOutSelection([]);
      return;
    }
    if (runGarden.weedOutsLeft <= 0) return;
    setDrawnPath([]);
    setHintCoords([]);
    setWeedOutSelection([]);
    setWeedOutMode(true);
  };

  const handleToggleWeedOutTile = (coord: GridCoord) => {
    setWeedOutSelection((prev) => {
      if (prev.some((c) => isSameCoord(c, coord))) {
        return prev.filter((c) => !isSameCoord(c, coord));
      }
      if (prev.length >= RUN_WEEDOUT_MAX_TILES) return prev;
      return [...prev, coord];
    });
  };

  const handleConfirmWeedOut = () => {
    if (!runGarden || weedOutSelection.length === 0) return;
    const spent = { ...runGarden, weedOutsLeft: runGarden.weedOutsLeft - 1 };
    logRunAction({ k: "w", c: packCoords(weedOutSelection) });
    const refill = refillRunGarden(
      currentFloor.grid,
      weedOutSelection,
      spent,
      dungeon.seedKey
    );
    setRunGrid(spent.gardenIndex, refill.grid);
    setRunGarden(refill.state);
    setWeedOutMode(false);
    setWeedOutSelection([]);
    soundEngine.playHintReveal();
    if (practiceStep && practiceStep !== "weeded") {
      setPracticeStep("weeded");
      setPracticeCollapsed(false);
    }
    checkRunSafeLine(refill.grid, floorStartHero, refill.state, floorHistory);
  };

  const handleEndRunEarly = () => {
    if (!runGarden) return;
    clearResolutionTimers();
    endRunMode("ENDED", runGarden, floorHistory, hero);
  };

  /**
   * On startup: rebuild a Run saved on this device by replaying its action
   * log (board, Tile Bag, score, purse, relics, Shop…) and continue it where
   * it was left. A save that no longer replays is dropped with a notice.
   */
  const resumedRef = useRef(false);
  const showLongNotice = (msg: string) => {
    // Own timer (not a resolution timer) so a reset doesn't leave it stuck
    setRetractNotice(msg);
    window.setTimeout(() => setRetractNotice((prev) => (prev === msg ? null : prev)), 5000);
  };
  const resumeSavedRun = () => {
    // Only once per page load (dev Strict Mode runs mount effects twice)
    if (resumedRef.current) return;
    resumedRef.current = true;
    const saved = readRunSave();
    if (!saved) {
      startRun();
      return;
    }
    const rebuilt = rebuildRunFromSave(saved);
    if (!rebuilt.ok) {
      startRun();
      showLongNotice(
        "Your last Garden Run couldn't be picked up after a game update — a fresh one is ready. 🌱"
      );
      return;
    }
    const r = rebuilt.run;
    const runDungeon: DungeonTheme = {
      seedKey: r.seed,
      dateKey: getTodayDateKey(),
      title: "Garden Run",
      lore: "Season after season the gardens grow wilder. Clear each one before your lines run out.",
      modifierId: runModifierFor(r.log.v),
      source: "deterministic-fallback",
      floors: r.floors,
    };
    // Old free-trial saves keep their companion (no more trials in Runs)
    resetRunWithDungeon(runDungeon, "RUN", r.classId, false);
    setRunBag(r.bag);
    runLogRef.current = { ...r.log, a: [...r.log.a] };
    runBloomRef.current = null;
    setLessonIndex(null);
    setLessonResult(null);
    setShowLessonGhost(false);
    setPracticeCollapsed(false);
    setPracticeStep(null);
    setCurrentFloorIndex(r.garden.gardenIndex);
    setActiveRelics(r.relics);
    setRelicCounters(r.counters);
    setRunUpgrades(r.upgrades);
    setGemsSpent(r.gemsSpent);
    setFloorHistory(r.history);
    setTotalCellsVisited(r.totalCellsVisited);
    setHintsRemaining(r.hints);
    setRunGarden(r.garden);

    if (r.phase === "OVER") {
      // The last stroke ended the Run but its summary was never shown
      setHero(r.startHero);
      setFloorStartHero(r.startHero);
      endRunMode(r.overReason, r.garden, r.history, r.startHero, r.gemsSpent);
      return;
    }
    if ((r.phase === "CLEAR" || r.phase === "SHOP") && r.bloom) {
      const b = r.bloom;
      setFloorStartHero(b.strokeStartHero);
      setLegendaryAward(b.legendary);
      if (r.phase === "CLEAR") {
        runBloomRef.current = { statsWithPayout: b.statsWithPayout, offers: b.offers };
        setHero(b.afterStroke);
        setRunClear({
          gardenIndex: b.garden.gardenIndex,
          score: b.garden.score,
          target: b.garden.target,
          strokesLeft: b.garden.strokesLeft,
          ...b.payout,
          gemsBefore: b.afterStroke.gold,
          legendary: b.legendary,
          relicsAfter: b.relicsAfter,
          lifeBonus: runClearLifeFor(r.log.v, r.log.asc),
          asc: r.log.asc ?? 0,
          ...bedStarsInfo(b.garden, true),
        });
        setPhase("FLOOR_CLEARED");
      } else {
        setHero(r.shop.stats);
        setPendingPostFloorStats(r.shop.stats);
        setShopOffers(r.shop.offers);
        setShopSoldIds(r.shop.soldIds);
        setShopRerolls(r.shop.rerolls);
        setShopPurchases(r.shop.purchases);
        setShopPruned(r.shop.pruned);
        setPhase("SHOP");
      }
    } else {
      setHero(r.startHero);
      setFloorStartHero(r.startHero);
      setRunNoSafeLine(r.noSafeLine);
    }
    showLongNotice(`✓ Your Garden Run was saved. Welcome back — ${r.label}.`);
  };

  // Keep the Run in progress saved on this device after every committed
  // stroke, Swap, Shop action and garden change (never practice/lessons)
  useEffect(() => {
    if (!isMounted || mode !== "RUN" || lessonIndex !== null) return;
    const log = runLogRef.current;
    const ended = phase === "DEFEAT" || phase === "VICTORY" || runOver !== null;
    if (!log || log.a.length === 0 || practiceStep || ended) {
      clearRunSave();
      return;
    }
    writeRunSave({
      log,
      trial: trialClassFloorActive,
      hints: hintsRemaining,
      inShop: phase === "SHOP",
    });
  }, [
    isMounted,
    mode,
    lessonIndex,
    practiceStep,
    phase,
    runOver,
    runGarden,
    runClear,
    shopSoldIds,
    shopRerolls,
    shopPruned,
    trialClassFloorActive,
    hintsRemaining,
    heroClassId,
  ]);

  /**
   * Hint: shows the best line on the board as a ghost (with a guiding finger)
   * until the board changes.
   */
  const hintPendingRef = useRef(false);
  /** Run: the full best line shown as a ghost after a Hint */
  const [hintLine, setHintLine] = useState<GridCoord[] | null>(null);
  useEffect(() => {
    setHintLine(null);
  }, [activeGrid]);
  const latestGridRef = useRef(activeGrid);
  latestGridRef.current = activeGrid;
  const handleRequestHint = useCallback(() => {
    if (hintsRemaining <= 0 || phase === "RESOLVING") return;
    if (isInteractiveTutorial) {
      setHintsRemaining((prev) => Math.max(0, prev - 1));
      setHintCoords(activeTutorialStage.ghostGuidePath.slice(1, 4));
      soundEngine.playHintReveal();
      const timerId = window.setTimeout(() => {
        setHintCoords([]);
      }, 5000);
      resolutionTimersRef.current.push(timerId);
      return;
    }
    if (hintPendingRef.current) return;
    hintPendingRef.current = true;

    const grid = activeGrid;
    const showHintTile = (line: GridCoord[] | null) => {
      hintPendingRef.current = false;
      if (latestGridRef.current !== grid) return; // board changed meanwhile
      // Fall back to any surviving line if the par search found nothing
      const route =
        line && line.length >= 2
          ? line
          : findSurvivableHintPath(
              grid,
              floorStartHero,
              activeModifierId,
              activeClassForBoard,
              activeRelicsForBoard
            );
      if (!route || route.length < 2) {
        handleNotice(
          "No safe line from here — try gathering Gloves or Shears tiles first."
        );
        return;
      }
      // Show the whole best line as a ghost to trace (it stays until the board changes)
      setHintsRemaining((prev) => Math.max(0, prev - 1));
      setDrawnPath([]);
      setHintLine(route);
      soundEngine.playHintReveal();
      handleNotice("Here's a great line — trace it, or use it as a guide for your own.");
    };

    requestParLine({
      grid,
      startHero: floorStartHero,
      modifierId: activeModifierId,
      heroClassId: activeClassForBoard,
      activeRelics: activeRelicsForBoard,
      scoreCtx: relicScoreCtx,
    }).then(showHintTile, () => showHintTile(null));
  }, [
    relicScoreCtx,
    hintsRemaining,
    phase,
    isInteractiveTutorial,
    activeTutorialStage.ghostGuidePath,
    activeGrid,
    drawnPath,
    floorStartHero,
    activeModifierId,
    activeClassForBoard,
    activeRelicsForBoard,
    handleNotice,
  ]);

  const handleSelectCosmetics = useCallback((next: CosmeticPreferences) => {
    const saved = saveCosmeticPreferences(next);
    setCosmetics(saved);
  }, []);

  const handleSkipTutorial = useCallback(() => {
    markTutorialDone();
    setIsInteractiveTutorial(false);
    setShowTutorial(false);
    resetRunWithDungeon(dungeon, mode);
  }, [dungeon, mode, resetRunWithDungeon]);

  /**
   * Step-by-step Auto-Battle Resolution (180ms per step)
   */
  const handleCommitPath = useCallback(
    (committedPath: GridCoord[]) => {
      if (phase === "RESOLVING" || committedPath.length < 2) return;
      if (lessonActiveRef.current && phase !== "PLANNING") return;
      if (
        mode === "RUN" &&
        !lessonActiveRef.current &&
        (phase !== "PLANNING" || weedOutMode || !runGarden)
      ) {
        return;
      }
      clearResolutionTimers();
      setRetractNotice(null);
      setHintCoords([]);
      setPhase("RESOLVING");
      setActiveResolutionStep(0);

      const simResult = simulatePath(
        activeGrid,
        committedPath,
        floorStartHero,
        activeModifierId,
        activeClassForBoard,
        activeRelicsForBoard
      );

      // Celebrate long lines (Sprout and up) as soon as they're let go
      const tier = getLineTier(committedPath.length);
      if (mode === "RUN" && tier.level > 0 && simResult.survives && simResult.endsOnExit) {
        const b = calculateFloorScoreBreakdown(
          simResult,
          floorStartHero,
          committedPath.length,
          activeRelicsForBoard,
          relicScoreCtx
        );
        const key = Date.now();
        setLineCallout({
          key,
          name: tier.name,
          color: tier.color,
          tiles: committedPath.length - 1,
          points: Math.round(b.chips * b.mult * b.xMult),
        });
        soundEngine.playVictoryChord();
        const id = window.setTimeout(
          () => setLineCallout((c) => (c?.key === key ? null : c)),
          1500
        );
        resolutionTimersRef.current.push(id);
      }

      const STEP_MS = 180;

      simResult.steps.forEach((step, idx) => {
        if (idx === 0) return;

        const timerId = window.setTimeout(() => {
          setActiveResolutionStep(idx);
          setHero({
            hp: step.hpAfter,
            maxHp: floorStartHero.maxHp,
            shield: step.shieldAfter,
            weapon: step.weaponAfter,
            // Run: board Gems only score, so the purse doesn't change mid-stroke
            gold: mode === "RUN" ? floorStartHero.gold : step.goldAfter,
          });

          if (step.shatteredShield) {
            soundEngine.playGlassShatter();
          } else if (step.isShadowStepCross) {
            soundEngine.playStepPulse(idx);
          } else {
            switch (step.cell.type) {
              case "ENEMY":
                if ((cosmetics.visualTheme ?? "SANCTUARY") === "SANCTUARY") {
                  soundEngine.playSanctuaryHarpChime(idx);
                } else {
                  soundEngine.playSwordHit(
                    step.weaponBefore > 0 ||
                      step.momentumTriggered ||
                      Boolean(step.backstabApplied)
                  );
                }
                break;
              case "SHIELD":
                if (step.vampireTransmuteWeapon) {
                  soundEngine.playWeaponPickup();
                } else {
                  soundEngine.playShieldClink();
                }
                break;
              case "WEAPON":
                soundEngine.playWeaponPickup();
                break;
              case "POTION":
                soundEngine.playPotionEffect(step.hpDelta < 0);
                break;
              case "GOLD":
                if ((cosmetics.visualTheme ?? "SANCTUARY") === "SANCTUARY") {
                  soundEngine.playSanctuaryHarpChime(step.goldComboCount || 1);
                } else {
                  soundEngine.playGoldPickup(step.goldComboCount || 1);
                }
                break;
              case "TRAP":
                soundEngine.playTrapEffect(
                  step.trapDodgedDiagonally || Boolean(step.spikedBootsTriggered)
                );
                break;
              case "EXIT":
                soundEngine.playPortalBurst();
                break;
              default:
                soundEngine.playStepPulse(idx);
            }
          }
        }, idx * STEP_MS);

        resolutionTimersRef.current.push(timerId);
      });

      // Finalize floor after last step completes
      // Finalize floor after last step completes (or right away when skipped)
      const finalize = () => {
        skipPlaybackRef.current = null;
        // Handle 7-Step Interactive Onboarding stage progression
        if (isInteractiveTutorial) {
          if (!simResult.survives) {
            soundEngine.playDefeatSound();
            loadTutorialStage(tutorialStageIndex);
            return;
          }

          if (tutorialStageIndex < TUTORIAL_STAGES.length - 1) {
            soundEngine.playFloorClear();
            setPhase("FLOOR_CLEARED");
            const nextStageTimer = window.setTimeout(() => {
              loadTutorialStage(tutorialStageIndex + 1);
            }, 720);
            resolutionTimersRef.current.push(nextStageTimer);
          } else {
            // Stage 7 Completed! Mark tutorial done, award +50 Bonus Gold/Gems, show toast banner & load Floor 1 of Daily Seed
            soundEngine.playVictoryChord();
            markTutorialDone();
            const updatedStats = addBankedGold(50);
            setPlayerStats(updatedStats);
            setPhase("FLOOR_CLEARED");

            const enterDailyTimer = window.setTimeout(() => {
              startDaily();
              setTrainingToastBanner(
                true
                  ? "GARDEN ONBOARDING COMPLETE (+50 🌰 GEMS) — ENTERING DAILY SANCTUARY"
                  : "TACTICAL TRAINING COMPLETE (+50 🪙) — ENTERING DAILY DUNGEON"
              );
              const clearToastId = window.setTimeout(() => {
                setTrainingToastBanner(null);
              }, 4200);
              resolutionTimersRef.current.push(clearToastId);
            }, 760);
            resolutionTimersRef.current.push(enterDailyTimer);
          }
          return;
        }

        if (!firstLineDoneRef.current) {
          firstLineDoneRef.current = true;
          setFirstLineDone(true);
          try {
            window.localStorage.setItem(FIRST_LINE_DONE_KEY, "1");
          } catch {
            // Ignore storage errors
          }
        }
        if (lessonActiveRef.current) {
          lessonResolvedRef.current(simResult, committedPath);
          return;
        }
        if (mode === "RUN") {
          runStrokeRef.current(simResult, committedPath);
          return;
        }

        const floorStepsVisited = committedPath.length - 1;
        const newTotalCells = totalCellsVisited + floorStepsVisited;
        setTotalCellsVisited(newTotalCells);

        const floorIdx = currentFloorIndex;
        const breakdown = calculateFloorScoreBreakdown(
          simResult,
          floorStartHero,
          committedPath.length,
          activeRelicsForBoard
        );
        const record: FloorHistoryRecord = {
          floorNumber: currentFloor.floorNumber,
          path: committedPath,
          gridSnapshot: currentFloor.grid,
          steps: simResult.steps,
          endStats: simResult.finalStats,
          cleared: simResult.survives && simResult.endsOnExit,
          stars: simResult.stars,
          floorScore: breakdown.total,
          scoreBreakdown: breakdown,
          // Daily: fixed par shared by everyone. Other modes: par from the
          // player's own starting stats, computed in the background.
          parScore:
            mode === "DAILY" ? dailyPars?.[floorIdx] || undefined : undefined,
        };
        const updatedHistory = [...floorHistory, record];
        setFloorHistory(updatedHistory);
        if (mode !== "DAILY") {
          const parFloorNumber = record.floorNumber;
          requestFloorPar({
            grid: activeGrid,
            startHero: floorStartHero,
            modifierId: activeModifierId,
            heroClassId: activeClassForBoard,
            activeRelics: activeRelicsForBoard,
          }).then((par) => {
            if (!par) return;
            setFloorHistory((prev) =>
              prev.map((r) =>
                r.floorNumber === parFloorNumber && r.gridSnapshot === record.gridSnapshot
                  ? { ...r, parScore: par }
                  : r
              )
            );
          });
        }
        if (mode === "DAILY" && isOfficialDailyRun) {
          saveDailyProgress({
            dateKey: dungeon.dateKey,
            paths: updatedHistory.map((r) => r.path),
            loadouts: shopLoadoutsRef.current,
          });
        }
        if (coachStep === 1) setCoachStep(2);

        const totalFloorsInDungeon = dungeon.floors.length;

        if (!simResult.survives) {
          finishRun({
            runMode: mode,
            runDungeon: dungeon,
            history: updatedHistory,
            finalStats: simResult.finalStats,
            cellsVisited: newTotalCells,
            completedAll: false,
            gemsSpent,
          });
          return;
        }

        // Value × Length tally, then the Sanctuary Shop (or the results)
        const isFinalFloor = currentFloorIndex >= totalFloorsInDungeon - 1;
        const bossRuleId = currentFloor.bossRuleId;
        // Clearing a Boss Garden with gardens still ahead earns a Legendary relic
        const legendary =
          bossRuleId && !isFinalFloor
            ? pickLegendaryRelic(dungeon.seedKey, currentFloor.floorNumber, activeRelics)
            : null;
        const relicsAfter = legendary ? [...activeRelics, legendary] : activeRelics;
        if (legendary) setActiveRelics(relicsAfter);
        setLegendaryAward(legendary);

        soundEngine.playFloorClear();
        setLastClearedFloorStars(simResult.stars);
        setActiveResolutionStep(null);
        setPhase("FLOOR_CLEARED");
        const parForFloor = record.parScore;
        const clearReward = isFinalFloor
          ? 0
          : getGardenClearReward(simResult.stars.totalStars, Boolean(bossRuleId));
        setTally({
          clearReward,
          breakdown,
          stars: simResult.stars,
          floorLabel: `${bossRuleId ? "Boss Garden" : "Garden"} ${currentFloorIndex + 1}/${totalFloorsInDungeon} bloomed`,
          runTotalBefore: calculateRunScore(floorHistory),
          bossRuleId,
          parPercent:
            parForFloor && parForFloor > 0
              ? Math.round((breakdown.total / parForFloor) * 100)
              : null,
          isFinal: isFinalFloor,
        });

        if (isFinalFloor) {
          afterTallyRef.current = () =>
            finishRun({
              runMode: mode,
              runDungeon: dungeon,
              history: updatedHistory,
              finalStats: simResult.finalStats,
              cellsVisited: newTotalCells,
              completedAll: true,
              gemsSpent,
            });
        } else {
          afterTallyRef.current = () => {
            setPendingPostFloorStats({
              ...simResult.finalStats,
              gold: simResult.finalStats.gold + clearReward,
            });
            setHero((prev) => ({ ...prev, gold: simResult.finalStats.gold + clearReward }));
            setShopOffers(
              generateShopOffers(dungeon.seedKey, currentFloor.floorNumber, 0, relicsAfter)
            );
            setShopSoldIds([]);
            setShopRerolls(0);
            setShopPruned(false);
            setPhase("SHOP");
          };
        }
      };
      const finishTimerId = window.setTimeout(finalize, simResult.steps.length * STEP_MS + 140);
      resolutionTimersRef.current.push(finishTimerId);

      // A tap on the board jumps to the end of the replay
      skipPlaybackRef.current = () => {
        clearResolutionTimers();
        setLineCallout(null);
        const last = simResult.steps[simResult.steps.length - 1];
        setActiveResolutionStep(simResult.steps.length - 1);
        setHero({
          hp: last.hpAfter,
          maxHp: floorStartHero.maxHp,
          shield: last.shieldAfter,
          weapon: last.weaponAfter,
          gold: mode === "RUN" ? floorStartHero.gold : last.goldAfter,
        });
        finalize();
      };
    },
    [
      phase,
      clearResolutionTimers,
      activeGrid,
      floorStartHero,
      activeModifierId,
      activeClassForBoard,
      activeRelicsForBoard,
      cosmetics.visualTheme,
      isInteractiveTutorial,
      tutorialStageIndex,
      loadTutorialStage,
      resetRunWithDungeon,
      startDaily,
      finishRun,
      currentFloor,
      dungeon,
      mode,
      dailyPars,
      isOfficialDailyRun,
      coachStep,
      activeRelics,
      gemsSpent,
      totalCellsVisited,
      floorHistory,
      currentFloorIndex,
      weedOutMode,
      runGarden,
    ]
  );

  /**
   * Ends the visit early. Only committed gardens count; the garden in
   * progress is left unvisited (no failure screen, no lost stars).
   */
  const handleEndVisit = useCallback(() => {
    setIsFinishConfirmOpen(false);
    clearResolutionTimers();
    setDrawnPath([]);
    finishRun({
      runMode: mode,
      runDungeon: dungeon,
      history: floorHistory,
      finalStats: floorStartHero,
      cellsVisited: totalCellsVisited,
      completedAll: false,
      gemsSpent,
    });
  }, [
    clearResolutionTimers,
    finishRun,
    mode,
    dungeon,
    floorHistory,
    floorStartHero,
    totalCellsVisited,
    gemsSpent,
  ]);

  const handleSwitchMode = useCallback(
    (nextMode: GameMode) => {
      markTutorialDone();
      if (nextMode === "DAILY") {
        startDaily();
      } else if (nextMode === "SANDBOX") {
        const randomModifier =
          MODIFIER_LIST[Math.floor(Math.random() * MODIFIER_LIST.length)].id;
        const sandboxSeed = `sandbox-${Date.now()}`;
        const sandboxDungeon = generateDeterministicDungeon(sandboxSeed, {
          preferredModifier: randomModifier,
        });
        resetRunWithDungeon(sandboxDungeon, "SANDBOX");
      } else if (nextMode === "GAUNTLET") {
        const gauntletDungeon = generateGauntletDungeon();
        resetRunWithDungeon(gauntletDungeon, "GAUNTLET");
      } else if (nextMode === "RUN") {
        startRun();
      }
    },
    [resetRunWithDungeon, startDaily, startRun]
  );

  const handleLaunchArchiveDate = useCallback(
    (dateKey: string) => {
      const archiveDungeon = generateDeterministicDungeon(dateKey);
      resetRunWithDungeon(archiveDungeon, "ARCHIVE");
      fetchDailyLeaderboard(dateKey, archiveDungeon.modifierId).then(
        setLeaderboard
      );
      handleNotice(
        true
          ? `Visiting the garden from ${dateKey}`
          : `Loaded Daily Archive Seed: ${dateKey}`
      );
    },
    [resetRunWithDungeon, handleNotice, cosmetics.visualTheme]
  );

  const handleNewSandboxDungeon = useCallback(() => {
    if (mode === "GAUNTLET") {
      const gauntletDungeon = generateGauntletDungeon();
      resetRunWithDungeon(gauntletDungeon, "GAUNTLET");
      return;
    }
    const randomModifier =
      MODIFIER_LIST[Math.floor(Math.random() * MODIFIER_LIST.length)].id;
    const sandboxSeed = `sandbox-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;
    const sandboxDungeon = generateDeterministicDungeon(sandboxSeed, {
      preferredModifier: randomModifier,
    });
    resetRunWithDungeon(sandboxDungeon, mode === "DAILY" ? "SANDBOX" : mode);
  }, [resetRunWithDungeon, mode]);

  const handleCraftCustomDungeon = useCallback(
    async (customPrompt: string, preferredModifier?: ModifierId) => {
      setIsGeneratingAi(true);
      setStoreMessage(null);
      try {
        const res = await fetch("/api/generate-dungeon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customPrompt,
            preferredModifier,
            playerId: getOrCreatePlayerId(),
          }),
        });
        if (res.ok) {
          const crafted: DungeonTheme & { remainingToday?: number | null } =
            await res.json();
          resetRunWithDungeon(crafted, "CUSTOM");
          setIsPassModalOpen(false);
          if (typeof crafted.remainingToday === "number") {
            handleNotice(
              `Garden crafted! ${crafted.remainingToday} craft${
                crafted.remainingToday === 1 ? "" : "s"
              } left today.`
            );
          }
        } else if (res.status === 429) {
          setStoreMessage(
            "You've crafted 3 gardens today — the Crafter refills tomorrow."
          );
        } else if (res.status === 402) {
          setStoreMessage("The Garden Crafter is part of the Expansion.");
        } else {
          setStoreMessage("The Crafter couldn't grow that garden. Please try again.");
        }
      } catch {
        setStoreMessage("You seem to be offline — the Crafter needs a connection.");
      } finally {
        setIsGeneratingAi(false);
      }
    },
    [resetRunWithDungeon, handleNotice]
  );

  const handleToggleSound = useCallback(() => {
    const next = !soundEnabled;
    soundEngine.setSoundEnabled(next);
    setSoundEnabled(next);
  }, [soundEnabled]);

  const handleToggleMusic = useCallback(() => {
    const next = !musicEnabled;
    soundEngine.setMusicEnabled(next);
    setMusicEnabled(next);
  }, [musicEnabled]);

  // Sends the player to Stripe Checkout. The Expansion is only unlocked once
  // the server confirms the payment (see the mount effect above).
  const handleUnlockExpansion = useCallback(async () => {
    setIsCheckoutPending(true);
    setStoreMessage(null);
    const result = await startExpansionCheckout();
    if (result.ok) {
      window.location.href = result.url;
      return;
    }
    setIsCheckoutPending(false);
    setStoreMessage(
      result.reason === "not_configured"
        ? "Purchases aren't open yet — check back soon!"
        : "Couldn't reach checkout. Please try again in a moment."
    );
  }, []);

  const handleSendRestoreLink = useCallback(async (email: string) => {
    const result = await sendRestoreLink(email);
    setStoreMessage(
      result === "sent"
        ? `Check ${email} for a sign-in link to restore your purchase.`
        : result === "not_configured"
        ? "Restoring purchases isn't available yet."
        : "Couldn't send the link. Check the address and try again."
    );
  }, []);

  const handleToggleDevSimulate = useCallback(() => {
    const nextSim = !monetization.devSimulatePass;
    const updated = saveMonetizationState({
      ...monetization,
      devSimulatePass: nextSim,
    });
    setMonetization(updated);
    if (nextSim) {
      setTrialClassFloorActive(false);
      soundEngine.playGoldPickup(2);
    }
  }, [monetization]);

  const handleSubmitLeaderboardScore = useCallback(
    async (playerName: string) => {
      const updated = await submitDailyLeaderboardScore({
        playerName,
        dateKey: dungeon.dateKey,
        score: finalScore,
        remainingHp: hero.hp,
        goldCollected: hero.gold,
        cellsVisited: totalCellsVisited,
        modifierId: dungeon.modifierId,
        survived: phase === "VICTORY",
      });
      setLeaderboard(updated);
    },
    [
      dungeon.dateKey,
      dungeon.modifierId,
      finalScore,
      hero.hp,
      hero.gold,
      totalCellsVisited,
      phase,
    ]
  );

  // One voice (Sanctuary) everywhere; the Tactician theme is a visual skin
  // only (board art, background and sounds).
  const visualTheme = cosmetics.visualTheme ?? "SANCTUARY";
  const isSanctuary = true;
  const isSanctuarySkin = visualTheme === "SANCTUARY";
  const totalSanctuaryGems = (playerStats.totalBankedGold || 0) + hero.gold;

  if (!isMounted) {
    return (
      <main
        suppressHydrationWarning
        className="min-h-dvh w-full bg-[radial-gradient(ellipse_at_top,_#294031_0%,_#19281E_55%,_#101813_100%)] text-white flex items-center justify-center"
      />
    );
  }

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
    <main
      className={`h-[100dvh] w-full text-white flex flex-col justify-start items-center gap-1.5 sm:gap-2 [@media(max-height:700px)]:gap-1 overflow-x-hidden overflow-y-auto [&>*]:shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] transition-colors duration-500 ${
        isSanctuarySkin
          ? "bg-[radial-gradient(ellipse_at_top,_#294031_0%,_#19281E_55%,_#101813_100%)]"
          : "bg-[radial-gradient(ellipse_at_top,_#121B15_0%,_#0B0F0C_55%,_#060706_100%)]"
      }`}
    >
      {/* Phones held sideways: the game is played upright */}
      <div className="rotate-hint fixed inset-0 z-[90] bg-[#101813] flex-col items-center justify-center gap-3 text-center px-6">
        <div className="text-5xl" aria-hidden="true">📱</div>
        <div className="text-lg font-black text-white">Turn your phone upright</div>
        <p className="text-sm text-indigo-100/80 max-w-xs">
          Bloomline is played in portrait so the whole garden fits on screen.
        </p>
      </div>

      {/* Spacer: centres the game vertically on tall screens (collapses when content overflows) */}
      <div aria-hidden="true" className="grow basis-0 !shrink min-h-0" />

      {/* Training Complete Toast Banner */}
      {trainingToastBanner && (
        <div className="w-full max-w-[430px] mx-auto mb-1.5 rounded-xl px-3 py-2 bg-emerald-500/20 border border-emerald-400 text-emerald-100 font-mono text-xs font-extrabold text-center shadow-[0_0_24px_rgba(16,185,129,0.45)] animate-pulse">
          ✨ {trainingToastBanner}
        </div>
      )}

      {/* Top Tactical / Sanctuary HUD + Hero Class Selector Bar / Coach Card */}
      <TopHUD
        mode={mode}
        runOnly={RUN_ONLY}
        totalStars={totalStars}
        isDailyCompanionLocked={mode === "DAILY" && !isInteractiveTutorial}
        dungeon={dungeon}
        currentFloorIndex={currentFloorIndex}
        grid={activeGrid}
        hero={hero}
        heroClassId={activeClassForBoard}
        trialClassFloorActive={trialClassFloorActive}
        activeRelics={activeRelicsForBoard}
        simulation={simulation}
        drawnPathLength={drawnPath.length}
        isResolving={
          phase === "RESOLVING" ||
          phase === "FLOOR_CLEARED" ||
          phase === "SHOP"
        }
        playerStats={playerStats}
        monetization={monetization}
        cosmetics={cosmetics}
        soundEnabled={soundEnabled}
        musicEnabled={musicEnabled}
        retractNotice={retractNotice}
        showTutorial={showTutorial}
        isInteractiveTutorial={isInteractiveTutorial}
        tutorialStageNumber={activeTutorialStage.stageNumber}
        tutorialStageTitle={
          isSanctuary
            ? activeTutorialStage.sanctuaryTitle
            : activeTutorialStage.title
        }
        tutorialCoachBanner={
          isSanctuary
            ? activeTutorialStage.sanctuaryCoachBanner
            : activeTutorialStage.coachBanner
        }
        onToggleTutorial={(next) => {
          const wantTutorial =
            typeof next === "boolean"
              ? next
              : !(showTutorial || isInteractiveTutorial);
          if (wantTutorial) {
            loadTutorialStage(0);
          } else {
            handleSkipTutorial();
          }
        }}
        onSkipTutorial={handleSkipTutorial}
        onSelectTutorialStage={(idx) => loadTutorialStage(idx)}
        onOpenReferenceManual={() => {
          setIsInteractiveTutorial(false);
          setShowTutorial(true);
        }}
        onToggleSound={handleToggleSound}
        onToggleMusic={handleToggleMusic}
        onSwitchMode={handleSwitchMode}
        onSelectHeroClass={handleSelectHeroClass}
        onSelectCosmetics={handleSelectCosmetics}
        onOpenSanctuaryGallery={
          RUN_ONLY ? undefined : () => setIsSanctuaryModalOpen(true)
        }
        onOpenGuide={RUN_ONLY ? () => setHelpMenu("help") : undefined}
        onOpenLooks={RUN_ONLY ? () => setLooksOpen(true) : undefined}
        companionMoveUsed={
          RUN_ONLY && mode === "RUN" && lessonIndex === null
            ? heroClassId === "ROGUE"
              ? countPathSelfCrosses(drawnPath) > 0
              : heroClassId === "MAGE"
              ? countPathBlinks(drawnPath) > 0
              : null
            : null
        }
        onCompanionTap={
          RUN_ONLY
            ? () => {
                // Before the first line a new Run can still switch companion; after it, show the rule
                if (mode === "RUN" && floorHistory.length === 0 && !practiceStep && lessonIndex === null && unlockedRunCompanions().length > 1) {
                  setAscPickerOpen(true);
                  return;
                }
                const def = HERO_CLASS_REGISTRY[heroClassId];
                showLongNotice(
                  `${def.sanctuaryEmblem ?? def.emblem} ${def.sanctuaryShortName ?? def.shortName}: ${COMPANION_RULES[heroClassId]}. Pick a companion when you start a new run.`
                );
              }
            : undefined
        }
        vibrationOn={vibrationOn}
        onToggleVibration={() => {
          const next = !vibrationOn;
          soundEngine.setHapticsEnabled(next);
          setVibrationOn(next);
          if (next) soundEngine.vibrate(20);
        }}
        reduceMotion={reduceMotion}
        onToggleReduceMotion={() => {
          const next = !reduceMotion;
          saveReduceMotion(next);
          applyReduceMotion(next);
          setReduceMotion(next);
        }}
        onOpenRunLeaderboard={RUN_ONLY ? () => setIsRunLeaderboardOpen(true) : undefined}
        flashRelics={flashRelics}
        relicSets={mode === "RUN" && !lesson && runRulesUseRelicSets(runLogRef.current?.v ?? RUN_LOG_VERSION)}
        onNewRun={
          RUN_ONLY
            ? () => {
                const inProgress = floorHistory.length > 0 && phase !== "DEFEAT" && !lesson;
                if (!inProgress || window.confirm("Start a new Garden Run? This one will end.")) requestNewRun();
              }
            : undefined
        }
        onEndRun={
          RUN_ONLY && !lesson && phase !== "DEFEAT"
            ? () => {
                if (window.confirm("End this Garden Run now? Your score so far will be kept.")) handleEndRunEarly();
              }
            : undefined
        }
        hideGoalLine={lesson !== null}
        onOpenPassModal={() => setIsPassModalOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />

      {showTutorial ? (
        <div className="my-2 flex-1">
          <TutorialView
            onStartPlaying={handleSkipTutorial}
            onLaunchInteractiveTutorial={() => loadTutorialStage(0)}
            onLaunchGuidedPractice={() => {
              setShowTutorial(false);
              handleSwitchMode("SANDBOX");
            }}
          />
        </div>
      ) : (
        <>
          {/* First-visit coach on the real Daily */}
          {!isInteractiveTutorial && coachStep !== null && (
            <div className="w-full max-w-[430px] min-w-0 rounded-xl px-3 py-2 bg-[#223629]/95 border border-amber-300/40 flex items-start gap-2.5 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
              <span className="text-lg leading-none mt-0.5">
                {coachStep === 0 ? "🐱" : coachStep === 1 ? "✨" : "⭐"}
              </span>
              <p className="flex-1 min-w-0 text-xs font-sans leading-snug text-amber-50">
                {coachStep === 0 &&
                  "Drag one continuous line from your Companion 🐱 to the glowing 🌈 Exit."}
                {coachStep === 1 &&
                  "The numbers show exactly what will happen before you let go. Thorns 🌺 cost Life; Gloves 🧤 and Shears tiles ✂️ protect you. Release on the Exit to walk it."}
                {coachStep === 2 &&
                  "Lovely! Earn ★ for reaching the Exit, gathering 80% of the 🌰, and keeping your Life high. Match par for a ✦ Perfect garden."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCoachStep(null);
                  try {
                    window.localStorage.setItem(COACH_STORAGE_KEY, "done");
                  } catch {
                    // Ignore storage errors
                  }
                }}
                className="shrink-0 text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-100"
              >
                {coachStep === 2 ? "Got it" : "Skip"}
              </button>
            </div>
          )}

          {/* 7-Step Tutorial Coach Card (Only shown during interactive tutorial) */}
          {isInteractiveTutorial && (
            <div className="w-full max-w-[430px] min-w-0">
              <TutorialCoach
                currentStage={activeTutorialStage}
                stageIndex={tutorialStageIndex}
                totalStages={TUTORIAL_STAGES.length}
                activeHeroClassId={activeClassForBoard}
                isSanctuary={isSanctuary}
                onSelectStage={(idx) => loadTutorialStage(idx)}
                onSelectHeroClass={(clsId) =>
                  handleSelectHeroClass(clsId, false)
                }
                onPlayGame={handleSkipTutorial}
                onResetStep={() => {
                  setDrawnPath([]);
                  setRetractNotice(null);
                }}
                onOpenGuide={() => {
                  setIsInteractiveTutorial(false);
                  setShowTutorial(true);
                }}
              />
            </div>
          )}

          {/* Boss Garden twist (every 3rd garden) */}
          {!isInteractiveTutorial && !lesson && currentFloor.bossRuleId && (
            <div className="w-full max-w-[430px] mx-auto rounded-xl px-3 py-1.5 border border-rose-300/30 bg-rose-500/[0.07] text-rose-50 flex items-center gap-2">
              <span className="text-xl shrink-0">
                {BOSS_RULE_REGISTRY[currentFloor.bossRuleId].icon}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-rose-100 leading-snug">
                  {BOSS_RULE_REGISTRY[currentFloor.bossRuleId].description}
                </div>
                <div className="text-[11px] leading-snug text-rose-50/65">
                  Boss · {BOSS_RULE_REGISTRY[currentFloor.bossRuleId].name}
                  {(mode === "RUN" || currentFloorIndex < dungeon.floors.length - 1) &&
                    " · 👑 Legendary relic if cleared"}
                </div>
              </div>
            </div>
          )}

          {/* Run mode: Season, target, score, strokes and weed-outs */}
          {lesson && lessonIndex !== null && (
            <RunLessonCoach
              lesson={lesson}
              index={lessonIndex}
              total={RUN_LESSONS.length}
              status={
                drawnPath.length >= 2 && !lessonDemo
                  ? lesson.checkGoal(
                      simulation,
                      calculateFloorScoreBreakdown(simulation, lesson.hero, drawnPath.length, []),
                      lesson.hero
                    )
                  : null
              }
            />
          )}

          {mode === "RUN" && !isInteractiveTutorial && !lesson && runGarden && (
            phase === "DEFEAT" && runOver === null ? (
              <button
                type="button"
                onClick={() => requestNewRun()}
                className="w-full max-w-[430px] rounded-xl py-2 bg-emerald-300 text-slate-950 font-mono text-xs font-black"
              >
                Garden Run over — start a new one
              </button>
            ) : (
              <RunHudStrip
                garden={runGarden}
                previewScore={
                  simulation.canCommit && phase === "PLANNING"
                    ? calculateFloorScoreBreakdown(
                        simulation,
                        floorStartHero,
                        drawnPath.length,
                        activeRelicsForBoard,
                        relicScoreCtx
                      ).total
                    : null
                }
                noSafeLine={runNoSafeLine}
                weedOutActive={weedOutMode}
                weedOutCount={weedOutSelection.length}
                prunedCount={runBag.length > 0 ? Math.max(0, RUN_SEED_BAG_SIZE - runBag.length) : 0}
                disabled={phase !== "PLANNING"}
                onToggleWeedOut={handleToggleWeedOut}
                onConfirmWeedOut={handleConfirmWeedOut}
                soundOn={soundEnabled}
                onToggleSound={handleToggleSound}
                suggestSwap={swapSuggested}
                asc={runLogRef.current?.asc ?? 0}
              />
            )
          )}

          {/* Live Value × Length meter (Run and lessons) */}
          {mode === "RUN" &&
            !isInteractiveTutorial &&
            (lesson || (runGarden && !(phase === "DEFEAT" && runOver === null))) && (
              <div className="relative w-full max-w-[430px] min-w-0">
                <LineMeter
                  tiles={drawnPath.length}
                  chips={lineMeter.now.chips}
                  mult={lineMeter.now.mult}
                  xMult={lineMeter.now.xMult}
                  previousPoints={lineMeter.previousPoints}
                  lastTileValue={lineMeter.lastTileValue}
                  reachesArchway={simulation.canCommit}
                  wilts={!simulation.survives}
                  wiltReason={explainWilt(simulation)?.short ?? null}
                  magicNow={floorStartHero.hp}
                  magicAfter={simulation.survives ? simulation.finalStats.hp : 0}
                  tilesOnBoard={lineMeter.tilesOnBoard}
                  idleText={
                    lesson
                      ? "Your points show here as you draw."
                      : swapSuggested
                      ? "Tough board — even the best line falls short. Try 🌿 Swap to change up to 3 tiles."
                      : undefined
                  }
                  intro={
                    phase !== "PLANNING"
                      ? null
                      : tileIntroQueue.length > 0
                      ? {
                          icon: <EntityIcon type={tileIntroQueue[0]} size={30} />,
                          name: TILE_INTROS[tileIntroQueue[0]].name,
                          text: TILE_INTROS[tileIntroQueue[0]].text,
                          index: 0,
                          total: tileIntroQueue.length + (showStartGlovesIntro ? 1 : 0),
                          onNext: () => dismissTileIntro(tileIntroQueue[0]),
                        }
                      : showStartGlovesIntro
                      ? {
                          icon: <EntityIcon type="SHIELD" size={30} />,
                          label: "Good to know",
                          name: `Your Cat wears ${floorStartHero.shield} Gloves`,
                          text: `from the start. They block ${floorStartHero.shield} Thorn damage.`,
                          index: 0,
                          total: 1,
                          onNext: () => dismissTileIntro(START_GLOVES_INTRO),
                        }
                      : null
                  }
                  showShortLineTip={
                    !lesson &&
                    !longLineLearned &&
                    simulation.canCommit &&
                    drawnPath.length < SHORT_LINE_NUDGE_TILES
                  }
                />
              {/* Lines 1–3: the score lands here instead of a full screen */}
              <AnimatePresence>
                {lineToast && !lineCallout && (
                  <motion.div
                    key={lineToast.key}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="pointer-events-none absolute inset-0 z-30 rounded-xl border border-amber-300/50 bg-[#1F2922] px-3 flex items-center justify-between gap-2"
                    role="status"
                  >
                    <span className="text-[22px] font-mono font-black text-amber-200 leading-none">
                      +{lineToast.points.toLocaleString()}
                    </span>
                    <span className="text-right text-[11px] leading-tight text-white/75">
                      <span className="font-mono font-black text-white">
                        {lineToast.score.toLocaleString()} / {lineToast.target.toLocaleString()}
                      </span>
                      <br />
                      {Math.max(0, lineToast.target - lineToast.score).toLocaleString()} to go · {lineToast.strokesLeft}{" "}
                      {lineToast.strokesLeft === 1 ? "line" : "lines"} left
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* A long line gets a big callout over the meter, leaving the board visible */}
              <AnimatePresence>
                {lineCallout && (
                  <motion.div
                    key={lineCallout.key}
                    initial={{ scale: 0.4, opacity: 0, rotate: -2 }}
                    animate={{ scale: [0.4, 1.15, 1], opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, y: -24, scale: 0.9 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
                    aria-live="polite"
                  >
                    <div
                      className="w-full h-full rounded-xl px-4 flex flex-col items-center justify-center text-center shadow-[0_0_40px_rgba(0,0,0,0.5)] border-2 border-white/70"
                      style={{ backgroundColor: lineCallout.color }}
                    >
                      <div className="text-[24px] font-black leading-none text-slate-950">{lineCallout.name}!</div>
                      <div className="mt-0.5 text-[12px] font-mono font-black text-slate-900/80">
                        {lineCallout.tiles} tiles · {lineCallout.points.toLocaleString()} points
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            )}

          {/* Interactive 5x5 Path-Drawing Board: a square that fills the space
              left on screen (smaller on short phones, up to 430px) */}
          <div className="relative w-full max-w-[430px] min-h-[220px] max-h-[min(calc(100vw-1.5rem),430px)] grow-[1000] basis-0 !shrink flex items-center justify-center [container-type:size]">
          <div className="relative aspect-square w-[min(100cqw,100cqh)]">
            <GridCanvas
              grid={activeGrid}
              drawnPath={drawnPath}
              simulation={simulation}
              modifierId={activeModifierId}
              heroClassId={activeClassForBoard}
              isResolving={
                phase === "RESOLVING" ||
                phase === "FLOOR_CLEARED" ||
                phase === "SHOP" ||
                (mode === "RUN" && (weedOutMode || phase === "DEFEAT"))
              }
              activeResolutionStep={activeResolutionStep}
              hintCoords={hintCoords}
              pulseStartExit={!firstLineDone && drawnPath.length < 2 && phase === "PLANNING"}
              ghostGuidePath={
                lesson
                  ? showLessonGhost || lessonIndex === 0
                    ? lesson.solution
                    : undefined
                  : isInteractiveTutorial
                  ? activeTutorialStage.ghostGuidePath
                  : hintLine && phase === "PLANNING"
                  ? hintLine
                  : undefined
              }
              cosmetics={
                mode === "RUN" && lessonIndex === null
                  ? { ...cosmetics, companionId: CLASS_COMPANION[heroClassId] ?? "CAT" }
                  : cosmetics
              }
              onPathChange={(nextPath) => {
                // Keep a "why it pulled back" notice until the next line starts
                // (the one-time Thorn tip stays up while the line keeps growing)
                if (nextPath.length > 1) setRetractNotice((n) => (n === THORN_TIP ? n : null));
                // The small score card makes way for the meter once a new line starts
                if (nextPath.length > 1) setLineToast(null);
                setDrawnPath(nextPath);
                // Skipped the walkthrough: explain Thorns the first time the line reaches one
                const head = nextPath[nextPath.length - 1];
                if (mode === "RUN" && !lesson && head && activeGrid[head.row]?.[head.col]?.type === "ENEMY") {
                  try {
                    if (
                      window.localStorage.getItem(WALKTHROUGH_SKIPPED_KEY) &&
                      !window.localStorage.getItem(THORN_TIP_SEEN_KEY)
                    ) {
                      window.localStorage.setItem(THORN_TIP_SEEN_KEY, "1");
                      handleNotice(THORN_TIP);
                    }
                  } catch {
                    // Ignore storage errors
                  }
                }
              }}
              onCommitPath={handleCommitPath}
              onRetractNotice={handleNotice}
              onSkipPlayback={
                phase === "RESOLVING" && mode === "RUN" ? () => skipPlaybackRef.current?.() : undefined
              }
              liveScore={{
                points: Math.round(lineMeter.now.chips * lineMeter.now.mult * lineMeter.now.xMult),
                gain:
                  Math.round(lineMeter.now.chips * lineMeter.now.mult * lineMeter.now.xMult) -
                  lineMeter.previousPoints,
                wilts: !simulation.survives,
              }}
            />

            {mode === "RUN" && weedOutMode && (
              <RunWeedOutOverlay
                grid={activeGrid}
                selected={weedOutSelection}
                onToggle={handleToggleWeedOutTile}
              />
            )}

            {/* Floor Cleared Interstitial Overlay with Earned 3-Star Rating */}
            {phase === "FLOOR_CLEARED" && isInteractiveTutorial && (
              <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="bg-[#0A0C0B]/95 border-2 border-emerald-400 rounded-2xl px-6 py-4 text-center shadow-[0_0_40px_rgba(16,185,129,0.5)] animate-bounce">
                  <div className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-widest">
                    {isInteractiveTutorial
                      ? isSanctuary
                        ? `GARDEN LESSON ${activeTutorialStage.stageNumber}/${TUTORIAL_STAGES.length}`
                        : `TRAINING STAGE ${activeTutorialStage.stageNumber}/${TUTORIAL_STAGES.length}`
                      : isSanctuary
                      ? "GARDEN RESTORED 🌸"
                      : "SECTOR SECURED"}
                  </div>
                  <div className="text-lg font-sans font-extrabold text-white mt-0.5">
                    {isInteractiveTutorial
                      ? activeTutorialStage.stageNumber === TUTORIAL_STAGES.length
                        ? isSanctuary
                          ? "SANCTUARY READY! (+50 🌰)"
                          : "TRAINING COMPLETE! (+50 🪙)"
                        : `LESSON ${activeTutorialStage.stageNumber} CLEARED`
                      : isSanctuary
                      ? `GARDEN ${currentFloorIndex + 1} BLOOMED`
                      : `FLOOR ${currentFloorIndex + 1} CLEARED`}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 my-1 text-base">
                    {(() => {
                      // Show the committed floor's stars (the live preview can differ)
                      const shownStars =
                        (!isInteractiveTutorial &&
                          floorHistory[floorHistory.length - 1]?.stars) ||
                        simulation.stars;
                      return [
                        shownStars.star1Survivor,
                        shownStars.star2Greed,
                        shownStars.star3Flawless,
                      ];
                    })().map((earned, i) => (
                      <span
                        key={i}
                        className={
                          earned
                            ? "text-amber-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]"
                            : "text-zinc-600"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  {!isInteractiveTutorial &&
                    (() => {
                      const lastRecord = floorHistory[floorHistory.length - 1];
                      if (!lastRecord?.parScore) {
                        return (
                          <div className="text-[11px] font-mono text-indigo-300/70">
                            Finding today&apos;s par…
                          </div>
                        );
                      }
                      const pct = Math.round(
                        ((lastRecord.floorScore ?? 0) / lastRecord.parScore) * 100
                      );
                      return (
                        <div
                          className={`text-xs font-mono font-bold ${
                            pct >= 100 ? "text-amber-300" : "text-cyan-300"
                          }`}
                        >
                          {pct >= 100
                            ? `✦ Perfect garden · ${pct}% of par`
                            : `${pct}% of par`}
                        </div>
                      );
                    })()}
                  <div className="text-[11px] font-mono text-violet-300 mt-1">
                    {isInteractiveTutorial
                      ? activeTutorialStage.stageNumber === TUTORIAL_STAGES.length
                        ? isSanctuary
                          ? "Entering Daily Bloomline..."
                          : "Entering Daily Dungeon..."
                        : `Loading Lesson ${
                            activeTutorialStage.stageNumber + 1
                          }/${TUTORIAL_STAGES.length}...`
                      : mode === "DAILY"
                      ? "Today's Blessing is waiting for you..."
                      : "A Blessing is waiting for you..."}
                  </div>
                </div>
              </div>
            )}

            {phase === "RESOLVING" && mode === "RUN" && !lesson && (
              <div className="pointer-events-none absolute bottom-2 inset-x-0 z-40 flex justify-center">
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white/75">
                  Tap to skip ⏩
                </span>
              </div>
            )}


            {/* Run notices float over the board so nothing below it moves */}
            {RUN_ONLY && (retractNotice || (runNoSafeLine && !weedOutMode)) && (
              <div className="pointer-events-none absolute top-2 inset-x-2 z-40 flex justify-center">
                <div
                  role="status"
                  className={`max-w-full rounded-xl px-3 py-2 text-[12px] leading-snug font-sans font-bold text-center shadow-lg border ${
                    retractNotice
                      ? "bg-[#1F1A10]/95 border-amber-300/60 text-amber-50"
                      : "bg-[#2A1018]/95 border-rose-300/60 text-rose-50"
                  }`}
                >
                  {retractNotice ??
                    "🪨 No safe line on this board — tap 🌿 Swap to swap some tiles."}
                </div>
              </div>
            )}
            {lesson && lessonDemo && (lessonDemo === "card" ? (
              <div className="absolute inset-0 z-[60] flex items-center justify-center rounded-2xl bg-black/60 p-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-[320px] rounded-2xl border border-amber-300/40 bg-[#1B281F] p-4 text-center text-white"
                >
                  <div className="text-[12px] font-semibold text-amber-200">How to score big</div>
                  <div className="mt-1 flex items-end justify-center gap-4 font-mono font-black">
                    <span className="flex flex-col items-center">
                      <span className="text-[11px] font-sans font-semibold text-white/55">Short way</span>
                      <span className="text-[22px] text-white/70">{demoScores?.short.toLocaleString()}</span>
                    </span>
                    <span className="pb-1 text-[13px] text-white/40">vs</span>
                    <span className="flex flex-col items-center">
                      <span className="text-[11px] font-sans font-semibold text-white/55">Long way</span>
                      <span className="text-[30px] text-amber-200">{demoScores?.long.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] leading-snug text-white/85">
                    Points = <b>Value × Length</b>. Longer lines through good tiles multiply your points.
                  </div>
                  <button
                    type="button"
                    onClick={() => endLessonDemo("done")}
                    className="mt-3 w-full rounded-xl bg-teal-300 py-2.5 text-[14px] font-bold text-slate-950 active:scale-95"
                  >
                    Your turn →
                  </button>
                </motion.div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => endLessonDemo("skip")}
                aria-label="Skip the demo"
                className="absolute inset-0 z-[60] flex items-start justify-between rounded-2xl p-2 text-left"
              >
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-semibold text-amber-100">
                  ▶ Demo · {lessonDemo === "short" ? "the short way" : "the long way"}
                </span>
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-semibold text-white/80">
                  Skip ›
                </span>
              </button>
            ))}
          </div>
          </div>

          {lesson && lesson.id === DEMO_LESSON_ID && !lessonDemo && phase === "PLANNING" && (
            <button
              type="button"
              onClick={() => {
                track("demo_replay");
                playLessonDemo(lesson);
              }}
              className="text-[12px] font-semibold text-amber-200/90 underline underline-offset-2"
            >
              ▶ Watch the 10-second demo again
            </button>
          )}

          {/* Bottom Legend & Controls */}
          {lesson && lessonIndex !== null ? (
            <RunLessonControls
              showingSolution={showLessonGhost}
              disabled={phase !== "PLANNING"}
              onClear={() => {
                setDrawnPath([]);
                setRetractNotice(null);
              }}
              onShowMe={() => {
                setDrawnPath([]);
                setShowLessonGhost((v) => !v);
              }}
              onRestart={() => startLesson(lessonIndex, false)}
              onLeave={() => {
                track("walkthrough_skip", { step: (lessonIndex ?? 0) + 1 });
                try {
                  window.localStorage.setItem(WALKTHROUGH_SKIPPED_KEY, "1");
                } catch {
                  // Ignore storage errors
                }
                startRun();
              }}
            />
          ) : (
          <BottomControls
            mode={mode}
            visualTheme={visualTheme}
            isResolving={
              phase === "RESOLVING" ||
              phase === "FLOOR_CLEARED" ||
              phase === "SHOP"
            }
            hintsRemaining={hintsRemaining}
            onRequestHint={handleRequestHint}
            onResetFloorStroke={() => {
              setDrawnPath([]);
              setRetractNotice(null);
            }}
            onRestartRun={() => {
              if (mode === "RUN" && !isInteractiveTutorial) {
                startRun();
              } else if (isInteractiveTutorial) {
                loadTutorialStage(tutorialStageIndex);
              } else if (isOfficialDailyRun && floorHistory.length > 0) {
                handleNotice(
                  "Today's official visit can't be restarted — finish it, then replay as practice as often as you like."
                );
              } else {
                resetRunWithDungeon(dungeon, mode);
              }
            }}
            onNewSandboxDungeon={handleNewSandboxDungeon}
            onForfeitRun={() => {
              if (mode === "RUN" && !isInteractiveTutorial) {
                if (phase !== "DEFEAT") handleEndRunEarly();
              } else if (isInteractiveTutorial) {
                handleSkipTutorial();
              } else if (isOfficialDailyRun) {
                setIsFinishConfirmOpen(true);
              } else {
                handleEndVisit();
              }
            }}
          />
          )}

          {practiceStep && !isPracticeOverlayStep(practiceStep) && !isGuideOpen && !helpMenu && !isRunLeaderboardOpen && (
            <PracticeCoach
              step={practiceStep}
              collapsed={practiceCollapsed}
              onToggleCollapsed={() => setPracticeCollapsed((v) => !v)}
              onButton={() => {
                if (practiceStep === "intro") setPracticeStep("draw");
              }}
              onQuit={() => startRun()}
            />
          )}

          {/* Long-term progress: the Sanctuary mosaic (not in the Run-only game) */}
          {!RUN_ONLY && !isInteractiveTutorial && (
            <div className="w-full max-w-[430px] min-w-0">
              <SanctuaryProgressBar
                totalGems={totalSanctuaryGems}
                companionId={cosmetics.companionId ?? "CAT"}
                onOpenSanctuaryModal={() => setIsSanctuaryModalOpen(true)}
                onSelectCompanion={(companionId) =>
                  handleSelectCosmetics({ ...cosmetics, companionId })
                }
              />
            </div>
          )}
        </>
      )}

      <div aria-hidden="true" className="grow basis-0 !shrink min-h-0" />

      {/* End-visit confirmation for the official Daily */}
      {isFinishConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] bg-[#1A261E] border border-amber-300/40 rounded-2xl p-4 space-y-3 text-white">
            <h2 className="text-base font-sans font-extrabold">End today&apos;s visit?</h2>
            <p className="text-xs font-sans text-indigo-100/85 leading-snug">
              Your official score for today will be the{" "}
              {floorHistory.length === 0
                ? "gardens you've restored so far (none yet)"
                : `${floorHistory.length} garden${floorHistory.length === 1 ? "" : "s"} you've restored`}
              . Afterwards you can replay today&apos;s Daily as practice as often as you like.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsFinishConfirmOpen(false)}
                className="py-2 rounded-xl bg-white text-slate-950 font-mono text-xs font-black"
              >
                KEEP PLAYING
              </button>
              <button
                type="button"
                onClick={handleEndVisit}
                className="py-2 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs font-bold"
              >
                END VISIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Between-Floor Relic Draft Modal ("Choose 1 of 3 Tactical Relics") */}
      <ShopModal
        key={`shop-${currentFloorIndex}`}
        isOpen={phase === "SHOP"}
        showIntro={shopIntroVisible}
        scorePreview={shopScorePreview}
        gems={(pendingPostFloorStats ?? hero).gold}
        offers={shopOffers}
        soldIds={shopSoldIds}
        ownedRelics={activeRelics}
        relicSets={mode === "RUN" && runRulesUseRelicSets(runLogRef.current?.v ?? RUN_LOG_VERSION)}
        relicCounters={relicCounters}
        onSell={mode === "RUN" ? handleSellRelic : undefined}
        bag={canPrune ? runBag : undefined}
        pruned={shopPruned}
        onPrune={canPrune ? handlePruneTile : undefined}
        upgrades={runUpgrades}
        rerollCost={rerollCost}
        clearedFloorNumber={currentFloorIndex + 1}
        totalFloors={dungeon.floors.length}
        headerLabel={
          mode === "RUN" ? `${getRunGardenLabel(currentFloorIndex)} cleared` : undefined
        }
        nextFloorTitle={
          mode === "RUN"
            ? (() => {
                const next = getRunGardenPosition(currentFloorIndex + 1);
                return `${getRunGardenLabel(currentFloorIndex + 1)} · target ${getRunGardenTarget(
                  next.season,
                  next.kind
                ).toLocaleString()}`;
              })()
            : dungeon.floors[currentFloorIndex + 1]
            ? isSanctuary
              ? `Garden ${currentFloorIndex + 2} of ${dungeon.floors.length}`
              : dungeon.floors[currentFloorIndex + 1].title
            : undefined
        }
        nextBossRuleId={dungeon.floors[currentFloorIndex + 1]?.bossRuleId}
        legendaryAward={legendaryAward}
        hasPurchased={shopPurchases > 0}
        isSanctuary={isSanctuary}
        onBuy={handleBuyShopOffer}
        onReroll={handleRerollShop}
        onLeave={handleLeaveShop}
      />

      {/* Value × Length garden tally */}
      <ScoreTally
        isOpen={tally !== null}
        breakdown={tally?.breakdown ?? null}
        stars={tally?.runStroke ? null : tally?.stars ?? null}
        floorLabel={tally?.floorLabel ?? ""}
        runTotalBefore={tally?.runTotalBefore ?? 0}
        defeatedBossRuleId={tally?.bossRuleId}
        legendaryAward={tally && !tally.isFinal ? legendaryAward : null}
        parPercent={tally?.parPercent ?? null}
        isFinalFloor={tally?.isFinal ?? false}
        clearReward={tally?.clearReward ?? 0}
        quick={Boolean(tally?.runStroke)}
        scoreLabel={tally?.runStroke ? "Line score" : undefined}
        runningTotalLabel={tally?.runStroke ? "Garden" : undefined}
        targetScore={tally?.runStroke?.target}
        continueLabel={tally?.runStroke?.continueLabel}
        halfLineNote={tally?.runStroke?.halfLineNote ?? null}
        extra={
          tally?.runStroke?.compare &&
          (tally.runStroke.compare.bestScore === null ||
            tally.runStroke.compare.bestScore > tally.runStroke.compare.yourScore) ? (
            <LineCompare
              grid={tally.runStroke.compare.grid}
              yourPath={tally.runStroke.compare.yourPath}
              yourScore={tally.runStroke.compare.yourScore}
              bestPath={tally.runStroke.compare.bestPath}
              bestScore={tally.runStroke.compare.bestScore}
              yourMagicCost={tally.runStroke.compare.yourMagicCost}
              bestMagicCost={tally.runStroke.compare.bestMagicCost}
            />
          ) : undefined
        }
        onContinue={handleTallyContinue}
      />

      <RunHelpMenu
        isOpen={helpMenu !== null}
        isFirstVisit={helpMenu === "welcome"}
        lessonsProgress={lessonsProgress}
        totalLessons={RUN_LESSONS.length}
        onLessons={() => {
          markWelcomeSeen();
          setHelpMenu(null);
          startLesson(0);
        }}
        onResumeLessons={() => {
          markWelcomeSeen();
          setHelpMenu(null);
          startLesson(Math.min(lessonsProgress, RUN_LESSONS.length - 1));
        }}
        onGuide={() => {
          markWelcomeSeen();
          setHelpMenu(null);
          setIsGuideOpen(true);
        }}
        onClose={() => {
          markWelcomeSeen();
          setHelpMenu(null);
        }}
      />

      <RunLessonResult
        info={lessonResult}
        onRetry={() => lessonIndex !== null && startLesson(lessonIndex, false)}
        onNext={() => {
          if (lessonIndex === null) return;
          if (lessonIndex >= RUN_LESSONS.length - 1) {
            startRun(undefined, undefined, { practice: true });
          } else {
            startLesson(lessonIndex + 1);
          }
        }}
      />

      {practiceStep && isPracticeOverlayStep(practiceStep) && !isGuideOpen && !helpMenu && !isRunLeaderboardOpen && (
        <PracticeCoach
          step={practiceStep}
          collapsed={practiceCollapsed && practiceStep !== "done"}
          onToggleCollapsed={() => setPracticeCollapsed((v) => !v)}
          onButton={() => {
            if (practiceStep === "done") startRun();
          }}
          onQuit={() => startRun()}
        />
      )}

      <RunGuide
        isOpen={isGuideOpen}
        onClose={() => {
          setIsGuideOpen(false);
          try {
            window.localStorage.setItem(RUN_GUIDE_STORAGE_KEY, "1");
          } catch {
            // Storage unavailable: the guide will show again next launch
          }
        }}
      />

      {/* Run mode: garden-clear payout and the end-of-run summary */}
      <RunGardenClearModal info={runClear} onContinue={handleRunClearContinue} />
      <AscensionPicker
        isOpen={ascPickerOpen}
        unlocked={ascPickerOpen ? loadUnlockedAscension() : 0}
        initial={runAscensionRef.current}
        companions={ascPickerOpen ? unlockedRunCompanions() : ["KNIGHT"]}
        initialCompanion={runCompanionRef.current}
        onStart={(level, companion) => {
          setAscPickerOpen(false);
          saveChosenAscension(level);
          saveChosenCompanion(companion);
          runAscensionRef.current = level;
          runCompanionRef.current = companion;
          setRunOver(null);
          startRun(companion, false, { asc: level });
        }}
        onClose={() => setAscPickerOpen(false)}
      />
      <LooksModal
        isOpen={looksOpen}
        cosmetics={cosmetics}
        onSelect={handleSelectCosmetics}
        onClose={() => setLooksOpen(false)}
      />
      <RunLeaderboardModal
        isOpen={isRunLeaderboardOpen}
        refreshKey={leaderboardRefreshKey}
        onClose={() => setIsRunLeaderboardOpen(false)}
      />

      <RunOverModal
        info={runOver}
        rankLine={practiceStep ? null : runRankLine}
        onOpenLeaderboard={practiceStep ? undefined : () => setIsRunLeaderboardOpen(true)}
        newRunLabel={practiceStep ? "Try the practice again" : undefined}
        onNewRun={() =>
          practiceStep ? startRun(undefined, undefined, { practice: true }) : requestNewRun()
        }
        onClose={() => setRunOver(null)}
      />

      {/* Victory / Defeat Summary + Wordle Share Card Modal */}
      <RunSummaryModal
        isOpen={isSummaryModalOpen}
        survived={phase === "VICTORY"}
        dungeon={dungeon}
        hero={hero}
        heroClassId={heroClassId}
        activeRelics={activeRelics}
        totalCellsVisited={totalCellsVisited}
        finalScore={finalScore}
        floorHistory={floorHistory}
        leaderboard={leaderboard}
        totalGems={totalSanctuaryGems}
        companionId={cosmetics.companionId ?? "CAT"}
        isSanctuary={isSanctuary}
        isDaily={mode === "DAILY"}
        isOfficial={lastRunWasOfficial}
        playerStats={playerStats}
        onOpenSanctuaryGallery={() => setIsSanctuaryModalOpen(true)}
        onClose={() => setIsSummaryModalOpen(false)}
        onRetryRun={() =>
          mode === "DAILY" ? startDaily() : resetRunWithDungeon(dungeon, mode)
        }
        onNewSandbox={handleNewSandboxDungeon}
        onOpenCrafter={() => {
          setIsSummaryModalOpen(false);
          setIsPassModalOpen(true);
        }}
        onSubmitScore={handleSubmitLeaderboardScore}
      />

      {/* Daily Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        dateKey={dungeon.dateKey}
        entries={leaderboard}
        isSanctuary={isSanctuary}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      {/* Crystal Sanctuary Gem Art Gallery & Companion Selector Modal */}
      <SanctuaryModal
        isOpen={!RUN_ONLY && isSanctuaryModalOpen}
        totalGems={totalSanctuaryGems}
        selectedCompanionId={cosmetics.companionId ?? "CAT"}
        onSelectCompanion={(companionId) =>
          handleSelectCosmetics({
            ...cosmetics,
            companionId,
          })
        }
        onClose={() => setIsSanctuaryModalOpen(false)}
      />

      {/* $3.99 Tactician Full Expansion, Daily Archive Vault & AI Crafter Modal */}
      <PassAndCrafterModal
        isOpen={isPassModalOpen}
        monetization={monetization}
        playerStats={playerStats}
        totalBankedGold={playerStats.totalBankedGold || 0}
        heroClassId={heroClassId}
        cosmetics={cosmetics}
        isGeneratingAi={isGeneratingAi}
        onClose={() => {
          setIsPassModalOpen(false);
          setStoreMessage(null);
        }}
        onSelectHeroClass={handleSelectHeroClass}
        onSelectCosmetics={handleSelectCosmetics}
        isSanctuary={isSanctuary}
        storeMessage={storeMessage}
        isCheckoutPending={isCheckoutPending}
        onUnlockExpansion={handleUnlockExpansion}
        onSendRestoreLink={handleSendRestoreLink}
        onToggleDevSimulate={handleToggleDevSimulate}
        onLaunchGauntlet={() =>
          RUN_ONLY ? setStoreMessage(RUN_ONLY_NOTICE) : handleSwitchMode("GAUNTLET")
        }
        onLaunchArchiveDate={(dateKey) =>
          RUN_ONLY ? setStoreMessage(RUN_ONLY_NOTICE) : handleLaunchArchiveDate(dateKey)
        }
        onCraftCustomDungeon={(prompt, modifier) =>
          RUN_ONLY
            ? Promise.resolve(setStoreMessage(RUN_ONLY_NOTICE))
            : handleCraftCustomDungeon(prompt, modifier)
        }
      />
    </main>
    </MotionConfig>
  );
}
