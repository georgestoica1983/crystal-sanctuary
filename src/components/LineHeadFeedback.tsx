"use client";

import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GridCoord, PathSimulationResult, PathStepSimulation } from "@/types/game";
import { soundEngine } from "@/lib/audio";
import { getLineTier } from "@/lib/lineTiers";

const fmt = (n: number) => Math.round(n).toLocaleString();

export interface LiveLineScore {
  points: number;
  /** Points the newest tile added */
  gain: number;
  wilts: boolean;
}

type Tone = "plus" | "block" | "minus" | "neutral";

/** Text colours: plus is green, blocks are blue, only losses are red */
const TONE_CLASS: Record<Tone, string> = {
  plus: "bg-emerald-400 text-emerald-950",
  block: "bg-sky-400 text-sky-950",
  minus: "bg-rose-500 text-white",
  neutral: "bg-white text-slate-900",
};

/** What a tile just did to the Companion, in one or two short chips */
export function describeStepEffect(step: PathStepSimulation): Array<{ text: string; tone: Tone }> {
  const out: Array<{ text: string; tone: Tone }> = [];
  const lifeLost = Math.max(0, step.hpBefore - step.hpAfter);
  const lifeGained = Math.max(0, step.hpAfter - step.hpBefore);
  switch (step.cell.type) {
    case "ENEMY": {
      const cut = step.weaponBefore > 0;
      const blocked = Math.max(0, step.shieldBefore - step.shieldAfter);
      if (cut) out.push({ text: "✂️ cut!", tone: "block" });
      if (blocked > 0) out.push({ text: `🧤 −${blocked}`, tone: "block" });
      if (lifeLost > 0) out.push({ text: `❤️ −${lifeLost}`, tone: "minus" });
      else if (!cut && blocked === 0) out.push({ text: "❤️ −0", tone: "block" });
      break;
    }
    case "TRAP":
      if (step.trapDodgedDiagonally) out.push({ text: "↗ dodged", tone: "block" });
      else if (lifeLost > 0) out.push({ text: `❤️ −${lifeLost}`, tone: "minus" });
      else if (step.weaponDelta > 0) out.push({ text: `✂️ +${step.weaponDelta}`, tone: "plus" });
      break;
    case "POTION":
      if (lifeGained > 0) out.push({ text: `❤️ +${lifeGained}`, tone: "plus" });
      else if (lifeLost > 0) out.push({ text: `❤️ −${lifeLost}`, tone: "minus" });
      else out.push({ text: "❤️ full", tone: "neutral" });
      break;
    case "WEAPON":
      out.push({ text: "✂️ +1 cut", tone: "plus" });
      break;
    case "SHIELD":
      if (step.shieldDelta > 0) out.push({ text: `🧤 +${step.shieldDelta}`, tone: "plus" });
      else if (step.weaponDelta > 0) out.push({ text: `✂️ +${step.weaponDelta}`, tone: "plus" });
      break;
    default:
      break;
  }
  if (step.cell.type !== "ENEMY" && step.cell.type !== "TRAP" && lifeGained > 0 && step.cell.type !== "POTION") {
    out.push({ text: `❤️ +${lifeGained}`, tone: "plus" });
  }
  return out.slice(0, 2);
}

/** Percent position of a tile's centre on the 5×5 board */
const pos = (c: GridCoord) => ({ x: (c.col + 0.5) * 20, y: (c.row + 0.5) * 20 });

/**
 * Feedback where the eye is while drawing: a bubble beside the line head with
 * the growing score, and a short pop on each tile saying what it just did.
 */
export default function LineHeadFeedback({
  path,
  simulation,
  live,
  active,
}: {
  path: GridCoord[];
  simulation: PathSimulationResult;
  live: LiveLineScore | null;
  active: boolean;
}) {
  const head = path[path.length - 1];
  const lastStep = simulation.steps[path.length - 1];
  const prevLen = useRef(path.length);

  const prevTier = useRef(getLineTier(path.length).level);

  // On top of the board's tick per tile: a snip for a Shears cut, a firmer
  // buzz when Life is lost, and a chime when the line reaches a new tier
  useEffect(() => {
    const grew = path.length > prevLen.current;
    prevLen.current = path.length;
    const tier = getLineTier(path.length).level;
    const tierUp = tier > prevTier.current;
    prevTier.current = tier;
    if (!active || !grew || !lastStep) return;
    if (tierUp) soundEngine.playSanctuaryHarpChime(tier + 1);
    if (lastStep.cell.type === "ENEMY" && lastStep.weaponBefore > 0) soundEngine.playSwordHit(true);
    else if (lastStep.hpAfter < lastStep.hpBefore) soundEngine.vibrate(28);
  }, [path.length, active, lastStep]);

  if (!active || !head || path.length < 2 || !live) return null;

  const p = pos(head);
  // The bubble sits above the head (below it on the top row), away from the finger
  const above = head.row > 0;
  const bubbleY = above ? p.y - 15.5 : p.y + 15.5;
  const bubbleX = Math.max(11, Math.min(89, p.x));
  const effects = lastStep ? describeStepEffect(lastStep) : [];

  return (
    <div className="absolute inset-2.5 z-40 pointer-events-none" aria-hidden="true">
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-150 ease-out"
        style={{ left: `${bubbleX}%`, top: `${bubbleY}%` }}
      >
        <div
          className={`flex items-baseline gap-1 rounded-full px-2.5 py-1 shadow-lg shadow-black/40 font-mono whitespace-nowrap ${
            live.wilts ? "bg-slate-800/95 text-white/60 line-through" : "bg-slate-950/90 text-amber-200"
          } border border-white/15`}
        >
          <span className="text-[15px] font-black leading-none">{fmt(live.points)}</span>
          {live.gain > 0 && !live.wilts && (
            <motion.span
              key={path.length}
              initial={{ y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-[11px] font-black text-emerald-300 leading-none"
            >
              +{fmt(live.gain)}
            </motion.span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {effects.length > 0 && (
          <motion.div
            key={`${path.length}-${head.row}-${head.col}`}
            initial={{ opacity: 0, y: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], y: -26, scale: 1 }}
            transition={{ duration: 1.1, times: [0, 0.12, 0.7, 1] }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex gap-1"
            style={{ left: `${Math.max(12, Math.min(88, p.x))}%`, top: `${p.y}%` }}
          >
            {effects.map((e) => (
              <span
                key={e.text}
                className={`rounded-full px-1.5 py-0.5 text-[12px] font-black leading-none shadow-md whitespace-nowrap ${TONE_CLASS[e.tone]}`}
              >
                {e.text}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
