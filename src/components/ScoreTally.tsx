"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BossRuleId, FloorScoreBreakdown, FloorStarBreakdown, RelicId } from "@/types/game";
import { BOSS_RULE_REGISTRY, RELIC_REGISTRY } from "@/lib/engine";
import { soundEngine } from "@/lib/audio";

interface ScoreTallyProps {
  isOpen: boolean;
  breakdown: FloorScoreBreakdown | null;
  stars: FloorStarBreakdown | null;
  floorLabel: string;
  runTotalBefore: number;
  defeatedBossRuleId?: BossRuleId;
  legendaryAward?: RelicId | null;
  parPercent?: number | null;
  isFinalFloor: boolean;
  clearReward?: number;
  /** Run mode line tally: faster animation and garden-target wording */
  quick?: boolean;
  scoreLabel?: string;
  runningTotalLabel?: string;
  targetScore?: number;
  continueLabel?: string;
  /** e.g. "Half this line would have scored 186 — yours scored 742 (4×)" */
  halfLineNote?: string | null;
  /** Extra teaching block shown with the result (e.g. your line vs a long line) */
  extra?: React.ReactNode;
  onContinue: () => void;
}

/** Animated number that eases from 0 to `value` once `active` turns true */
function useCountUp(value: number, active: boolean, durationMs = 650): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased * 100) / 100);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, active, durationMs]);
  return shown;
}

const fmt = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * Balatro-style floor tally: Value lines tick in, Length builds up, relic
 * multipliers pop, then the garden score slams down with floating text.
 */
export default function ScoreTally({
  isOpen,
  breakdown,
  stars,
  floorLabel,
  runTotalBefore,
  defeatedBossRuleId,
  legendaryAward,
  parPercent,
  isFinalFloor,
  clearReward = 0,
  quick = false,
  scoreLabel = "Garden score",
  runningTotalLabel = "Visit total",
  targetScore,
  continueLabel,
  halfLineNote,
  extra,
  onContinue,
}: ScoreTallyProps) {
  // 0 header · 1 chips · 2 mult · 3 ×mult · 4 total · 5 done
  const [stage, setStage] = useState(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    if (!isOpen || !breakdown) {
      setStage(0);
      return;
    }
    setStage(0);
    const hasX = breakdown.xMultSources.length > 0;
    const pace = quick ? 0.55 : 1;
    const schedule = (ms: number, fn: () => void) =>
      timersRef.current.push(window.setTimeout(fn, ms * pace));
    schedule(350, () => {
      setStage(1);
      soundEngine.playSanctuaryHarpChime(1);
    });
    schedule(1150, () => {
      setStage(2);
      soundEngine.playSanctuaryHarpChime(3);
    });
    schedule(hasX ? 1850 : 1850, () => {
      if (hasX) {
        setStage(3);
        soundEngine.playSanctuaryHarpChime(5);
      }
    });
    schedule(hasX ? 2500 : 1950, () => {
      setStage(4);
      soundEngine.playPortalBurst();
      soundEngine.vibrate([20, 30, 40]);
    });
    schedule(hasX ? 3300 : 2750, () => setStage(5));
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, [isOpen, breakdown, quick]);

  const chipsShown = useCountUp(breakdown?.chips ?? 0, stage >= 1, 700);
  const multShown = useCountUp(breakdown?.mult ?? 0, stage >= 2, 600);
  const totalShown = useCountUp(breakdown?.total ?? 0, stage >= 4, 750);
  const runShown = useCountUp(runTotalBefore + (breakdown?.total ?? 0), stage >= 4, 900);

  if (!isOpen || !breakdown) return null;

  const skip = () => {
    if (stage < 5) {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      setStage(5);
      return;
    }
    onContinue();
  };

  const chipLines = [
    { label: "🌰 Acorns gathered", value: breakdown.gemChips },
    { label: "🌿 Tiles on your line", value: breakdown.tileChips },
    ...breakdown.chipSources,
  ].filter((l) => l.value > 0);
  const multLines = [
    { label: `📏 Line length`, value: breakdown.pathMult },
    ...breakdown.multSources,
  ];
  const boss = defeatedBossRuleId ? BOSS_RULE_REGISTRY[defeatedBossRuleId] : null;
  const legendary = legendaryAward ? RELIC_REGISTRY[legendaryAward] : null;
  const starFlags = stars
    ? [stars.star1Survivor, stars.star2Greed, stars.star3Flawless]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-3 select-none"
      onClick={skip}
      role="dialog"
      aria-label="Garden score"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative my-auto w-full max-w-[400px] rounded-2xl p-3 min-[360px]:p-4 space-y-3 text-white border border-white/[0.08] bg-[#151B2E] shadow-2xl shadow-black/50 overflow-hidden"
      >
        {/* Header */}
        <div className="text-center">
          <div className="text-[12px] font-semibold leading-snug text-emerald-300/90">
            {floorLabel}
          </div>
          {boss && (
            <motion.div
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 text-sm font-black text-rose-200"
            >
              {boss.icon} {boss.name} defeated!
            </motion.div>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-1 text-xl">
            {starFlags.map((earned, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0, transition: { delay: 0.1 + i * 0.12 } }}
                className={
                  earned
                    ? "text-amber-300"
                    : "text-white/15"
                }
              >
                ★
              </motion.span>
            ))}
          </div>
        </div>

        {/* Value × Length boxes */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 min-[360px]:gap-2">
          <div className="rounded-xl border border-sky-300/40 bg-sky-500/10 p-2">
            <div className="text-[11px] font-semibold text-sky-200 text-center">
              Value
            </div>
            <motion.div
              key={`c-${stage >= 1}`}
              animate={stage >= 1 ? { scale: [1.25, 1] } : {}}
              className="text-3xl font-mono font-black text-center text-sky-100 leading-tight"
            >
              {fmt(Math.round(chipsShown))}
            </motion.div>
            <div className="space-y-0.5 mt-1">
              {chipLines.map((line, i) => (
                <motion.div
                  key={line.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={stage >= 1 ? { opacity: 1, x: 0, transition: { delay: i * 0.15 } } : {}}
                  className="flex justify-between items-start text-[11px] leading-tight text-sky-100/80 gap-1"
                >
                  <span className="min-w-0 break-words">{line.label}</span>
                  <span className="font-bold shrink-0">+{line.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center text-2xl font-black text-white/40">×</div>

          <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 p-2">
            <div className="text-[11px] font-semibold text-emerald-200 text-center">
              Length
            </div>
            <motion.div
              key={`m-${stage >= 2}`}
              animate={stage >= 2 ? { scale: [1.25, 1] } : {}}
              className="text-3xl font-mono font-black text-center text-emerald-100 leading-tight"
            >
              {fmt(Math.round(multShown))}
            </motion.div>
            <div className="space-y-0.5 mt-1">
              {multLines.map((line, i) => (
                <motion.div
                  key={line.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={stage >= 2 ? { opacity: 1, x: 0, transition: { delay: i * 0.15 } } : {}}
                  className="flex justify-between items-start text-[11px] leading-tight text-emerald-100/80 gap-1"
                >
                  <span className="min-w-0 break-words">{line.label}</span>
                  <span className="font-bold shrink-0">+{line.value}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Relic ×Length pops */}
        {breakdown.xMultSources.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 min-h-[28px]">
            {breakdown.xMultSources.map((x, i) => (
              <motion.span
                key={x.label}
                initial={{ scale: 0, opacity: 0 }}
                animate={
                  stage >= 3
                    ? { scale: [1.6, 1], opacity: 1, transition: { delay: i * 0.18 } }
                    : {}
                }
                className="px-2 py-1 rounded-lg border border-violet-300/50 bg-violet-500/15 text-[12px] font-bold text-violet-100"
              >
                {x.label} ×{x.value}
              </motion.span>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="relative rounded-xl border border-amber-300/50 bg-amber-400/10 py-2 text-center">
          <div className="text-[11px] font-semibold text-amber-200">
            {scoreLabel}
          </div>
          <motion.div
            animate={stage >= 4 ? { scale: [1.8, 0.9, 1] } : { scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-mono font-black text-amber-200"
          >
            {stage >= 4 ? fmt(Math.round(totalShown)) : "?"}
          </motion.div>
          <div className="text-[11px] font-mono text-amber-100/80">
            {runningTotalLabel}: {stage >= 4 ? fmt(Math.round(runShown)) : fmt(runTotalBefore)}
            {targetScore != null && <span className="text-amber-100/60"> / {fmt(targetScore)}</span>}
            {parPercent != null && stage >= 4 && (
              <span className="ml-1.5 text-teal-200">· {parPercent}% of par</span>
            )}
          </div>

          {/* Floating text */}
          <AnimatePresence>
            {stage >= 4 && (
              <motion.div
                key="float"
                initial={{ y: 0, opacity: 1, scale: 0.8 }}
                animate={{ y: -70, opacity: 0, scale: 1.4 }}
                transition={{ duration: 1.3, ease: "easeOut" }}
                className="pointer-events-none absolute inset-x-0 top-0 text-2xl font-black text-amber-100"
              >
                +{breakdown.total.toLocaleString()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {halfLineNote && stage >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-[11px] leading-snug text-emerald-100"
          >
            📏 {halfLineNote}
          </motion.div>
        )}

        {extra && stage >= 4 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {extra}
          </motion.div>
        )}

        {clearReward > 0 && stage >= 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-[12px] font-semibold text-amber-200"
          >
            Garden payout: +{clearReward} 🌱 Seeds to spend in the Shop
          </motion.div>
        )}

        {legendary && stage >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-xs font-bold text-amber-100"
          >
            👑 Legendary relic earned: {legendary.icon} {legendary.name}
          </motion.div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            skip();
          }}
          className={`w-full rounded-xl py-3 font-bold text-[14px] transition active:scale-95 ${
            stage >= 5
              ? "bg-teal-300 text-slate-950"
              : "border border-white/15 bg-white/[0.05] text-white/60"
          }`}
        >
          {stage < 5
            ? "Tap to skip"
            : continueLabel ?? (isFinalFloor ? "See results →" : "Enter the Shop →")}
        </button>
      </motion.div>
    </div>
  );
}
