"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cat, Crown, Sparkles, Compass } from "lucide-react";
import {
  CosmeticPreferences,
  EntityType,
  GridCell,
  GridCoord,
  HeroClassId,
  ModifierId,
  PathSimulationResult,
  PathStepSimulation,
} from "@/types/game";
import {
  countPathBlinks,
  countPathSelfCrosses,
  HERO_CLASS_REGISTRY,
  HERO_EMBLEMS,
  isBlinkJump,
  isSameCoord,
  isValidStep,
  TRAIL_SKINS,
  explainWilt,
} from "@/lib/engine";
import { soundEngine } from "@/lib/audio";
import { SANCTUARY_COMPANIONS } from "@/components/SanctuaryModal";
import { boardThemeStyle } from "@/lib/boardThemes";
import EntityIcon, { ENTITY_COLORS } from "@/components/EntityIcon";
import { getLineTier } from "@/lib/lineTiers";
import LineHeadFeedback, { LiveLineScore, StepEffectPop } from "@/components/LineHeadFeedback";

interface GridCanvasProps {
  grid: GridCell[][];
  drawnPath: GridCoord[];
  simulation: PathSimulationResult;
  modifierId: ModifierId;
  heroClassId?: HeroClassId;
  isResolving: boolean;
  activeResolutionStep: number | null;
  hintCoords?: GridCoord[];
  ghostGuidePath?: GridCoord[];
  cosmetics?: CosmeticPreferences;
  onPathChange: (newPath: GridCoord[]) => void;
  onCommitPath: (committedPath: GridCoord[]) => void;
  onRetractNotice?: (reason: string) => void;
  /** First-time players: home and the Exit pulse until the first line */
  pulseStartExit?: boolean;
  /** Score of the line being drawn, shown beside its head */
  liveScore?: LiveLineScore | null;
  /** While a line replays: a tap on the board skips to its end */
  onSkipPlayback?: () => void;
}

export default function GridCanvas({
  grid,
  drawnPath,
  simulation,
  modifierId,
  heroClassId = "KNIGHT",
  isResolving,
  activeResolutionStep,
  hintCoords = [],
  ghostGuidePath = [],
  cosmetics,
  onPathChange,
  onCommitPath,
  onRetractNotice,
  pulseStartExit = false,
  liveScore = null,
  onSkipPlayback,
}: GridCanvasProps) {
  // After a line pulls back because it would run out of Life, the tile that
  // would have ended it stays marked for a moment
  const [lastDeathCoord, setLastDeathCoord] = useState<GridCoord | null>(null);
  useEffect(() => {
    if (!lastDeathCoord) return;
    const id = window.setTimeout(() => setLastDeathCoord(null), 2600);
    return () => window.clearTimeout(id);
  }, [lastDeathCoord]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [retractingPath, setRetractingPath] = useState<GridCoord[] | null>(
    null
  );
  const [inspectedCoord, setInspectedCoord] = useState<GridCoord | null>(null);

  const isSanctuary = (cosmetics?.visualTheme ?? "SANCTUARY") === "SANCTUARY";
  const companionDef =
    SANCTUARY_COMPANIONS[cosmetics?.companionId ?? "CAT"] ??
    SANCTUARY_COMPANIONS.CAT;

  const heroClassDef =
    HERO_CLASS_REGISTRY[heroClassId] ?? HERO_CLASS_REGISTRY.KNIGHT;

  const activeEmblemSymbol = React.useMemo(() => {
    if (isSanctuary) {
      // A chosen companion also rides the line while it replays
      return cosmetics?.companionId && cosmetics.companionId !== "CAT"
        ? companionDef.icon
        : heroClassDef.emblem;
    }
    if (heroClassId !== "KNIGHT") {
      return heroClassDef.emblem;
    }
    const found =
      HERO_EMBLEMS.find((e) => e.id === cosmetics?.emblemId) ?? HERO_EMBLEMS[0];
    return found.symbol;
  }, [
    isSanctuary,
    heroClassId,
    heroClassDef.emblem,
    cosmetics?.emblemId,
    companionDef.icon,
    cosmetics?.companionId,
  ]);

  const activeTrail = React.useMemo(() => {
    return (
      TRAIL_SKINS.find((t) => t.id === cosmetics?.trailId) ?? TRAIL_SKINS[0]
    );
  }, [cosmetics?.trailId]);

  // Locate HERO cell
  const heroStartCoord = React.useMemo(() => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r]?.[c]?.type === "HERO") {
          return { row: r, col: c };
        }
      }
    }
    return { row: 4, col: 2 };
  }, [grid]);

  // Map (row, col) -> primary simulation step, plus track Rogue 2nd-pass self-cross steps
  const { stepMap, crossStepMap } = React.useMemo(() => {
    const primary = new Map<string, PathStepSimulation>();
    const cross = new Map<string, PathStepSimulation>();
    for (const step of simulation.steps) {
      const key = `${step.coord.row},${step.coord.col}`;
      if (step.isShadowStepCross && primary.has(key)) {
        cross.set(key, step);
      } else {
        primary.set(key, step);
      }
    }
    return { stepMap: primary, crossStepMap: cross };
  }, [simulation.steps]);

  // Map (row, col) -> 1-based hint index (1..4)
  const hintMap = React.useMemo(() => {
    const map = new Map<string, number>();
    hintCoords.forEach((pt, idx) => {
      map.set(`${pt.row},${pt.col}`, idx + 1);
    });
    return map;
  }, [hintCoords]);

  // Set of coordinates on the tutorial ghostGuidePath
  const guideSet = React.useMemo(() => {
    const s = new Set<string>();
    for (const pt of ghostGuidePath) {
      s.add(`${pt.row},${pt.col}`);
    }
    return s;
  }, [ghostGuidePath]);

  // Check if current resolution step is a heavy enemy strike (value >= 5) or portal burst
  const activeStepData =
    isResolving && activeResolutionStep !== null
      ? simulation.steps[activeResolutionStep]
      : null;
  const shouldShakeHeavyHit = Boolean(
    activeStepData &&
      activeStepData.cell.type === "ENEMY" &&
      activeStepData.cell.value >= 5
  );
  const isPortalBurstActive = Boolean(
    activeStepData && activeStepData.cell.type === "EXIT"
  );

  /**
   * Converts client pointer coordinates to a 5x5 cell coordinate.
   * When `useDiagonalSafeRadius` is true (during move), requires the pointer to be within
   * 43% of the cell's center so diagonal drags never accidentally clip orthogonal corners.
   */
  const getCellFromClientXY = useCallback(
    (
      clientX: number,
      clientY: number,
      useDiagonalSafeRadius: boolean
    ): {
      coord: GridCoord | null;
      normX: number;
      normY: number;
    } => {
      const el = boardRef.current;
      if (!el) return { coord: null, normX: 0, normY: 0 };
      const rect = el.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      const normX = Math.max(0, Math.min(500, (relX / rect.width) * 500));
      const normY = Math.max(0, Math.min(500, (relY / rect.height) * 500));

      if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
        return { coord: null, normX, normY };
      }

      const cellW = rect.width / 5;
      const cellH = rect.height / 5;
      const col = Math.floor(relX / cellW);
      const row = Math.floor(relY / cellH);

      if (row < 0 || row > 4 || col < 0 || col > 4) {
        return { coord: null, normX, normY };
      }

      if (useDiagonalSafeRadius) {
        const centerX = (col + 0.5) * cellW;
        const centerY = (row + 0.5) * cellH;
        const dist = Math.hypot(relX - centerX, relY - centerY);
        const maxRadius = Math.min(cellW, cellH) * 0.43;
        if (dist > maxRadius) {
          return { coord: null, normX, normY };
        }
      }

      return { coord: { row, col }, normX, normY };
    },
    []
  );

  /**
   * Adds `coord` to the end of the line when it is a legal next step (also the
   * Otter's self-cross and the Fox's hop). Shared by dragging and tapping.
   */
  const extendTo = useCallback(
    (coord: GridCoord): boolean => {
      if (drawnPath.length === 0) return false;
      if (grid[coord.row]?.[coord.col]?.type === "VOID") return false;
      const currentHead = drawnPath[drawnPath.length - 1];
      if (isSameCoord(coord, currentHead)) return false;
      const blinkAlreadyUsed = countPathBlinks(drawnPath) >= 1;
      const selfCrossAlreadyUsed = countPathSelfCrosses(drawnPath) >= 1;

      // Check self-intersection (cell already visited earlier in the path)
      const alreadyVisited = drawnPath.some((pt) => isSameCoord(pt, coord));
      if (alreadyVisited) {
        // Rogue Passive ("Shadow Step"): Allowed to cross/re-visit an already visited cell 1x per floor
        const targetType = grid[coord.row]?.[coord.col]?.type;
        if (
          heroClassId === "ROGUE" &&
          !selfCrossAlreadyUsed &&
          targetType !== "EXIT" &&
          isValidStep(currentHead, coord, modifierId, heroClassId, blinkAlreadyUsed)
        ) {
          const crossedPath = [...drawnPath, coord];
          onPathChange(crossedPath);
          soundEngine.playSwipeTick(crossedPath.length - 1, false);
          if (onRetractNotice) {
            onRetractNotice("⚔ Shadow Step: Self-cross used (1/1)");
          }
          return true;
        }
        return false;
      }

      // Validate adjacency (or Mage 2-Tile Teleport Jump) and ORTHOGONAL_ONLY modifier
      if (
        !isValidStep(
          currentHead,
          coord,
          modifierId,
          heroClassId,
          blinkAlreadyUsed
        )
      ) {
        if (
          modifierId === "ORTHOGONAL_ONLY" &&
          Math.abs(coord.row - currentHead.row) === 1 &&
          Math.abs(coord.col - currentHead.col) === 1 &&
          onRetractNotice
        ) {
          onRetractNotice("Rook's Lockdown: Diagonal steps disabled!");
        } else if (
          heroClassId === "MAGE" &&
          blinkAlreadyUsed &&
          isBlinkJump(currentHead, coord) &&
          onRetractNotice
        ) {
          onRetractNotice("✦ Astral Blink already used on this floor (1/1)!");
        }
        return false;
      }

      const nextPath = [...drawnPath, coord];
      onPathChange(nextPath);

      if (isBlinkJump(currentHead, coord)) {
        soundEngine.playHintReveal();
        if (onRetractNotice) {
          onRetractNotice("✦ Astral Blink: 2-Tile Warp activated!");
        }
        return true;
      }

      // Check if this new cell forms a consecutive GOLD combo
      const targetCell = grid[coord.row]?.[coord.col];
      if (
        targetCell?.type === "GOLD" &&
        simulation.firstDeathStepIndex === null
      ) {
        let goldStreak = 1;
        for (let idx = drawnPath.length - 1; idx >= 1; idx--) {
          const prevPt = drawnPath[idx];
          if (grid[prevPt.row]?.[prevPt.col]?.type === "GOLD") {
            goldStreak++;
          } else {
            break;
          }
        }
        if (goldStreak >= 2) {
          soundEngine.playGoldPickup(goldStreak);
          return true;
        }
      }

      soundEngine.playSwipeTick(
        nextPath.length - 1,
        simulation.firstDeathStepIndex !== null
      );
      return true;
    },
    [drawnPath, grid, heroClassId, modifierId, onPathChange, onRetractNotice, simulation.firstDeathStepIndex]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isResolving) {
        onSkipPlayback?.();
        return;
      }
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture errors on synthetic events
      }

      const { coord, normX, normY } = getCellFromClientXY(
        e.clientX,
        e.clientY,
        false
      );
      if (!coord) return;
      if (grid[coord.row]?.[coord.col]?.type === "VOID") return;

      setRetractingPath(null);
      setPointerPos({ x: normX, y: normY });

      // Drag and tap work together: start on the Companion (or keep going from
      // the line's end), tap the next tile to add it, tap the tile before the
      // end to step back, or tap an earlier tile to cut the line back to it.
      // Each of these also starts a drag, so a tap can turn into a swipe.
      const startHere = () => {
        setInspectedCoord(null);
        setIsDragging(true);
      };
      const inPath = drawnPath.findIndex((pt) => isSameCoord(pt, coord));
      if (isSameCoord(coord, heroStartCoord)) {
        startHere();
        onPathChange([heroStartCoord]);
        soundEngine.playSwipeTick(0, false);
      } else if (
        drawnPath.length > 0 &&
        isSameCoord(coord, drawnPath[drawnPath.length - 1])
      ) {
        startHere();
      } else if (drawnPath.length >= 2 && isSameCoord(coord, drawnPath[drawnPath.length - 2])) {
        startHere();
        onPathChange(drawnPath.slice(0, -1));
        soundEngine.playUndoTick();
      } else if (drawnPath.length > 0 && extendTo(coord)) {
        startHere();
      } else if (inPath > 0) {
        startHere();
        onPathChange(drawnPath.slice(0, inPath + 1));
        soundEngine.playUndoTick();
      } else if (
        isValidStep(heroStartCoord, coord, modifierId, heroClassId, false) &&
        drawnPath.length === 0
      ) {
        setInspectedCoord(null);
        setIsDragging(true);
        onPathChange([heroStartCoord, coord]);
        soundEngine.playSwipeTick(1, false);
      } else {
        // Tap-to-Inspect: Show floating Inspector Card for this tile!
        setInspectedCoord((prev) =>
          prev && isSameCoord(prev, coord) ? null : coord
        );
        soundEngine.playSwipeTick(0, false);
      }
    },
    [
      isResolving,
      getCellFromClientXY,
      grid,
      heroStartCoord,
      drawnPath,
      modifierId,
      heroClassId,
      onPathChange,
      onSkipPlayback,
      extendTo,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || isResolving) return;
      e.preventDefault();
      setInspectedCoord(null);

      const { coord, normX, normY } = getCellFromClientXY(
        e.clientX,
        e.clientY,
        true
      );
      setPointerPos({ x: normX, y: normY });

      if (!coord || drawnPath.length === 0) return;
      if (grid[coord.row]?.[coord.col]?.type === "VOID") return;

      const currentHead = drawnPath[drawnPath.length - 1];
      if (isSameCoord(coord, currentHead)) return;

      // Check if dragging back onto the immediately previous cell -> Undo last segment!
      if (
        drawnPath.length >= 2 &&
        isSameCoord(coord, drawnPath[drawnPath.length - 2])
      ) {
        const shortened = drawnPath.slice(0, -1);
        onPathChange(shortened);
        soundEngine.playUndoTick();
        return;
      }

      // Phase Mage Smart Vault:
      // When dragging a mouse/finger straight over an Enemy or Trap cell B from A to C (where B is the midpoint between A and C),
      // the pointer naturally passes through B's bounding box before entering C.
      // If Mage hasn't used Astral Blink yet and B is an Enemy or Trap, automatically vault A ==> C over B!
      if (heroClassId === "MAGE" && drawnPath.length >= 2) {
        const prevAnchor = drawnPath[drawnPath.length - 2];
        const pathBeforeHead = drawnPath.slice(0, -1);
        const blinkUsedBeforeHead = countPathBlinks(pathBeforeHead) >= 1;
        const alreadyVisitedBeforeHead = pathBeforeHead.some((pt) =>
          isSameCoord(pt, coord)
        );
        const isStraightTwoStepOverHead =
          prevAnchor.row + coord.row === 2 * currentHead.row &&
          prevAnchor.col + coord.col === 2 * currentHead.col &&
          isBlinkJump(prevAnchor, coord);
        const headCellType = grid[currentHead.row]?.[currentHead.col]?.type;

        if (
          !blinkUsedBeforeHead &&
          !alreadyVisitedBeforeHead &&
          isStraightTwoStepOverHead &&
          (headCellType === "ENEMY" || headCellType === "TRAP") &&
          isValidStep(prevAnchor, coord, modifierId, "MAGE", false)
        ) {
          const vaultedPath = [...pathBeforeHead, coord];
          onPathChange(vaultedPath);
          soundEngine.playHintReveal();
          if (onRetractNotice) {
            onRetractNotice("✦ Astral Blink: Teleported over threat!");
          }
          return;
        }
      }

      extendTo(coord);
    },
    [
      isDragging,
      isResolving,
      getCellFromClientXY,
      drawnPath,
      heroClassId,
      modifierId,
      onPathChange,
      onRetractNotice,
      grid,
      extendTo,
    ]
  );

  const finishStroke = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setPointerPos(null);

    if (drawnPath.length <= 1) {
      onPathChange([]);
      return;
    }

    // Check if the path ends on EXIT and Hero survives (Projected HP > 0)
    if (simulation.canCommit) {
      soundEngine.playCommitPath();
      onCommitPath(drawnPath);
      return;
    }

    // Not at the Exit yet: the line stays, so it can go on by tapping or dragging
    if (!simulation.endsOnExit) return;

    // At the Exit but it would cost all your Life: retract it so the player can rethink the route
    soundEngine.playRetractPath();
    if (onRetractNotice && !simulation.survives) {
      const why = explainWilt(simulation);
      if (simulation.firstDeathCoord) setLastDeathCoord({ ...simulation.firstDeathCoord });
      onRetractNotice(
        isSanctuary
          ? why?.long ?? "This line would run out of ❤️ Life — try a safer route."
          : "Lethal route! Projected HP drops to 0"
      );
    }

    setRetractingPath([...drawnPath]);
    onPathChange([]);
    window.setTimeout(() => {
      setRetractingPath(null);
    }, 280);
  }, [
    isDragging,
    drawnPath,
    simulation,
    isSanctuary,
    onCommitPath,
    onPathChange,
    onRetractNotice,
  ]);

  // Coordinate center in 500x500 SVG space
  const cellCenter = (coord: GridCoord) => ({
    x: coord.col * 100 + 50,
    y: coord.row * 100 + 50,
  });

  // Determine the Hero token's animated position
  const activeHeroCoord = React.useMemo(() => {
    if (
      isResolving &&
      activeResolutionStep !== null &&
      drawnPath[activeResolutionStep]
    ) {
      return drawnPath[activeResolutionStep];
    }
    return heroStartCoord;
  }, [isResolving, activeResolutionStep, drawnPath, heroStartCoord]);

  const pathToRender = retractingPath ?? drawnPath;
  // While drawing, the pops at the line head say what each tile did, so the
  // per-tile step numbers and badges stay hidden to keep the board calm
  const calmWhileDrawing =
    isSanctuary && ((isDragging && !isResolving) || (isResolving && activeResolutionStep !== null));
  const lineTier = getLineTier(pathToRender.length);

  const polylinePoints = pathToRender
    .map((pt) => {
      const { x, y } = cellCenter(pt);
      return `${x},${y}`;
    })
    .join(" ");

  const guideSvgPathD = React.useMemo(() => {
    if (ghostGuidePath.length < 2) return "";
    return ghostGuidePath
      .map((pt, idx) => {
        const { x, y } = cellCenter(pt);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [ghostGuidePath]);

  const showGhostGuide =
    ghostGuidePath.length >= 2 &&
    !isDragging &&
    drawnPath.length <= 1 &&
    !isResolving;

  return (
    <div
      className="board-cq relative w-full max-w-[430px] aspect-square mx-auto select-none touch-none"
      style={isSanctuary ? boardThemeStyle(cosmetics?.boardThemeId) : undefined}
    >
      {/* Outer Frame: Crystal Sanctuary Garden OR Swiss Cyberpunk Frame */}
      <div
        key={
          shouldShakeHeavyHit
            ? `board-shake-${activeResolutionStep}`
            : "board-steady"
        }
        ref={boardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        style={{ touchAction: "none" }}
        className={`relative w-full h-full rounded-2xl board-pad overflow-hidden cursor-crosshair select-none touch-none ${
          isSanctuary
            ? "bg-[var(--board-frame,#17231B)] border border-[color:var(--board-border,rgba(255,255,255,0.07))] shadow-[var(--board-glow,none)]"
            : "bg-gradient-to-b from-[#121B15]/95 via-[#0C120E] to-[#080B09] border border-indigo-500/25 shadow-2xl shadow-indigo-950/40"
        } ${shouldShakeHeavyHit ? "animate-shake" : ""}`}
      >
        {/* Floating Tap-to-Inspect Inspector Card */}
        <AnimatePresence>
          {inspectedCoord && !isDragging && !isResolving && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.16 }}
              className="absolute top-3 left-3 right-3 z-50 pointer-events-auto"
            >
              <InspectorCard
                cell={grid[inspectedCoord.row]?.[inspectedCoord.col]}
                heroClassId={heroClassId}
                modifierId={modifierId}
                isSanctuary
                onClose={() => setInspectedCoord(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5x5 Luminous Metallic / Crystal Garden Plates */}
        <div className="grid grid-cols-5 grid-rows-5 board-gap w-full h-full relative z-10">
          {grid.map((rowCells, r) =>
            rowCells.map((cell, c) => {
              // Locked/Inactive VOID tile for Floor 0 Interactive Tutorial
              if (cell.type === "VOID") {
                return (
                  <div
                    key={cell.id}
                    data-row={r}
                    data-col={c}
                    className={`rounded-xl pointer-events-none shadow-inner ${
                      isSanctuary
                        ? "bg-[#17241B] border border-indigo-900/30 opacity-25"
                        : "bg-[#090E0B] border border-indigo-950/30 opacity-20"
                    }`}
                  />
                );
              }

              const isInspected = Boolean(
                inspectedCoord &&
                  inspectedCoord.row === r &&
                  inspectedCoord.col === c
              );
              const stepSim = stepMap.get(`${r},${c}`);
              const crossSim = crossStepMap.get(`${r},${c}`);
              const hintStepNum = hintMap.get(`${r},${c}`);
              const isGuideCell = guideSet.has(`${r},${c}`);
              const isVisited = Boolean(stepSim);
              const isFirstDeathCell = Boolean(stepSim?.isFirstDeathStep);
              const isDeadAfter = Boolean(
                stepSim?.isDead && !stepSim?.isFirstDeathStep
              );
              const isResolvedInPlayback =
                isResolving &&
                activeResolutionStep !== null &&
                stepSim !== undefined &&
                stepSim.stepIndex <= activeResolutionStep;
              const isCurrentPlaybackCell =
                isResolving &&
                activeResolutionStep !== null &&
                (stepSim?.stepIndex === activeResolutionStep ||
                  crossSim?.stepIndex === activeResolutionStep);

              const isHeroCell = cell.type === "HERO";
              const isExitCell = cell.type === "EXIT";

              // Live Neutralized Enemy / Bloomed Thorn State: crossed while dragging & Projected HP > 0
              // A Thorn that cost Life wilts grey; only a cut or fully blocked one blooms
              const isThornHurt = Boolean(
                cell.type === "ENEMY" && stepSim && stepSim.hpAfter < stepSim.hpBefore
              );
              const isEnemyNeutralized = Boolean(
                cell.type === "ENEMY" &&
                  stepSim &&
                  !stepSim.isDead &&
                  !isThornHurt &&
                  simulation.projectedHp > 0
              );

              // Base Plate Styling (Crystal Sanctuary vs Cyber Tactician)
              let plateClass = isSanctuary
                ? "bg-gradient-to-b from-[var(--plate-top,#2F4837)] to-[var(--plate-bottom,#233629)] border-t border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_4px_10px_rgba(12,20,15,0.45)] hover:from-[var(--plate-top-hover,#385441)] hover:to-[var(--plate-bottom-hover,#294031)]"
                : "bg-gradient-to-b from-[#1D2821] to-[#141D17] border-t border-[#314337] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.4)] hover:from-[#243229] hover:to-[#18241C]";

              if (isInspected) {
                plateClass += isSanctuary
                  ? " ring-4 ring-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.9)] z-30"
                  : " ring-4 ring-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.9)] z-30";
              }

              if (isResolvedInPlayback && isSanctuary) {
                // Restored Blooming Tile in Crystal Sanctuary mode!
                plateClass = isCurrentPlaybackCell
                  ? "bg-gradient-to-br from-emerald-400/45 via-teal-400/35 to-amber-300/40 border-2 border-amber-200 shadow-[0_0_28px_rgba(52,211,153,0.7),inset_0_0_16px_rgba(254,240,138,0.45)] ring-2 ring-amber-200 z-20"
                  : "bg-gradient-to-br from-emerald-500/30 via-teal-500/25 to-amber-300/25 border border-emerald-300/75 shadow-[0_0_18px_rgba(52,211,153,0.35),inset_0_1px_4px_rgba(254,240,138,0.3)]";
              } else if (isFirstDeathCell) {
                plateClass = isSanctuary
                  ? "bg-gradient-to-b from-amber-900/65 to-[#213026] border-2 border-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.65)] ring-2 ring-amber-300/80"
                  : "bg-gradient-to-b from-[#3A1222] to-[#1F0913] border-2 border-[#F43F5E] shadow-[0_0_25px_rgba(244,63,94,0.75),inset_0_1px_3px_rgba(255,255,255,0.2)] ring-2 ring-[#F43F5E]";
              } else if (isCurrentPlaybackCell) {
                plateClass =
                  "bg-gradient-to-b from-[#294131] to-[#1D2D22] border-2 border-[#CFEA8F] shadow-[0_0_30px_rgba(207,234,143,0.85),inset_0_0_18px_rgba(255,255,255,0.35)] ring-2 ring-white z-20";
              } else if (hintStepNum !== undefined && !isVisited) {
                plateClass = isSanctuary
                  ? "bg-gradient-to-b from-amber-900/60 to-[#233629] border-2 border-dashed border-amber-300 ring-2 ring-amber-300/80 shadow-[0_0_24px_rgba(251,191,36,0.7)] animate-pulse"
                  : "bg-gradient-to-b from-amber-950/60 to-[#18241C] border-2 border-dashed border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_20px_rgba(250,204,21,0.65)] animate-pulse";
              } else if (isHeroCell && !isResolving) {
                plateClass = isSanctuary
                  ? "border-2 border-amber-300/90 bg-gradient-to-b from-amber-500/25 to-[#273B2E] shadow-[0_0_22px_rgba(251,191,36,0.35)]"
                  : "border-2 border-cyan-300/80 bg-gradient-to-b from-cyan-950/60 to-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.25)]";
              } else if (isExitCell) {
                plateClass = simulation.canCommit
                  ? "border-2 border-lime-200 bg-gradient-to-b from-amber-400/45 to-[#3A3A22] shadow-[0_0_28px_rgba(207,234,143,0.6),0_0_18px_rgba(251,191,36,0.4)]"
                  : "border-2 border-amber-200/70 bg-gradient-to-b from-amber-400/30 to-[#33321F] shadow-[0_0_20px_rgba(251,191,36,0.28)]";
              } else if (crossSim) {
                plateClass =
                  "bg-gradient-to-b from-emerald-950/70 to-[#18261D] border-2 border-emerald-400/80 shadow-[0_0_18px_rgba(16,185,129,0.45)]";
              } else if (isEnemyNeutralized) {
                plateClass = isSanctuary
                  ? "scale-105 bg-gradient-to-b from-emerald-800/60 via-teal-900/50 to-[#223428] border-2 border-emerald-300/80 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                  : "scale-105 bg-gradient-to-b from-[#13292A] to-[#142018] border border-emerald-400/65 shadow-[inset_0_1px_3px_rgba(16,185,129,0.3),0_0_16px_rgba(16,185,129,0.25)]";
              } else if (isVisited) {
                plateClass = isDeadAfter
                  ? isSanctuary
                    ? "bg-gradient-to-b from-amber-950/50 to-[#1D2B22] border-t border-amber-300/40"
                    : "bg-gradient-to-b from-[#28121E] to-[#160B12] border-t border-[#F43F5E]/40 shadow-[0_4px_10px_rgba(0,0,0,0.4)]"
                  : isSanctuary
                  ? "bg-gradient-to-b from-[#3D5C47] to-[#2B4132] border-t border-amber-300/70 shadow-[inset_0_1px_4px_rgba(254,240,138,0.3),0_0_16px_rgba(251,191,36,0.22)]"
                  : "bg-gradient-to-b from-[#283D2F] to-[#1B281F] border-t border-[#CFEA8F]/60 shadow-[inset_0_1px_3px_rgba(207,234,143,0.25),0_0_16px_rgba(207,234,143,0.22),0_4px_10px_rgba(0,0,0,0.45)]";
              } else if (isGuideCell && showGhostGuide) {
                plateClass =
                  "bg-gradient-to-b from-[#344E3D] to-[#223528] border border-amber-300/60 shadow-[0_0_16px_rgba(250,204,21,0.28)]";
              }

              if (isSanctuary) {
                plateClass = calmPlateClass({
                  pulse: pulseStartExit && (isHeroCell || isExitCell),
                  wasDeath:
                    Boolean(lastDeathCoord) &&
                    lastDeathCoord!.row === r &&
                    lastDeathCoord!.col === c &&
                    drawnPath.length < 2,
                  isInspected,
                  isResolved: isResolvedInPlayback,
                  isCurrentPlayback: isCurrentPlaybackCell,
                  isFirstDeath: isFirstDeathCell,
                  isDeadAfter,
                  isHint: hintStepNum !== undefined && !isVisited,
                  isHero: isHeroCell && !isResolving,
                  isExit: isExitCell,
                  exitReady: simulation.canCommit,
                  isVisited: isVisited || Boolean(crossSim),
                  isGuide: isGuideCell && showGhostGuide,
                });
              }

              return (
                <div
                  key={cell.id}
                  data-row={r}
                  data-col={c}
                  className={`relative rounded-xl transition-colors duration-150 flex items-center justify-center overflow-visible ${plateClass}`}
                >
                  {/* Harmful tiles (Thorn, Spike) carry faint diagonal stripes, so they
                      differ by pattern as well as colour (colour-blind friendly) */}
                  {isSanctuary && !stepSim && (cell.type === "ENEMY" || cell.type === "TRAP") && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 3px, transparent 3px 8px)",
                      }}
                    />
                  )}

                  {/* Restored Blooming Tile Sparkle Accents during Resolution */}
                  {isResolvedInPlayback && isSanctuary && (
                    <span className="absolute top-0.5 left-1 text-[9px] pointer-events-none select-none z-20">
                      🌸
                    </span>
                  )}

                  {/* Colorever Flying Gem / Blossom Particle toward Top Sanctuary Mosaic Bar */}
                  <AnimatePresence>
                    {isCurrentPlaybackCell &&
                      isSanctuary &&
                      (cell.type === "GOLD" || cell.type === "ENEMY") && (
                        <motion.div
                          key={`fly-gem-${cell.id}-${activeResolutionStep}`}
                          initial={{ opacity: 1, y: 0, scale: 0.9 }}
                          animate={{
                            opacity: [1, 1, 0],
                            y: -155,
                            scale: [1, 1.4, 0.85],
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.65, ease: "easeOut" }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
                        >
                          <span className="px-2 py-0.5 rounded-full bg-amber-300/95 text-slate-950 font-mono text-[10px] font-black shadow-[0_0_20px_rgba(251,191,36,0.95)] flex items-center gap-0.5">
                            {cell.type === "GOLD" ? "🌰" : "🌸"} +{cell.value || 1}
                          </span>
                        </motion.div>
                      )}
                  </AnimatePresence>

                  {/* Top-Right Pill Badges for HERO, EXIT, Scout Hint, and Step Sequence */}
                  {isHeroCell && !isResolving && !crossSim && (
                    <span
                      style={{
                        backgroundColor: isSanctuary
                          ? "#FDE047"
                          : heroClassDef.accentColor,
                      }}
                      className="tile-tag absolute top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-slate-950 font-mono font-black text-[9px] px-1.5 py-0.5 rounded shadow leading-none pointer-events-none z-20"
                    >
                      {isSanctuary ? "YOU" : heroClassDef.shortName.toUpperCase()}
                    </span>
                  )}

                  {isExitCell && !stepSim && (
                    <span
                      className={`tile-tag absolute top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono font-black text-[9px] px-1.5 py-0.5 rounded shadow leading-none pointer-events-none z-20 ${
                        isSanctuary
                          ? "bg-amber-200 text-slate-950"
                          : "bg-purple-500 text-white"
                      }`}
                    >
                      EXIT
                    </span>
                  )}

                  {hintStepNum !== undefined && !stepSim && !isHeroCell && (
                    <span className="absolute top-1 left-1 bg-amber-400 text-slate-950 font-mono font-black text-[9px] px-1 py-0.5 rounded shadow leading-none pointer-events-none z-20">
                      💡{hintCoords.length > 1 ? hintStepNum : ""}
                    </span>
                  )}

                  {stepSim && (stepSim.stepIndex > 0 || crossSim) && (!calmWhileDrawing || isFirstDeathCell) && (
                    <span
                      className={`tile-tag absolute top-1 right-1 whitespace-nowrap text-[9px] font-mono font-bold px-1.5 py-0.5 rounded leading-none pointer-events-none z-20 ${
                        isFirstDeathCell
                          ? isSanctuary
                            ? "bg-amber-300 text-slate-950 font-black shadow-[0_0_8px_#FDE047]"
                            : "bg-[#F43F5E] text-white shadow-[0_0_8px_#F43F5E]"
                          : crossSim
                          ? "bg-emerald-400 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.85)]"
                          : stepSim.isBlinkStep
                          ? "bg-purple-500 text-white shadow-[0_0_10px_#A855F7]"
                          : stepSim.shatteredShield
                          ? "bg-[#CFEA8F] text-slate-950"
                          : isExitCell
                          ? "bg-purple-500 text-white shadow"
                          : isEnemyNeutralized
                          ? "bg-emerald-300 text-slate-950 font-black shadow-[0_0_10px_rgba(52,211,153,0.85)]"
                          : "bg-[#0D140F]/90 border border-[#CFEA8F]/40 text-cyan-200"
                      }`}
                    >
                      {crossSim
                        ? `#${stepSim.stepIndex}·⚔#${crossSim.stepIndex}`
                        : stepSim.isBlinkStep
                        ? `✦#${stepSim.stepIndex}`
                        : isEnemyNeutralized
                        ? isSanctuary
                          ? "🌸"
                          : `✓ #${stepSim.stepIndex}`
                        : `#${stepSim.stepIndex}`}
                    </span>
                  )}

                  {/* Top-Left Consecutive Gold Combo Multiplier Pop Badge */}
                  {stepSim && stepSim.goldComboCount >= 2 && !retractingPath && !calmWhileDrawing && (
                    <motion.span
                      initial={{ scale: 0.5, y: 4, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      className="tile-tag absolute -top-2 left-1 whitespace-nowrap bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 font-mono font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white/70 shadow-[0_0_12px_rgba(250,204,21,0.95)] leading-none pointer-events-none z-30"
                    >
                      {isSanctuary
                        ? <>🌰<span className="tile-tag-long"> ACORN</span> x{stepSim.goldComboCount}</>
                        : `COMBO x${stepSim.goldComboCount}`}
                    </motion.span>
                  )}

                  {/* Portal Burst Particle Effect when reaching EXIT during Resolution */}
                  {isExitCell && isPortalBurstActive && (
                    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
                      <span className="absolute w-14 h-14 rounded-full border-2 border-emerald-300 shadow-[0_0_24px_#10B981] animate-portal-burst" />
                      <span className="absolute w-10 h-10 rounded-full border-2 border-purple-300 shadow-[0_0_24px_#A855F7] animate-portal-burst" />
                    </div>
                  )}

                  {/* Uniformly Scaled Geometric / Sanctuary Crystal Entity Node */}
                  <div
                    className={`w-full h-full flex items-center justify-center transition-transform duration-150 ${
                      isResolvedInPlayback &&
                      cell.type !== "EXIT" &&
                      cell.type !== "HERO"
                        ? isSanctuary
                          ? "scale-90 opacity-80"
                          : "scale-75 opacity-30"
                        : isVisited
                        ? "scale-105"
                        : "scale-100"
                    }`}
                  >
                    <CellGeometricNode
                      cell={cell}
                      modifierId={modifierId}
                      heroClassId={heroClassId}
                      heroSymbol={activeEmblemSymbol}
                      heroAccentColor={heroClassDef.accentColor}
                      companionEmoji={isSanctuary && cosmetics?.companionId && cosmetics.companionId !== "CAT" ? companionDef.icon : undefined}
                      isSanctuary={isSanctuary}
                      isEnemyNeutralized={isEnemyNeutralized}
                      isResolvedBloomed={isResolvedInPlayback && isSanctuary && !isThornHurt}
                      isThornWilted={isSanctuary && isThornHurt}
                      hideHero={isResolving && cell.type === "HERO"}
                      isPortalReady={isExitCell && simulation.canCommit}
                    />
                  </div>

                  {/* Drifting Combat Change-Indicators on Visited Cells */}
                  <AnimatePresence>
                    {stepSim && stepSim.stepIndex > 0 && !retractingPath && !calmWhileDrawing && (
                      <motion.div
                        initial={{ opacity: 0, y: 7, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.8 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="absolute -bottom-1.5 inset-x-0 flex justify-center pointer-events-none z-30 animate-float-drift"
                      >
                        <StepFloatingBadge
                          step={stepSim}
                          isSanctuary
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Replay: the same short pops as while drawing, one tile at a time */}
        {isSanctuary && isResolving && activeResolutionStep !== null && activeResolutionStep > 0 && simulation.steps[activeResolutionStep] && (
          <PlaybackPop step={simulation.steps[activeResolutionStep]} />
        )}

        {/* Walkthrough: a finger traces the line to draw */}
        {showGhostGuide && <GuideHand path={ghostGuidePath} />}

        <LineHeadFeedback
          path={drawnPath}
          simulation={simulation}
          live={liveScore}
          active={isDragging && !isResolving && !retractingPath}
        />

        {/* SVG Illuminated Energy Trail, Phase Mage Warp Line & Chevron Animations */}
        <svg
          viewBox="0 0 500 500"
          className="absolute inset-0 w-full h-full pointer-events-none z-20 board-pad"
        >
          <defs>
            <filter
              id="cyberTrailGlow"
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="7" result="blurWide" />
              <feGaussianBlur stdDeviation="3" result="blurMid" />
              <feMerge>
                <feMergeNode in="blurWide" />
                <feMergeNode in="blurMid" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <radialGradient id="movingHeroAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop
                offset="40%"
                stopColor={heroClassDef.accentColor}
                stopOpacity="0.7"
              />
              <stop offset="75%" stopColor="#3B82F6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Animated Ghost Hand / Hint Trail for Floor 0 Interactive Tutorial (smoothly fades out while dragging) */}
          {guideSvgPathD && (
            <g
              className={`transition-opacity duration-200 ${
                showGhostGuide ? "opacity-100" : "opacity-0"
              }`}
            >
              <path
                d={guideSvgPathD}
                fill="none"
                stroke="#FACC15"
                strokeOpacity="0.3"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#cyberTrailGlow)"
              />
              <path
                d={guideSvgPathD}
                fill="none"
                stroke="#FDE047"
                strokeOpacity="0.85"
                strokeWidth="3.5"
                strokeDasharray="10,10"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-energy-dash"
              />
              {showGhostGuide && (
                <g>
                  <circle
                    r="20"
                    fill="#FDE047"
                    fillOpacity="0.25"
                    stroke="#FDE047"
                    strokeWidth="2"
                    filter="url(#cyberTrailGlow)"
                  />
                  <circle
                    r="12"
                    fill="#FFFFFF"
                    fillOpacity="0.9"
                    filter="url(#cyberTrailGlow)"
                  />
                  <text
                    x="0"
                    y="4.5"
                    textAnchor="middle"
                    fontSize="13"
                    className="select-none pointer-events-none"
                  >
                    🐾
                  </text>
                  <animateMotion
                    dur="2.4s"
                    repeatCount="indefinite"
                    path={guideSvgPathD}
                  />
                </g>
              )}
            </g>
          )}

          {/* Stroke Layer 0: Line-tier halo — widens and changes colour as the line grows */}
          {pathToRender.length >= 2 &&
            !retractingPath &&
            simulation.firstDeathStepIndex === null &&
            lineTier.level > 0 && (
              <polyline
                fill="none"
                stroke={lineTier.color}
                strokeOpacity={0.22 + lineTier.level * 0.06}
                strokeWidth={8 + lineTier.level * 4}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
                style={{ transition: "stroke 300ms, stroke-width 300ms" }}
              />
            )}

          {/* Stroke Layer 1: Thick Blur Base */}
          {pathToRender.length >= 2 && (
            <polyline
              fill="none"
              className={
                retractingPath || simulation.firstDeathStepIndex !== null
                  ? "stroke-red-600/35 stroke-[8px] blur-sm"
                  : activeTrail.glowClass
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cyberTrailGlow)"
              points={polylinePoints}
            />
          )}

          {/* Stroke Layer 2: Primary Neon Trail */}
          {pathToRender.length >= 2 && (
            <polyline
              fill="none"
              stroke={
                retractingPath || simulation.firstDeathStepIndex !== null
                  ? "#F43F5E"
                  : activeTrail.primaryStroke
              }
              strokeWidth={4 + lineTier.level * 0.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cyberTrailGlow)"
              points={polylinePoints}
            />
          )}

          {/* Stroke Layer 3: Ultra-Bright White Core (#FFFFFF) */}
          {pathToRender.length >= 2 && (
            <polyline
              fill="none"
              className="stroke-[#FFFFFF] stroke-[1.5px]"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />
          )}

          {/* Stroke Layer 4: Animated Flowing Energy Dash Pattern */}
          {pathToRender.length >= 2 && !retractingPath && (
            <polyline
              fill="none"
              stroke={
                simulation.firstDeathStepIndex !== null
                  ? "#FDA4AF"
                  : activeTrail.dashStroke
              }
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8,8"
              className="animate-energy-dash"
              points={polylinePoints}
            />
          )}

          {/* Phase Mage Astral Blink: Glowing Dashed Purple Warp Line Overlay for 2-Tile Teleport Segments */}
          {pathToRender.map((pt, idx) => {
            if (idx === 0) return null;
            const prev = pathToRender[idx - 1];
            if (!isBlinkJump(prev, pt)) return null;
            const p1 = cellCenter(prev);
            const p2 = cellCenter(pt);
            return (
              <g key={`blink-warp-${idx}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#A855F7"
                  strokeWidth="12"
                  strokeOpacity="0.55"
                  strokeLinecap="round"
                  filter="url(#cyberTrailGlow)"
                />
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#E9D5FF"
                  strokeWidth="4.5"
                  strokeDasharray="10,7"
                  strokeLinecap="round"
                  className="animate-energy-dash"
                  filter="url(#cyberTrailGlow)"
                />
              </g>
            );
          })}

          {/* Live Elastic Energy Tether to Active Finger/Pointer */}
          {isDragging &&
            pointerPos &&
            drawnPath.length >= 1 &&
            !isResolving && (
              <g>
                <line
                  x1={cellCenter(drawnPath[drawnPath.length - 1]).x}
                  y1={cellCenter(drawnPath[drawnPath.length - 1]).y}
                  x2={pointerPos.x}
                  y2={pointerPos.y}
                  stroke={activeTrail.primaryStroke}
                  strokeOpacity="0.65"
                  strokeWidth="3"
                  strokeDasharray="8,8"
                  className="animate-energy-dash"
                  strokeLinecap="round"
                  filter="url(#cyberTrailGlow)"
                />
                <circle
                  cx={pointerPos.x}
                  cy={pointerPos.y}
                  r="7"
                  fill={activeTrail.primaryStroke}
                  fillOpacity="0.4"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
            )}

          {/* Flowing Directional Energy Chevrons along each segment */}
          {pathToRender.map((pt, idx) => {
            if (idx === 0) return null;
            const prev = pathToRender[idx - 1];
            const p1 = cellCenter(prev);
            const p2 = cellCenter(pt);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const angleDeg =
              (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
            const isSegmentLethal =
              simulation.firstDeathStepIndex !== null &&
              idx >= simulation.firstDeathStepIndex;
            const isSegmentBlink = isBlinkJump(prev, pt);

            if (isSegmentBlink) {
              return (
                <g
                  key={`chev-blink-${idx}`}
                  transform={`translate(${midX}, ${midY})`}
                >
                  <circle
                    r="11"
                    fill="#2E4736"
                    stroke="#C084FC"
                    strokeWidth="2"
                    filter="url(#cyberTrailGlow)"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    className="fill-white font-mono font-black text-[11px]"
                  >
                    ✦
                  </text>
                </g>
              );
            }

            return (
              <g
                key={`chev-${idx}`}
                transform={`translate(${midX}, ${midY}) rotate(${angleDeg})`}
              >
                <circle
                  r="8"
                  fill="#0C120E"
                  stroke={
                    isSegmentLethal ? "#F43F5E" : activeTrail.primaryStroke
                  }
                  strokeWidth="1.5"
                />
                <path
                  d="M -3 -3.5 L 2.5 0 L -3 3.5 M 0.5 -2.5 L 4.5 0 L 0.5 2.5"
                  fill="none"
                  stroke={isSegmentLethal ? "#FFE4E6" : "#FFFFFF"}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Supercharged Animated Hero Token during Auto-Battle Resolution */}
          {isResolving && (
            <g
              style={{
                transform: `translate(${cellCenter(activeHeroCoord).x}px, ${
                  cellCenter(activeHeroCoord).y
                }px)`,
                transition: "transform 165ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <circle r="42" fill="url(#movingHeroAura)" />
              <circle
                r="26"
                fill="none"
                stroke={heroClassDef.accentColor}
                strokeWidth="2.5"
                filter="url(#cyberTrailGlow)"
              />
              <circle
                r="18"
                fill="#FFFFFF"
                filter="url(#cyberTrailGlow)"
              />
              <text
                x="0"
                y="5"
                textAnchor="middle"
                className="fill-slate-950 font-mono font-black text-[14px]"
              >
                {activeEmblemSymbol}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

/**
 * Floating, drifting combat/garden change-indicator pill shown on visited nodes
 */
function StepFloatingBadge({
  step,
  isSanctuary = false,
}: {
  step: PathStepSimulation;
  isSanctuary?: boolean;
}) {
  if (step.isFirstDeathStep) {
    if (isSanctuary) {
      const needed = Math.max(1, 1 - step.hpAfter);
      return (
        <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-amber-300 text-slate-950 border border-white/60 shadow-[0_0_12px_rgba(251,191,36,0.95)] tracking-tight whitespace-nowrap">
          ❤️ Needs +{needed}
        </span>
      );
    }
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-[#F43F5E] text-white border border-white/40 shadow-[0_0_12px_rgba(244,63,94,0.95)] tracking-tighter uppercase whitespace-nowrap">
        💀 {step.hpDelta} HP
      </span>
    );
  }

  if (step.shatteredShield) {
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#CFEA8F] text-slate-950 shadow-[0_0_10px_rgba(207,234,143,0.8)] whitespace-nowrap">
        {isSanctuary ? <>🧤 0<span className="tile-tag-long"> GLOVES</span></> : "❄️ 0 SHD"}
      </span>
    );
  }

  if (step.trapDodgedDiagonally) {
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-300 text-slate-950 shadow-[0_0_10px_rgba(52,211,153,0.85)] whitespace-nowrap">
        {isSanctuary ? <>🌸<span className="tile-tag-long"> HOPPED!</span></> : "⚡ DODGED"}
      </span>
    );
  }

  if (step.spikedBootsTriggered) {
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.9)] whitespace-nowrap">
        🥾 +{step.weaponDelta} {isSanctuary ? "✂️" : "WPN"}
      </span>
    );
  }

  if (step.cell.type === "ENEMY") {
    const dmg = step.hpDelta;
    if (isSanctuary) {
      return (
        <span
          className={`tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold shadow-md whitespace-nowrap ${
            dmg < 0
              ? "bg-rose-400 text-slate-950 border border-white/40 shadow-[0_0_10px_rgba(251,113,133,0.75)]"
              : "bg-emerald-300 text-slate-950 shadow-[0_0_10px_rgba(52,211,153,0.85)]"
          }`}
        >
          {dmg < 0 ? `${dmg} ❤️` : dmg > 0 ? `+${dmg} ❤️` : <>🌸<span className="tile-tag-long"> ✓</span></>}
        </span>
      );
    }
    return (
      <span
        className={`tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold shadow-md whitespace-nowrap ${
          dmg < 0
            ? "bg-[#F43F5E] text-white border border-red-300/40 shadow-[0_0_10px_rgba(244,63,94,0.75)]"
            : dmg > 0
            ? "bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
            : "bg-[#CFEA8F] text-slate-950 shadow-[0_0_10px_rgba(207,234,143,0.75)]"
        }`}
      >
        {dmg < 0 ? `${dmg} HP` : dmg > 0 ? `+${dmg}🩸 HP` : "0 DMG"}
        {step.backstabApplied ? " 🗡️" : ""}
        {step.momentumTriggered ? " ⚡" : ""}
      </span>
    );
  }

  if (step.cell.type === "SHIELD") {
    if (step.vampireTransmuteWeapon && step.vampireTransmuteWeapon > 0) {
      return (
        <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.85)] whitespace-nowrap">
          🩸 +{step.vampireTransmuteWeapon} WPN
        </span>
      );
    }
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-sky-300 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.8)] whitespace-nowrap">
        +{step.shieldDelta} {isSanctuary ? "🧤" : "SHD"}
      </span>
    );
  }

  if (step.cell.type === "WEAPON") {
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-amber-300 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.85)] whitespace-nowrap">
        +{step.weaponDelta} {isSanctuary ? "✂️" : "WPN"}
      </span>
    );
  }

  if (step.cell.type === "POTION") {
    return (
      <span
        className={`tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold shadow-md whitespace-nowrap ${
          step.hpDelta < 0
            ? "bg-rose-400 text-slate-950 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
            : step.hpDelta === 0
            ? "bg-white/85 text-slate-900"
            : "bg-emerald-300 text-slate-950 shadow-[0_0_10px_rgba(52,211,153,0.85)]"
        }`}
      >
        {step.hpDelta < 0
          ? `${step.hpDelta} ${isSanctuary ? "❤️" : "HP"}`
          : step.hpDelta === 0
          ? isSanctuary
            ? "❤️ full"
            : "MAX HP"
          : `+${step.hpDelta} ${isSanctuary ? "🍓" : "HP"}`}
      </span>
    );
  }

  if (step.cell.type === "GOLD") {
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-[#FDE047] text-slate-950 shadow-[0_0_10px_rgba(250,204,21,0.85)] whitespace-nowrap">
        +{step.goldDelta} {isSanctuary ? "🌰" : "GLD"}
        {step.shieldDelta > 0 ? ` +${step.shieldDelta}🧤` : ""}
        {step.hpDelta > 0 ? ` +${step.hpDelta}❤️` : ""}
      </span>
    );
  }

  if (step.cell.type === "TRAP") {
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-rose-400 text-slate-950 shadow-[0_0_10px_rgba(251,113,133,0.8)] whitespace-nowrap">
        {step.hpDelta} {isSanctuary ? "❤️" : "HP"}
      </span>
    );
  }

  if (step.cell.type === "EXIT") {
    return (
      <span className="tile-tag px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-gradient-to-r from-amber-300 via-pink-300 to-violet-300 text-slate-950 border border-white/50 shadow-[0_0_12px_rgba(244,114,182,0.9)] whitespace-nowrap">
        {isSanctuary ? "🌈 EXIT ✓" : "EXIT ✓"}
      </span>
    );
  }

  return null;
}

/**
 * Calm tile surfaces for the Sanctuary board: flat, thin borders, and colour
 * only where it means something (your line, danger, home, the Exit).
 */
function calmPlateClass(t: {
  pulse?: boolean;
  wasDeath?: boolean;
  isInspected: boolean;
  isResolved: boolean;
  isCurrentPlayback: boolean;
  isFirstDeath: boolean;
  isDeadAfter: boolean;
  isHint: boolean;
  isHero: boolean;
  isExit: boolean;
  exitReady: boolean;
  isVisited: boolean;
  isGuide: boolean;
}): string {
  const ring =
    (t.isInspected ? " ring-2 ring-white/70 z-30" : "") +
    (t.pulse ? " ring-2 ring-amber-200/80 animate-pulse" : "");
  if (t.wasDeath) return "bg-rose-500/[0.22] border-2 border-rose-300 animate-shake" + ring;
  if (t.isCurrentPlayback) return "bg-white/[0.16] border-2 border-white/80 z-20" + ring;
  if (t.isResolved) return "bg-teal-300/[0.14] border border-teal-200/45" + ring;
  if (t.isFirstDeath) return "bg-rose-500/[0.18] border-2 border-rose-300 animate-shake" + ring;
  if (t.isDeadAfter) return "bg-rose-500/[0.06] border border-rose-300/25" + ring;
  if (t.isHint) return "bg-amber-300/[0.10] border-2 border-dashed border-amber-200/80" + ring;
  if (t.isHero) return "bg-amber-300/[0.10] border border-amber-200/60" + ring;
  if (t.isExit)
    return (
      (t.exitReady
        ? "bg-lime-300/[0.18] border-2 border-lime-200"
        : "bg-amber-300/[0.16] border border-amber-200/55") + ring
    );
  if (t.isVisited) return "bg-teal-300/[0.12] border border-teal-200/50" + ring;
  if (t.isGuide) return "bg-white/[0.07] border border-amber-200/40" + ring;
  return "bg-white/[0.045] border border-white/[0.06]" + ring;
}

/**
 * Uniform 100x100 ViewBox Geometric / Crystal Sanctuary Entities with Strict 62% Scale & Crisp HTML Center Values
 */
/** Board tile glyph: themed icon with its number in a small badge */
function TileIconWithValue({
  type,
  value,
  isCorrupted = false,
  isBloomed = false,
  struck = false,
  wilted = false,
}: {
  type: EntityType;
  value: number | string;
  isCorrupted?: boolean;
  isBloomed?: boolean;
  struck?: boolean;
  /** Drawn grey and drooping (a Thorn that cost Life) */
  wilted?: boolean;
}) {
  const color =
    type === "POTION" && isCorrupted
      ? ENTITY_COLORS.POISON_POTION
      : ENTITY_COLORS[type];
  // Signed effect: harmful tiles show a filled "−N", helpful ones an outlined "+N"
  const harmful = type === "ENEMY" || type === "TRAP" || (type === "POTION" && isCorrupted);
  const n = typeof value === "number" ? value : Math.abs(Number(value)) || value;
  const label = harmful ? `−${n}` : `+${n}`;
  // Helpful values are never red: Berries show a green "+N"
  const lifeColor = "#34D399";
  const badgeColor = type === "POTION" && !isCorrupted ? lifeColor : color;
  return (
    <div className="relative w-[72%] h-[72%] flex items-center justify-center">
      <span
        className="w-full h-full flex items-center justify-center transition-[filter,transform] duration-300"
        style={wilted ? { filter: "grayscale(1) brightness(0.7)", transform: "rotate(14deg) translateY(6%) scale(0.92)" } : undefined}
      >
        <EntityIcon
          type={type}
          size="100%"
          isCorrupted={isCorrupted}
          isBloomed={isBloomed}
        />
      </span>
      {type === "TRAP" && (
        <span
          className="tile-tag absolute -top-1.5 -left-2 text-[11px] leading-none font-black text-slate-200 select-none pointer-events-none"
          aria-hidden="true"
          title="Step on it diagonally to dodge"
        >
          ↗
        </span>
      )}
      <span
        className={`absolute -bottom-1.5 -right-2 min-w-[22px] h-[20px] px-1 flex items-center justify-center font-mono font-black text-[12px] leading-none border-[1.5px] select-none pointer-events-none ${
          harmful ? "rounded-[4px]" : "rounded-full"
        } ${struck ? "line-through opacity-70" : ""}`}
        style={
          harmful
            ? { backgroundColor: type === "TRAP" ? "#4F6155" : "#E11D48", borderColor: type === "TRAP" ? "#CBD5E1" : "#FDA4AF", color: "#FFFFFF" }
            : { backgroundColor: "#101913", borderColor: badgeColor, color: badgeColor }
        }
      >
        {label}
      </span>
    </div>
  );
}

export function CellGeometricNode({
  cell,
  modifierId,
  heroClassId = "KNIGHT",
  heroAccentColor = "#FBBF24",
  isSanctuary = true,
  isEnemyNeutralized = false,
  isResolvedBloomed = false,
  isThornWilted = false,
  companionEmoji,
  hideHero,
}: {
  cell: GridCell;
  modifierId: ModifierId;
  heroClassId?: HeroClassId;
  heroSymbol?: string;
  heroAccentColor?: string;
  isSanctuary?: boolean;
  isEnemyNeutralized?: boolean;
  isResolvedBloomed?: boolean;
  /** The line took Life from this Thorn */
  isThornWilted?: boolean;
  /** A chosen companion (Otter, Butterfly, Fox) drawn on the home tile */
  companionEmoji?: string;
  hideHero?: boolean;
  isPortalReady?: boolean;
}) {
  switch (cell.type) {
    case "HERO": {
      const isMage = heroClassId === "MAGE";
      const isVampire = heroClassId === "VAMPIRE";
      const isRogue = heroClassId === "ROGUE";
      const IconComponent = isVampire
        ? Crown
        : isMage
        ? Sparkles
        : isRogue
        ? Compass
        : Cat;

      if (hideHero) {
        return (
          <div className="relative w-[78%] h-[78%] flex items-center justify-center opacity-40">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <circle
                cx="50"
                cy="50"
                r="30"
                fill="none"
                stroke={isSanctuary ? "#FDE047" : "#22D3EE"}
                strokeWidth="3.5"
                strokeDasharray="6 6"
              />
            </svg>
          </div>
        );
      }

      return (
        <div className="relative w-[78%] h-[78%] flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="rgba(22,35,26,0.65)"
              stroke={isSanctuary ? "#FDE047" : "#22D3EE"}
              strokeWidth="4.5"
            />
            <circle
              cx="50"
              cy="50"
              r="24"
              fill="none"
              stroke={
                isSanctuary
                  ? "rgba(253,224,71,0.35)"
                  : "rgba(34,211,238,0.35)"
              }
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {isSanctuary ? (
              <EntityIcon type="HERO" companionId={heroClassId} size="66%" />
            ) : companionEmoji ? (
              <span className="text-[min(7cqw,28px)] leading-none drop-shadow-[0_0_6px_rgba(253,224,71,0.7)]" aria-hidden="true">
                {companionEmoji}
              </span>
            ) : (
            <IconComponent
              className="w-[44%] h-[44%] text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.85)]"
              strokeWidth={2.5}
            />
            )}
          </div>
        </div>
      );
    }

    case "EXIT": {
      return (
        <div className="relative w-[80%] h-[80%] flex items-center justify-center">
          <span className="absolute inset-[12%] rounded-full bg-amber-300/25 blur-md" />
          <EntityIcon type="EXIT" size="100%" className="relative" />
        </div>
      );
    }

    case "ENEMY": {
      const bloomed = !isThornWilted && (isEnemyNeutralized || isResolvedBloomed);
      return (
        <TileIconWithValue
          type="ENEMY"
          value={cell.value}
          isBloomed={bloomed}
          struck={bloomed}
          wilted={isThornWilted}
        />
      );
    }

    case "SHIELD": {
      const isVampireBloodBlade = heroClassId === "VAMPIRE";
      const displayVal = isVampireBloodBlade
        ? "+1✂️"
        : modifierId === "GLASS_ARMOR"
        ? cell.value * 2
        : cell.value;
      return <TileIconWithValue type="SHIELD" value={displayVal} />;
    }

    case "WEAPON":
      return <TileIconWithValue type="WEAPON" value={cell.value} />;

    case "POTION": {
      const isCorrupted = modifierId === "BLOOD_GOLD";
      return (
        <TileIconWithValue
          type="POTION"
          value={isCorrupted ? "-1" : cell.value}
          isCorrupted={isCorrupted}
        />
      );
    }

    case "GOLD":
      return <TileIconWithValue type="GOLD" value={cell.value} />;

    case "TRAP":
      return <TileIconWithValue type="TRAP" value={cell.value} />;

    case "VOID":
      return null;
  }
}

function getTileInspectionData(
  cell: GridCell,
  isSanctuary: boolean
): {
  icon: string;
  name: string;
  valueLabel: string;
  explanation: string;
} {
  switch (cell.type) {
    case "HERO":
      return {
        icon: isSanctuary ? "🐱" : "⚪",
        name: isSanctuary ? "You (your cat)" : "Vanguard Hero",
        valueLabel: "Start here",
        explanation: isSanctuary
          ? "Every line starts here. Drag, without lifting, to the 🌈 Exit."
          : "Your starting point! Drag an unbroken line to the Exit Portal.",
      };
    case "ENEMY":
      return {
        icon: isSanctuary ? "🌺" : "🔺",
        name: isSanctuary ? "Thorn" : "Hostile Enemy",
        valueLabel: `−${cell.value} Life`,
        explanation: isSanctuary
          ? `Costs ${cell.value} ❤️ Life but adds ${cell.value} to your line's value. ✂️ Shears cut it completely; 🧤 Gloves block part of it.`
          : `Deals ${cell.value} damage. Absorbed by Weapons then Gloves before reducing HP.`,
      };
    case "SHIELD":
      return {
        icon: isSanctuary ? "🧤" : "🧤",
        name: isSanctuary ? "Gloves" : "Aegis Gloves",
        valueLabel: `+${cell.value} Gloves`,
        explanation: isSanctuary
          ? `Blocks ${cell.value} Thorn damage. Unused Gloves stay with you for the next Thorns and lines.`
          : `Adds +${cell.value} Gloves pool to absorb Enemy damage before HP is reduced.`,
      };
    case "WEAPON":
      return {
        icon: isSanctuary ? "✂️" : "⚔️",
        name: isSanctuary ? "Shears" : "Kinetic Blade",
        valueLabel: isSanctuary ? `1 cut · +${cell.value} value` : `+${cell.value} Weapon`,
        explanation: isSanctuary
          ? `One cut: the next Thorn you walk into is cut completely — no ❤️ lost. Also adds ${cell.value} to your line's value.`
          : `Temporary +${cell.value} attack power for the NEXT Enemy encounter only, then breaks to 0!`,
      };
    case "POTION":
      return {
        icon: isSanctuary ? "🍓" : "💚",
        name: isSanctuary ? "Berries" : "Nanite Potion",
        valueLabel: `+${cell.value} Life`,
        explanation: isSanctuary
          ? `Gives back ${cell.value} ❤️ Life, up to your maximum — save them for when you're hurt.`
          : `Restores +${cell.value} HP up to 10 max. Best picked up after taking Enemy or Trap damage.`,
      };
    case "GOLD":
      return {
        icon: isSanctuary ? "🌰" : "🪙",
        name: isSanctuary ? "Acorn" : "Tactical Gold",
        valueLabel: `+${cell.value} points`,
        explanation: isSanctuary
          ? `Adds ${cell.value} to your line's value. (🌱 Seeds to spend come from clearing Garden Beds.)`
          : `+${cell.value} Gold: adds ${cell.value} Value to this floor's score and buys upgrades in the Shop.`,
      };
    case "TRAP":
      return {
        icon: isSanctuary ? "⚙️" : "⚡",
        name: isSanctuary ? "Spike" : "Spike Trap",
        valueLabel: `−${cell.value} Life`,
        explanation: isSanctuary
          ? `Stepping on it straight costs ${cell.value} ❤️ Life (Gloves don't help). Step on it diagonally ↗ and it costs nothing.`
          : `Pierces shields orthogonally. PRO TIP: Move diagonally through the trap to dodge it for 0 damage!`,
      };
    case "EXIT":
      return {
        icon: isSanctuary ? "🌈" : "🟣",
        name: isSanctuary ? "Exit" : "Exit Portal",
        valueLabel: "End here",
        explanation: isSanctuary
          ? "Every line must end here. Let go on it to walk your line and score it."
          : "Your goal! Commit your path here with HP > 0 to resolve auto-battle.",
      };
    default:
      return {
        icon: "❓",
        name: "Mystery Tile",
        valueLabel: "Unknown",
        explanation: "A garden tile awaiting your line.",
      };
  }
}

function InspectorCard({
  cell,
  heroClassId = "KNIGHT",
  modifierId,
  isSanctuary,
  onClose,
}: {
  cell: GridCell | undefined;
  heroClassId?: HeroClassId;
  modifierId?: ModifierId;
  isSanctuary: boolean;
  onClose: () => void;
}) {
  if (!cell || cell.type === "VOID") return null;
  const isSourBerry = cell.type === "POTION" && modifierId === "BLOOD_GOLD";
  const info = isSourBerry
    ? {
        icon: "🫐",
        name: isSanctuary ? "Sour Berry" : "Poisoned Potion",
        valueLabel: isSanctuary ? "-1 Life" : "-1 HP",
        explanation: isSanctuary
          ? "Today's Berries have turned sour: stepping on one takes 1 Life. Walk around it if you can."
          : "Blood Gold poisons potions today: each one costs 1 HP.",
      }
    : getTileInspectionData(cell, isSanctuary);

  return (
    <div
      className={`rounded-2xl p-3 border shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all ${
        isSanctuary
          ? "bg-[#203126]/95 border-amber-300/60 shadow-[0_0_30px_rgba(251,191,36,0.35)] text-amber-50"
          : "bg-[#142018]/95 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.3)] text-cyan-50"
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
          isSanctuary
            ? "bg-amber-400/20 border-amber-300/60 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
            : "bg-cyan-500/20 border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
        }`}
      >
        <EntityIcon
          type={cell.type}
          companionId={heroClassId}
          isCorrupted={isSourBerry}
          size={28}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <span className="font-sans font-black text-xs text-white truncate">
            {info.name}
          </span>
          <span
            className={`font-mono font-extrabold text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
              isSanctuary
                ? "bg-amber-400/20 border-amber-300/60 text-amber-200"
                : "bg-cyan-500/20 border-cyan-400/60 text-cyan-200"
            }`}
          >
            {info.valueLabel}
          </span>
        </div>
        <p className="text-[11px] font-sans mt-1 leading-snug text-zinc-200">
          {info.explanation}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition shrink-0"
      >
        <span className="text-xs">✕</span>
      </button>
    </div>
  );
}

/** A finger that slides along the guide line, then pauses and repeats */
function GuideHand({ path }: { path: GridCoord[] }) {
  const xs = path.map((p) => `${(p.col + 0.5) * 20}%`);
  const ys = path.map((p) => `${(p.row + 0.5) * 20}%`);
  const n = path.length;
  const duration = 0.45 * n + 0.6;
  const times = path.map((_, i) => ((0.45 * i + 0.3) / duration));
  const start = path[0];
  return (
    <div className="absolute board-inset z-40 pointer-events-none" aria-hidden="true">
      <div
        className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-black text-slate-950 shadow-lg"
        style={{
          left: `${Math.max(12, Math.min(88, (start.col + 0.5) * 20))}%`,
          top: start.row > 0 ? `${start.row * 20 - 8.5}%` : `${(start.row + 1) * 20 + 1}%`,
        }}
      >
        Drag from here
      </div>
      <motion.div
        className="absolute text-[30px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
        style={{ marginLeft: -6, marginTop: -4 }}
        initial={{ left: xs[0], top: ys[0], opacity: 0 }}
        animate={{
          left: [xs[0], ...xs, xs[n - 1]],
          top: [ys[0], ...ys, ys[n - 1]],
          opacity: [0, ...path.map(() => 1), 0],
          scale: [1.2, ...path.map(() => 1), 1],
        }}
        transition={{
          duration,
          times: [0, ...times.map((t) => Math.min(0.97, t)), 1],
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: "easeInOut",
        }}
      >
        👆
      </motion.div>
    </div>
  );
}

/** One tile's effect, popped over it as the line replays */
function PlaybackPop({ step }: { step: PathStepSimulation }) {
  return (
    <div className="absolute board-inset z-40 pointer-events-none" aria-hidden="true">
      <StepEffectPop step={step} stepKey={`play-${step.stepIndex}`} />
    </div>
  );
}
