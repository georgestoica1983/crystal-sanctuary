"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FloorScoreBreakdown, PathSimulationResult, RelicId, ScoreSource } from "@/types/game";
import { soundEngine } from "@/lib/audio";
import { artify } from "@/components/ArtText";

const fmt = (n: number) => Math.round(n).toLocaleString();
const SCORED_TILES = ["ENEMY", "SHIELD", "WEAPON", "POTION", "TRAP"];

export const SCORE_SPEED_KEY = "ost_score_speed_v1";
export type ScoreSpeed = 1 | 2 | 4;

export function loadScoreSpeed(): ScoreSpeed {
  try {
    const v = Number(window.localStorage.getItem(SCORE_SPEED_KEY));
    return v === 2 || v === 4 ? v : 1;
  } catch {
    return 1;
  }
}

export function saveScoreSpeed(speed: ScoreSpeed): void {
  try {
    window.localStorage.setItem(SCORE_SPEED_KEY, String(speed));
  } catch {
    // Ignore storage errors
  }
}

/** Value each step of the line adds (index = step; 0 is the Companion's home) */
export function stepValues(sim: PathSimulationResult): number[] {
  return sim.steps.map((s, i) => {
    if (i === 0 || s.isShadowStepCross) return 0;
    if (s.cell.type === "GOLD") return Math.max(0, s.goldAfter - s.goldBefore);
    return SCORED_TILES.includes(s.cell.type) ? Math.max(0, s.cell.value) : 0;
  });
}

/** Time per tile as the line plays out: long lines speed up, Speed divides it */
export function lineStepMs(steps: number, speed: ScoreSpeed): number {
  const base = Math.max(90, 180 - Math.max(0, steps - 10) * 6);
  return Math.round(base / speed);
}

type ShowEvent =
  | { at: number; kind: "tile"; step: number }
  | { at: number; kind: "flat"; box: "value" | "length"; source: ScoreSource; index: number }
  | { at: number; kind: "swell"; index: number }
  | { at: number; kind: "x"; source: ScoreSource; index: number }
  | { at: number; kind: "total" };

/**
 * The Balatro-style order: every tile along the line, then flat relic Value
 * and Length, then each × relic after a short breath, then the total.
 */
export function lineShowTimeline(
  breakdown: FloorScoreBreakdown,
  steps: number,
  stepMs: number,
  speed: ScoreSpeed
): { events: ShowEvent[]; totalAt: number; endAt: number } {
  const events: ShowEvent[] = [];
  for (let i = 1; i < steps; i++) events.push({ at: i * stepMs, kind: "tile", step: i });
  let t = (steps - 1) * stepMs + 220 / speed;
  let flat = 0;
  for (const source of breakdown.chipSources) {
    events.push({ at: t, kind: "flat", box: "value", source, index: flat++ });
    t += 300 / speed;
  }
  for (const source of breakdown.multSources) {
    events.push({ at: t, kind: "flat", box: "length", source, index: flat++ });
    t += 300 / speed;
  }
  breakdown.xMultSources.forEach((source, index) => {
    events.push({ at: t, kind: "swell", index });
    t += 150 / speed;
    events.push({ at: t, kind: "x", source, index });
    t += 380 / speed;
  });
  t += 80 / speed;
  events.push({ at: t, kind: "total" });
  return { events, totalAt: t, endAt: t + 750 / speed };
}

/**
 * Plays over the line meter when a line is let go: Value and Length tick up
 * tile by tile, relics add in order (lighting up in the header), and the
 * total lands. Tap to skip.
 */
export default function LineScoreShow({
  breakdown,
  values,
  steps,
  stepMs,
  speed,
  target,
  tierName,
  tierColor,
  onRelic,
  onSkip,
}: {
  breakdown: FloorScoreBreakdown;
  values: number[];
  steps: number;
  stepMs: number;
  speed: ScoreSpeed;
  /** Points the bed still needed before this line (for the size of the chord) */
  target: number;
  tierName?: string | null;
  tierColor?: string;
  onRelic?: (id: RelicId) => void;
  onSkip?: () => void;
}) {
  const baseValue = breakdown.gemChips + breakdown.tileChips;
  const [value, setValue] = useState(0);
  const [length, setLength] = useState(1);
  const [xMult, setXMult] = useState(1);
  const [caption, setCaption] = useState<{ key: string; art?: string; text: string; tone: string } | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [pulse, setPulse] = useState<{ box: "value" | "length" | "x"; key: number } | null>(null);
  const onRelicRef = useRef(onRelic);
  onRelicRef.current = onRelic;

  useEffect(() => {
    const { events } = lineShowTimeline(breakdown, steps, stepMs, speed);
    let v = 0;
    let len = 1;
    let x = 1;
    const timers = events.map((ev) =>
      window.setTimeout(() => {
        if (ev.kind === "tile") {
          v += values[ev.step] ?? 0;
          len += 1;
          // The last tile snaps to the exact totals
          if (ev.step === steps - 1) {
            v = baseValue;
            len = breakdown.pathMult;
          }
          setValue(v);
          setLength(len);
          const add = values[ev.step] ?? 0;
          if (add > 0) setPulse({ box: "value", key: ev.at });
        } else if (ev.kind === "flat") {
          if (ev.box === "value") {
            v += ev.source.value;
            setValue(v);
          } else {
            len += ev.source.value;
            setLength(len);
          }
          setPulse({ box: ev.box, key: ev.at });
          setCaption({
            key: `f${ev.index}`,
            art: ev.source.art,
            text: `${ev.source.label} +${ev.source.value} ${ev.box}`,
            tone: ev.box === "value" ? "text-sky-200" : "text-emerald-200",
          });
          if (ev.source.relicId) onRelicRef.current?.(ev.source.relicId);
          soundEngine.playRelicAdd(ev.index);
        } else if (ev.kind === "swell") {
          soundEngine.playMultSwell();
        } else if (ev.kind === "x") {
          x *= ev.source.value;
          setXMult(x);
          setPulse({ box: "x", key: ev.at });
          setCaption({ key: `x${ev.index}`, art: ev.source.art, text: `${ev.source.label} ×${ev.source.value}`, tone: "text-fuchsia-200" });
          if (ev.source.relicId) onRelicRef.current?.(ev.source.relicId);
          soundEngine.playMultiplierSparkle(ev.index);
        } else {
          setValue(breakdown.chips);
          setLength(breakdown.mult);
          setXMult(breakdown.xMult);
          setTotal(breakdown.total);
          setCaption(null);
          soundEngine.playTallyTotal(target > 0 ? breakdown.total / target : 0.3);
        }
      }, ev.at)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
    // The show plays once per line
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pop = (box: "value" | "length" | "x") =>
    pulse?.box === box ? { scale: [1.22, 1], transition: { duration: 0.22 } } : { scale: 1 };

  return artify(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onSkip}
      role="status"
      aria-label={`Line score ${breakdown.total.toLocaleString()}`}
      className="absolute inset-0 z-40 rounded-xl border border-amber-300/30 bg-[#1A271E] px-3 flex flex-col justify-center cursor-pointer"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex flex-col items-center min-w-[52px]">
          <span className="text-[9.5px] font-semibold uppercase tracking-wide text-sky-300/70">Value</span>
          <motion.span key={`v${pulse?.box === "value" ? pulse.key : 0}`} animate={pop("value")} className="text-[22px] font-display font-semibold tabular-nums leading-none text-sky-100">
            {fmt(value)}
          </motion.span>
        </div>
        <span className="text-white/35 font-black">×</span>
        <div className="flex flex-col items-center min-w-[44px]">
          <span className="text-[9.5px] font-semibold uppercase tracking-wide text-emerald-300/70">Length</span>
          <motion.span key={`l${pulse?.box === "length" ? pulse.key : 0}`} animate={pop("length")} className="text-[22px] font-display font-semibold tabular-nums leading-none text-emerald-100">
            {fmt(length)}
          </motion.span>
        </div>
        {xMult !== 1 && (
          <motion.span
            key={`x${pulse?.box === "x" ? pulse.key : 0}`}
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
            className="text-[18px] font-display font-semibold tabular-nums text-fuchsia-200"
          >
            ×{Math.round(xMult * 100) / 100}
          </motion.span>
        )}
        <div className="flex-1" />
        <AnimatePresence>
          {total !== null && (
            <motion.span
              initial={{ scale: 1.7, opacity: 0, y: -4 }}
              animate={{ scale: [1.7, 0.92, 1], opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-[30px] font-display font-semibold tabular-nums leading-none text-amber-200"
            >
              {fmt(total)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-1.5 h-[16px] flex items-center gap-1.5 text-[11.5px] font-semibold overflow-hidden whitespace-nowrap">
        <AnimatePresence mode="popLayout">
          {caption ? (
            <motion.span
              key={caption.key}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className={`flex items-center gap-1.5 ${caption.tone}`}
            >
              {caption.art && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={caption.art} alt="" aria-hidden="true" draggable={false} className="h-4 w-4 object-contain" />
              )}
              {caption.text}
            </motion.span>
          ) : total === null ? (
            <motion.span key="walk" className="text-white/45">
              {tierName ? (
                <span className="font-black" style={{ color: tierColor }}>
                  {tierName}!{" "}
                </span>
              ) : null}
              Every tile adds its number · tap to skip
            </motion.span>
          ) : (
            <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-amber-100/70">
              {fmt(breakdown.chips)} × {fmt(breakdown.mult)}
              {breakdown.xMult !== 1 ? ` × ${Math.round(breakdown.xMult * 100) / 100}` : ""} = {fmt(breakdown.total)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
