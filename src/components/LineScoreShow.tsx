"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LINE_TIERS } from "@/lib/lineTiers";
import { FloorScoreBreakdown, PathSimulationResult, RelicId, ScoreSource } from "@/types/game";
import { soundEngine } from "@/lib/audio";
import { artify } from "@/components/ArtText";
import { formatScore } from "@/lib/formatScore";
import RelicIcon from "@/components/RelicIcon";

const fmt = formatScore;
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

/** Value an Echo tile adds the second time it scores (rules v15+), per step */
export function echoValues(sim: PathSimulationResult): number[] {
  return sim.steps.map((s, i) =>
    i > 0 && !s.isShadowStepCross && s.cell.bagTile?.echo && [...SCORED_TILES, "GOLD"].includes(s.cell.type)
      ? Math.max(0, s.cell.value)
      : 0
  );
}

/** Time per tile as the line plays out: long lines speed up, Speed divides it */
export function lineStepMs(steps: number, speed: ScoreSpeed): number {
  const base = Math.max(90, 180 - Math.max(0, steps - 10) * 6);
  return Math.round(base / speed);
}

export type FireLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * How far a line beats what the bed still needs (the overkill rings): 1 =
 * clears it, 2 = twice over, 3 = five times, 4 = ten times, 5 = a hundred
 * times over. The glow, petals, shake and sound grow with it.
 */
export function fireLevel(points: number, need: number | undefined): FireLevel {
  if (!need || need <= 0 || points < need) return 0;
  if (points >= need * 100) return 5;
  if (points >= need * 10) return 4;
  if (points >= need * 5) return 3;
  if (points >= need * 2) return 2;
  return 1;
}

export const FIRE_NAMES = ["", "Clears the bed!", "Double bloom! ×2", "Wild bloom! ×5", "Mega bloom! ×10", "Legendary bloom! ×100"];
export const FIRE_GLOW = [
  "",
  "0 0 14px rgba(252,211,77,0.35)",
  "0 0 22px rgba(252,211,77,0.5), 0 0 6px rgba(251,146,60,0.4)",
  "0 0 34px rgba(252,211,77,0.65), 0 0 12px rgba(251,146,60,0.55)",
  "0 0 44px rgba(253,224,71,0.75), 0 0 16px rgba(244,114,182,0.6)",
  "0 0 60px rgba(253,224,71,0.9), 0 0 22px rgba(192,132,252,0.75)",
];

/** The best line ever scored on this device (Garden Runs only) */
const BEST_LINE_KEY = "ost_best_line_v1";
function loadBestLine(): number {
  try {
    return Number(window.localStorage.getItem(BEST_LINE_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBestLine(points: number): void {
  try {
    window.localStorage.setItem(BEST_LINE_KEY, String(points));
  } catch {
    // Ignore storage errors
  }
}
const PETAL_COLORS = ["#F9C784", "#F4A6A6", "#FCD34D", "#F7B2C4", "#FDBA74"];

/** A burst of petals from the total: bigger, wider and more of them for longer lines */
function LengthBurst({ level, color }: { level: number; color: string }) {
  const count = [0, 8, 14, 22, 32][level] ?? 0;
  const reach = 30 + level * 16;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-6 top-1/2 h-0 w-0 overflow-visible">
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.2;
        const r = reach * (0.7 + ((i * 29) % 10) / 30);
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
            animate={{ opacity: [0, 1, 0], x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6, scale: 1 + level * 0.12, rotate: 200 + i * 30 }}
            transition={{ duration: 0.9 + level * 0.15, ease: "easeOut" }}
            className="absolute h-[7px] w-[5px] rounded-[60%_40%_60%_40%]"
            style={{ backgroundColor: i % 3 === 0 ? color : PETAL_COLORS[i % PETAL_COLORS.length] }}
          />
        );
      })}
    </span>
  );
}

/** Warm petals drifting up from the total: more of them the bigger the overflow */
function Petals({ level }: { level: number }) {
  const count = [0, 6, 10, 16, 22, 30][level] ?? 0;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: count }, (_, i) => {
        const left = 55 + ((i * 37) % 45);
        const drift = ((i * 53) % 40) - 20;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 10, x: 0, rotate: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], y: -38 - ((i * 17) % 26), x: drift, rotate: 160 + i * 25, scale: 1 }}
            transition={{ duration: 1.5 + (i % 4) * 0.2, delay: (i % 6) * 0.06, ease: "easeOut" }}
            className="absolute bottom-2 h-[7px] w-[5px] rounded-[60%_40%_60%_40%]"
            style={{ left: `${left}%`, backgroundColor: PETAL_COLORS[i % PETAL_COLORS.length] }}
          />
        );
      })}
    </span>
  );
}

type ShowEvent =
  | { at: number; kind: "tile"; step: number }
  | { at: number; kind: "echo"; step: number }
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
  speed: ScoreSpeed,
  echoes: number[] = [],
  /** Line tier (getLineTier): longer lines hold their total a little longer */
  tierLevel = 0
): { events: ShowEvent[]; totalAt: number; endAt: number } {
  const events: ShowEvent[] = [];
  for (let i = 1; i < steps; i++) {
    events.push({ at: i * stepMs, kind: "tile", step: i });
    // An Echo tile rings a second time, half a beat later
    if ((echoes[i] ?? 0) > 0) events.push({ at: i * stepMs + stepMs * 0.5, kind: "echo", step: i });
  }
  let t = (steps - 1) * stepMs + ((echoes[steps - 1] ?? 0) > 0 ? stepMs * 0.5 : 0) + 220 / speed;
  let flat = 0;
  for (const source of breakdown.chipSources.filter((c) => !c.echo)) {
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
  return { events, totalAt: t, endAt: t + (750 + tierLevel * 260) / speed };
}

/**
 * Plays over the line meter when a line is let go: Value and Length tick up
 * tile by tile, relics add in order (lighting up in the header), and the
 * total lands. Tap to skip.
 */
export default function LineScoreShow({
  breakdown,
  values,
  echoes = [],
  steps,
  stepMs,
  speed,
  target,
  tierName,
  tierColor,
  tierLevel = 0,
  onRelic,
  onSkip,
  recordBest = false,
}: {
  /** A real Run's line: a new best line ever is celebrated (and remembered) */
  recordBest?: boolean;
  /** Line tier of this line (0 Seedling … 4 Grand garden) */
  tierLevel?: number;
  breakdown: FloorScoreBreakdown;
  values: number[];
  /** Echo tiles' second count per step (rules v15+) */
  echoes?: number[];
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
  const [caption, setCaption] = useState<{ key: string; art?: string; text: string; tone: string; color?: string } | null>(null);
  const still = useReducedMotion();
  const [total, setTotal] = useState<number | null>(null);
  const [pulse, setPulse] = useState<{ box: "value" | "length" | "x"; key: number } | null>(null);
  // The total rolls up to its final number
  const [shownTotal, setShownTotal] = useState(0);
  // The relics that score on this line, lighting up (with a count) as they fire
  const relicRow = React.useMemo(() => {
    const ids: RelicId[] = [];
    for (const src of [...breakdown.chipSources, ...breakdown.multSources, ...breakdown.xMultSources])
      if (src.relicId && !ids.includes(src.relicId)) ids.push(src.relicId);
    return ids.slice(0, 6);
  }, [breakdown]);
  const [hits, setHits] = useState<Partial<Record<RelicId, number>>>({});
  const [bestLine, setBestLine] = useState(false);
  const onRelicRef = useRef(onRelic);
  onRelicRef.current = onRelic;

  useEffect(() => {
    const { events } = lineShowTimeline(breakdown, steps, stepMs, speed, echoes, tierLevel);
    const echoTotal = echoes.reduce((a, b) => a + b, 0);
    const lastWalkAt = Math.max(0, ...events.filter((e) => e.kind === "tile" || e.kind === "echo").map((e) => e.at));
    let v = 0;
    let len = 1;
    let x = 1;
    const timers = events.map((ev) =>
      window.setTimeout(() => {
        if (ev.kind === "tile") {
          v += values[ev.step] ?? 0;
          len += 1;
          // The walk's end snaps to the exact totals
          if (ev.at === lastWalkAt) v = baseValue + echoTotal;
          if (ev.step === steps - 1) len = breakdown.pathMult;
          setValue(v);
          setLength(len);
          // The line grows a tier: its name pops up with a rising chime
          const crossed = LINE_TIERS.find((t) => t.level > 0 && t.minTiles === ev.step + 1);
          if (crossed) {
            setCaption({ key: `t${crossed.level}`, text: `${crossed.name}!`, tone: "font-black", color: crossed.color });
            soundEngine.playTierUp(crossed.level);
          }
          const add = values[ev.step] ?? 0;
          if (add > 0) setPulse({ box: "value", key: ev.at });
        } else if (ev.kind === "echo") {
          v += echoes[ev.step] ?? 0;
          if (ev.at === lastWalkAt) v = baseValue + echoTotal;
          setValue(v);
          setPulse({ box: "value", key: ev.at });
          setCaption({ key: `e${ev.step}`, text: `🔔 Echo! +${echoes[ev.step]} again`, tone: "text-amber-200" });
          soundEngine.playMultiplierSparkle(0);
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
          if (ev.source.relicId) {
            onRelicRef.current?.(ev.source.relicId);
            const id = ev.source.relicId;
            setHits((h) => ({ ...h, [id]: (h[id] ?? 0) + 1 }));
          }
          soundEngine.playRelicAdd(ev.index);
        } else if (ev.kind === "swell") {
          soundEngine.playMultSwell();
        } else if (ev.kind === "x") {
          x *= ev.source.value;
          setXMult(x);
          setPulse({ box: "x", key: ev.at });
          setCaption({ key: `x${ev.index}`, art: ev.source.art, text: `${ev.source.label} ×${ev.source.value}`, tone: "text-fuchsia-200" });
          if (ev.source.relicId) {
            onRelicRef.current?.(ev.source.relicId);
            const id = ev.source.relicId;
            setHits((h) => ({ ...h, [id]: (h[id] ?? 0) + 1 }));
          }
          soundEngine.playMultiplierSparkle(ev.index);
        } else {
          setValue(breakdown.chips);
          setLength(breakdown.mult);
          setXMult(breakdown.xMult);
          setTotal(breakdown.total);
          setCaption(null);
          // Roll the total up from Value × Length to the final number
          const from = Math.min(breakdown.total, Math.round(breakdown.chips * breakdown.mult));
          const rollMs = still ? 0 : 520 / speed;
          const start = performance.now();
          const roll = (now: number) => {
            const k = rollMs <= 0 ? 1 : Math.min(1, (now - start) / rollMs);
            setShownTotal(Math.round(from + (breakdown.total - from) * (1 - Math.pow(1 - k, 3))));
            if (k < 1) requestAnimationFrame(roll);
          };
          requestAnimationFrame(roll);
          soundEngine.playTallyTotal(target > 0 ? breakdown.total / target : 0.3);
          if (tierLevel > 0) window.setTimeout(() => soundEngine.playLineFanfare(tierLevel), 120);
          const lvl = fireLevel(breakdown.total, target);
          if (lvl >= 2) window.setTimeout(() => soundEngine.playMultiplierSparkle(lvl + 1), 160);
          // Five times over and more: the phone feels it
          if (lvl >= 3) soundEngine.vibrate(lvl >= 5 ? [40, 30, 60, 30, 90] : lvl >= 4 ? [40, 30, 70] : 45);
          // A new best line ever (real Runs only)
          if (recordBest && breakdown.total > 0) {
            const best = loadBestLine();
            if (breakdown.total > best) {
              saveBestLine(breakdown.total);
              if (best > 0) {
                setBestLine(true);
                window.setTimeout(() => soundEngine.playSetComplete(), 380);
              }
            }
          }
        }
      }, ev.at)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
    // The show plays once per line
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fire = total !== null ? fireLevel(total, target) : 0;
  const pop = (box: "value" | "length" | "x") =>
    pulse?.box === box ? { scale: [1.22, 1], transition: { duration: 0.22 } } : { scale: 1 };

  return artify(
    <motion.div
      initial={{ opacity: 0 }}
      // Five times over and more, the card thumps (harder for ×10 and ×100); it only
      // grows, so nothing behind it ever shows
      animate={
        total !== null && !still && fire >= 3
          ? { opacity: 1, scale: fire >= 5 ? [1, 1.12, 1.02, 1.07, 1] : fire >= 4 ? [1, 1.08, 1.01, 1.04, 1] : [1, 1.05, 1] }
          : { opacity: 1, scale: 1 }
      }
      exit={{ opacity: 0 }}
      transition={{ duration: total !== null && fire >= 3 ? 0.5 : 0.15 }}
      onClick={onSkip}
      role="status"
      aria-label={`Line score ${breakdown.total.toLocaleString()}`}
      className={`absolute inset-0 z-40 overflow-hidden rounded-xl border bg-[#1A271E] px-3 pt-3 flex flex-col justify-center cursor-pointer transition-[box-shadow,border-color] duration-500 ${
        fire > 0 ? "border-amber-300/70" : "border-amber-300/30"
      }`}
      style={fire > 0 ? { boxShadow: `inset 0 0 18px rgba(252,211,77,${0.06 * fire}), ${FIRE_GLOW[fire]}` } : undefined}
    >
      {fire > 0 && <Petals level={fire} />}
      {/* The relics scoring this line: each lights up (with a count) as it fires */}
      {relicRow.length > 0 && (
        <div className="pointer-events-none absolute top-1 right-2 flex items-center gap-1" aria-hidden="true">
          {relicRow.map((id) => {
            const n = hits[id] ?? 0;
            return (
              <motion.span
                key={`${id}-${n}`}
                initial={n > 0 ? { scale: 1.6 } : false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 14 }}
                className={`relative ${n > 0 ? "" : "opacity-30 grayscale"}`}
              >
                <RelicIcon id={id} size={15} />
                {n > 1 && (
                  <span className="absolute -bottom-1 -right-1.5 rounded-full bg-amber-300 px-[3px] text-[8px] font-black leading-[11px] text-slate-950">×{n}</span>
                )}
              </motion.span>
            );
          })}
        </div>
      )}
      {total !== null && tierLevel > 0 && !still && <LengthBurst level={tierLevel} color={tierColor ?? "#FCD34D"} />}
      {/* Bottom-aligned, so × sits on the numbers' line, not between label and number */}
      <div className="flex items-end gap-1.5 min-w-0">
        <div className="flex flex-col items-center min-w-[40px]">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-300/80">Value</span>
          <motion.span key={`v${pulse?.box === "value" ? pulse.key : 0}`} animate={pop("value")} className="text-[22px] font-display font-semibold tabular-nums leading-none text-sky-100">
            {fmt(value)}
          </motion.span>
        </div>
        <span className="pb-[3px] text-[15px] leading-none text-white/35 font-black">×</span>
        <div className="flex flex-col items-center min-w-[36px]">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">Length</span>
          <motion.span key={`l${pulse?.box === "length" ? pulse.key : 0}`} animate={pop("length")} className="text-[22px] font-display font-semibold tabular-nums leading-none text-emerald-100">
            {fmt(length)}
          </motion.span>
        </div>
        {xMult !== 1 && (
          // A column like Value and Length: label on top, the number the same size and on the same line
          <>
            <span className="pb-[3px] text-[15px] leading-none text-white/35 font-black">×</span>
            <div className="flex flex-col items-center min-w-[36px]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-fuchsia-300/80">Bonus</span>
              <motion.span
                key={`x${pulse?.box === "x" ? pulse.key : 0}`}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                className="whitespace-nowrap text-[22px] font-display font-semibold tabular-nums leading-none text-fuchsia-100"
              >
                {Math.round(xMult * 100) / 100}
              </motion.span>
            </div>
          </>
        )}
        <div className="flex-1" />
        <AnimatePresence>
          {total !== null && (
            <motion.span
              initial={{ scale: 1.7 + tierLevel * 0.25, opacity: 0, y: -4 }}
              animate={
                still
                  ? { scale: 1, opacity: 1, y: 0 }
                  : {
                      scale: [1.7 + tierLevel * 0.25, 0.92, 1],
                      opacity: 1,
                      y: 0,
                      // Blossom and Grand garden lines give the card a little shake
                      x: tierLevel >= 3 ? [0, -3, 3, -2, 2, 0] : 0,
                    }
              }
              transition={{ duration: 0.45 + tierLevel * 0.08 }}
              className={`shrink-0 whitespace-nowrap ${tierLevel >= 3 ? "text-[32px]" : "text-[28px]"} font-display font-semibold tabular-nums leading-none text-amber-200`}
              style={fire > 0 ? { textShadow: FIRE_GLOW[fire] } : undefined}
            >
              {fmt(shownTotal || total)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-1.5 h-[16px] flex items-center gap-1.5 text-[11.5px] font-semibold overflow-hidden whitespace-nowrap">
        {/* One caption at a time: the old one leaves before the next comes in */}
        <AnimatePresence mode="wait">
          {caption ? (
            <motion.span
              key={caption.key}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0, transition: { duration: 0.07 } }}
              transition={{ duration: 0.12 }}
              className={`flex items-center gap-1.5 ${caption.tone}`}
              style={caption.color ? { color: caption.color } : undefined}
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
              {bestLine && <span className="font-black text-fuchsia-200">✨ Best line ever! </span>}
              {fire > 0 && <span className="font-black text-amber-200">{FIRE_NAMES[fire]} </span>}
              {/* The sum only when there's nothing to celebrate (the numbers are on screen anyway) */}
              {!bestLine && fire === 0 && (
                <>
                  {fmt(breakdown.chips)} × {fmt(breakdown.mult)}
                  {breakdown.xMult !== 1 ? ` × ${Math.round(breakdown.xMult * 100) / 100}` : ""} = {fmt(breakdown.total)}
                </>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
