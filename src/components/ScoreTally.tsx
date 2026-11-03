"use client";

import BossIcon from "@/components/BossIcon";
import { ArrowRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BossRuleId, FloorScoreBreakdown, FloorStarBreakdown, RelicId, ScoreSource } from "@/types/game";
import { BOSS_RULE_REGISTRY, RELIC_REGISTRY } from "@/lib/engine";
import { soundEngine } from "@/lib/audio";
import { themeArt, tileArt } from "@/lib/art";
import Badge from "@/components/Badge";
import RelicIcon from "@/components/RelicIcon";
import { artify } from "@/components/ArtText";
import { formatScore } from "@/lib/formatScore";

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
  /** The line already played its scoring show on the board: open on the result */
  instant?: boolean;
  scoreLabel?: string;
  runningTotalLabel?: string;
  targetScore?: number;
  continueLabel?: string;
  /** e.g. "Half this line would have scored 186 — yours scored 742 (4×)" */
  halfLineNote?: string | null;
  /** What relics and boosts added to this line (the Shop's payoff, while it is new) */
  relicBonus?: number | null;
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

/** "Your relics added +X" shows on the first few line cards that have it */
const RELIC_PAYOFF_KEY = "ost_relic_payoff_v1";
const RELIC_PAYOFF_TIMES = 4;

const fmt = (n: number) =>
  Number.isInteger(n) ? formatScore(n) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * Balatro-style floor tally: Value lines tick in, Length builds up, relic
 * multipliers pop, then the garden score slams down with floating text.
 */
/** Small icon in front of a score line (relic, set theme or tile art) */
function SourceArt({ art, size = 13 }: { art?: string; size?: number }) {
  if (!art) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={art} alt="" aria-hidden="true" draggable={false} className="shrink-0 object-contain mt-px" style={{ width: size, height: size }} />
  );
}

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
  instant = false,
  scoreLabel = "Garden score",
  runningTotalLabel = "Visit total",
  targetScore,
  continueLabel,
  halfLineNote,
  relicBonus = null,
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
    if (instant) {
      setStage(5);
      return;
    }
    setStage(0);
    const hasX = breakdown.xMultSources.length > 0;
    const pace = quick ? 0.55 : 1;
    const schedule = (ms: number, fn: () => void) =>
      timersRef.current.push(window.setTimeout(fn, ms * pace));
    // Value counts up low, Length carries on higher, each × multiplier sparkles
    // as it pops, and the total lands on a chord as full as the line is big
    schedule(350, () => {
      setStage(1);
      soundEngine.playCountRun(0, 6, 700 * pace);
    });
    schedule(1150, () => {
      setStage(2);
      soundEngine.playCountRun(5, 5, 600 * pace);
    });
    schedule(hasX ? 1850 : 1850, () => {
      if (hasX) {
        setStage(3);
        breakdown.xMultSources.forEach((_, i) =>
          schedule(i * 180, () => soundEngine.playMultiplierSparkle(i))
        );
      }
    });
    schedule(hasX ? 2500 : 1950, () => {
      setStage(4);
      soundEngine.playTallyTotal(targetScore ? breakdown.total / targetScore : 0.3);
    });
    schedule(hasX ? 3300 : 2750, () => setStage(5));
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, [isOpen, breakdown, quick, instant, targetScore]);

  // Shown (and counted) only on cards the player actually sees
  const [payoffOn, setPayoffOn] = useState(false);
  useEffect(() => {
    if (!isOpen || !relicBonus) {
      setPayoffOn(false);
      return;
    }
    try {
      const shown = Number(window.localStorage.getItem(RELIC_PAYOFF_KEY)) || 0;
      if (shown >= RELIC_PAYOFF_TIMES) return setPayoffOn(false);
      window.localStorage.setItem(RELIC_PAYOFF_KEY, String(shown + 1));
      setPayoffOn(true);
    } catch {
      setPayoffOn(false);
    }
  }, [isOpen, breakdown, relicBonus]);

  const d = instant ? 1 : undefined;
  const chipsShown = useCountUp(breakdown?.chips ?? 0, stage >= 1, d ?? 700);
  const multShown = useCountUp(breakdown?.mult ?? 0, stage >= 2, d ?? 600);
  const totalShown = useCountUp(breakdown?.total ?? 0, stage >= 4, d ?? 750);
  const runShown = useCountUp(runTotalBefore + (breakdown?.total ?? 0), stage >= 4, d ?? 900);

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

  const chipLines: ScoreSource[] = [
    { label: "Acorns gathered", value: breakdown.gemChips, art: tileArt("GOLD") ?? undefined },
    { label: "Tiles on your line", value: breakdown.tileChips, art: themeArt("GROWING") },
    ...breakdown.chipSources,
  ].filter((l) => l.value > 0);
  const multLines: ScoreSource[] = [
    { label: "Line length", value: breakdown.pathMult, art: themeArt("LONG") },
    ...breakdown.multSources,
  ];
  const boss = defeatedBossRuleId ? BOSS_RULE_REGISTRY[defeatedBossRuleId] : null;
  const legendary = legendaryAward ? RELIC_REGISTRY[legendaryAward] : null;
  const starFlags = stars
    ? [stars.star1Survivor, stars.star2Greed, stars.star3Flawless]
    : [];

  // One clear sum: Value × Length × every multiplier combined
  const xAll = breakdown.xMultSources.reduce((m, x) => m * x.value, 1);
  const xShown = Math.round(xAll * 100) / 100;
  const bedTotal = runTotalBefore + breakdown.total;
  const bedDone = targetScore != null && bedTotal >= targetScore;
  // The details, folded: the biggest few of each, the rest summed
  const top = (lines: ScoreSource[]) => {
    const sorted = [...lines].sort((a, b) => b.value - a.value);
    const shown = sorted.slice(0, 3);
    const rest = sorted.slice(3);
    return { shown, more: rest.length, moreValue: rest.reduce((t, l) => t + l.value, 0) };
  };
  const valueTop = top(chipLines);
  const lengthTop = top(multLines);
  const detailRow = (line: ScoreSource, tone: string) => (
    <div key={line.label} className={`flex items-center justify-between gap-2 text-[15px] leading-snug ${tone}`}>
      <span className="min-w-0 flex items-center gap-1.5">
        <SourceArt art={line.art} size={18} />
        <span className="truncate">{line.label}</span>
      </span>
      <span className="shrink-0 font-bold tabular-nums">+{line.value}</span>
    </div>
  );

  return artify(
    <div
      className="ui-zoom fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none"
      onClick={skip}
      role="dialog"
      aria-label="Line score"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="fit-card relative w-full max-w-[400px] rounded-2xl p-4 space-y-3 text-white border border-white/[0.08] bg-[#1B281F] shadow-2xl shadow-black/50"
      >
        {/* Where we are, and the Boss if it fell */}
        <div className="text-center">
          <div className="text-[13px] font-semibold text-emerald-300/90">{floorLabel}</div>
          {boss && (
            <motion.div
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 font-display text-[20px] font-bold text-rose-200"
            >
              {defeatedBossRuleId && <BossIcon id={defeatedBossRuleId} size={30} className="mr-1.5 align-middle" />}
              {boss.name} beaten!
            </motion.div>
          )}
          {starFlags.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-1 text-[22px]">
              {starFlags.map((earned, i) => (
                <Badge key={i} id="star" size={22} className={earned ? "" : "opacity-20 grayscale"} />
              ))}
            </div>
          )}
        </div>

        {/* 1. The line's score, big */}
        <div className="relative text-center">
          <div className="text-[14px] font-semibold text-amber-200/90">{scoreLabel}</div>
          <motion.div
            animate={stage >= 4 ? { scale: [1.5, 0.95, 1] } : { scale: 1 }}
            transition={{ duration: 0.45 }}
            className="font-display text-[46px] font-bold leading-none tabular-nums text-amber-200"
          >
            {stage >= 4 ? fmt(Math.round(totalShown)) : "?"}
          </motion.div>
          <div className="mt-1.5 text-[15px] text-white/80">
            {runningTotalLabel}{" "}
            <b className="tabular-nums text-white">{fmt(stage >= 4 ? Math.round(runShown) : runTotalBefore)}</b>
            {targetScore != null && <span className="text-white/60"> of {fmt(targetScore)}</span>}
            {bedDone && stage >= 4 && <span className="font-bold text-lime-200"> · Bed cleared</span>}
            {parPercent != null && stage >= 4 && <span className="text-teal-200"> · {parPercent}% of par</span>}
          </div>
          <AnimatePresence>
            {stage >= 4 && !instant && (
              <motion.div
                key="float"
                initial={{ y: 0, opacity: 1, scale: 0.8 }}
                animate={{ y: -60, opacity: 0, scale: 1.3 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="pointer-events-none absolute inset-x-0 top-0 text-[24px] font-black text-amber-100"
              >
                +{formatScore(breakdown.total)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. One equation */}
        <div className="text-center text-[18px] font-semibold tabular-nums">
          <span className="text-sky-200">{fmt(Math.round(chipsShown))}</span>
          <span className="text-white/55 text-[15px] font-normal"> value </span>
          <span className="text-white/45">×</span>{" "}
          <span className="text-emerald-200">{fmt(Math.round(multShown))}</span>
          <span className="text-white/55 text-[15px] font-normal"> length</span>
          {xShown !== 1 && (
            <>
              {" "}
              <span className="text-white/45">×</span> <span className="text-fuchsia-200">{xShown}</span>
            </>
          )}
        </div>

        {payoffOn && relicBonus != null && stage >= 4 && (
          <div className="rounded-xl border border-violet-300/40 bg-violet-500/10 px-3 py-2 text-center text-[15px] text-violet-100">
            ✨ Your relics and boosts added <b className="text-white">+{fmt(relicBonus)}</b> to this line
          </div>
        )}

        {/* 3. How it added up, folded */}
        <details className="group rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-white/80">
            See how
            <span className="text-white/45 transition group-open:rotate-180" aria-hidden="true">▾</span>
          </summary>
          <div className="space-y-2.5 pb-2 pt-1">
            <div className="space-y-1">
              <div className="text-[13px] font-semibold text-sky-300/90">Value {fmt(breakdown.chips)}</div>
              {valueTop.shown.map((l) => detailRow(l, "text-sky-50/90"))}
              {valueTop.more > 0 && (
                <div className="text-[14px] text-white/55">
                  + {valueTop.more} more (+{valueTop.moreValue})
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-[13px] font-semibold text-emerald-300/90">Length {fmt(breakdown.mult)}</div>
              {lengthTop.shown.map((l) => detailRow(l, "text-emerald-50/90"))}
              {lengthTop.more > 0 && (
                <div className="text-[14px] text-white/55">
                  + {lengthTop.more} more (+{lengthTop.moreValue})
                </div>
              )}
            </div>
            {breakdown.xMultSources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {breakdown.xMultSources.map((x) => (
                  <span
                    key={x.label}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/40 bg-violet-500/10 px-2 py-1 text-[14px] font-semibold text-violet-100"
                  >
                    <SourceArt art={x.art} size={18} />
                    {x.label} ×{x.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </details>

        {halfLineNote && stage >= 4 && <div className="text-center text-[14px] leading-snug text-emerald-100/90">📏 {halfLineNote}</div>}

        {extra && stage >= 4 && <div>{extra}</div>}

        {clearReward > 0 && stage >= 4 && (
          <div className="text-center text-[14px] font-semibold text-amber-200">+{clearReward} 🌱 Seeds to spend in the Shop</div>
        )}

        {legendary && stage >= 4 && (
          <div className="flex items-center justify-center gap-2 text-center text-[14px] font-bold text-amber-100">
            <RelicIcon id={legendary.id} size={28} /> Legendary relic: {legendary.name}
          </div>
        )}

        <div className="card-footer bg-[#1B281F]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              skip();
            }}
            className={`w-full h-12 rounded-xl font-bold text-[16px] transition active:scale-95 flex items-center justify-center gap-1.5 ${
              stage >= 5 ? "bg-teal-300 text-slate-950" : "border border-white/15 bg-white/[0.05] text-white/70"
            }`}
          >
            {stage < 5 ? (
              "Tap to skip"
            ) : (
              <>
                {continueLabel ?? (isFinalFloor ? "See results" : "Enter the Shop")}
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
