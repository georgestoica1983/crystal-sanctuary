"use client";

import Badge from "@/components/Badge";
import BossIcon from "@/components/BossIcon";
import React, { useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BossRuleId, RelicId } from "@/types/game";
import { BOSS_RULE_REGISTRY, RELIC_REGISTRY } from "@/lib/engine";
import { tileArt } from "@/lib/art";
import RelicIcon from "@/components/RelicIcon";

type Effect = "fall" | "rise" | "mist" | "eclipse" | "tilt" | "close" | "stretch" | "hop";

/** Each Boss's colour and the small motion that fits it */
export const BOSS_LOOK: Record<BossRuleId, { color: string; effect: Effect; bit?: string; art?: string }> = {
  THISTLE_KING: { color: "#94A3B8", effect: "fall", art: tileArt("TRAP") ?? undefined },
  BRIAR_QUEEN: { color: "#F43F5E", effect: "fall", art: tileArt("ENEMY") ?? undefined },
  DROUGHT: { color: "#D97706", effect: "rise", bit: "·" },
  ECLIPSE: { color: "#818CF8", effect: "eclipse" },
  FROST: { color: "#7DD3FC", effect: "fall", bit: "❄" },
  ACORN_THIEF: { color: "#B45309", effect: "hop", art: tileArt("GOLD") ?? undefined },
  SPIKE_BLOOM: { color: "#65A30D", effect: "rise", art: tileArt("TRAP") ?? undefined },
  EVEN_GARDEN: { color: "#14B8A6", effect: "tilt" },
  NARROW_PATH: { color: "#F97316", effect: "close" },
  LONG_ROAD: { color: "#A3E635", effect: "stretch" },
  FOG: { color: "#CBD5E1", effect: "mist" },
  TOLL: { color: "#EAB308", effect: "fall", bit: "🪙" },
};

/** The moving layer behind the Boss's name */
function EffectLayer({ id }: { id: BossRuleId }) {
  const look = BOSS_LOOK[id];
  const bits = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 5) * 0.18, s: 0.7 + (i % 3) * 0.25 })), []);
  const piece = (size: number) =>
    look.art ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={look.art} alt="" draggable={false} style={{ width: size, height: size }} className="object-contain opacity-80" />
    ) : (
      <span style={{ fontSize: size * 0.8, color: look.color }}>{look.bit ?? "•"}</span>
    );
  switch (look.effect) {
    case "fall":
    case "rise":
      return (
        <>
          {bits.map((b, i) => (
            <motion.span
              key={i}
              className="absolute"
              style={{ left: `${b.x}%`, top: look.effect === "fall" ? "-8%" : "104%" }}
              animate={{ y: look.effect === "fall" ? ["0vh", "112vh"] : ["0vh", "-112vh"], rotate: [0, 160] }}
              transition={{ duration: 2.6 / b.s, delay: b.d, ease: "easeIn", repeat: Infinity }}
            >
              {piece(22 * b.s)}
            </motion.span>
          ))}
        </>
      );
    case "hop":
      return (
        <>
          {bits.slice(0, 6).map((b, i) => (
            <motion.span
              key={i}
              className="absolute"
              style={{ top: `${58 + (i % 3) * 8}%`, left: "-10%" }}
              animate={{ x: ["0vw", "120vw"], y: [0, -24, 0, -18, 0, -12, 0] }}
              transition={{ duration: 2.4, delay: i * 0.25, ease: "linear", repeat: Infinity }}
            >
              {piece(26)}
            </motion.span>
          ))}
        </>
      );
    case "mist":
      return (
        <>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute rounded-full blur-2xl"
              style={{ width: 260, height: 120, top: `${18 + i * 18}%`, left: "-40%", background: "rgba(203,213,225,0.18)" }}
              animate={{ x: ["0vw", "140vw"] }}
              transition={{ duration: 4 + i, delay: i * 0.3, ease: "linear", repeat: Infinity }}
            />
          ))}
        </>
      );
    case "eclipse":
      return (
        <motion.span
          className="absolute left-1/2 top-[30%] h-40 w-40 -translate-x-1/2 rounded-full bg-[#0b1020] shadow-[0_0_60px_20px_rgba(129,140,248,0.35)]"
          initial={{ x: "-160%" }}
          animate={{ x: "-50%" }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      );
    case "tilt":
      return (
        <motion.span
          className="absolute left-1/2 top-[30%] h-1.5 w-56 -translate-x-1/2 rounded-full"
          style={{ background: look.color }}
          animate={{ rotate: [-12, 12, -6, 6, 0] }}
          transition={{ duration: 2.4, ease: "easeInOut" }}
        />
      );
    case "close":
      return (
        <>
          {[-1, 1].map((side) => (
            <motion.span
              key={side}
              className="absolute top-0 bottom-0 w-1/3"
              style={{ [side < 0 ? "left" : "right"]: 0, background: `linear-gradient(${side < 0 ? 90 : 270}deg, ${look.color}33, transparent)` }}
              initial={{ x: side < 0 ? "-100%" : "100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          ))}
        </>
      );
    case "stretch":
      return (
        <motion.span
          className="absolute left-[8%] top-[72%] h-1.5 rounded-full"
          style={{ background: look.color }}
          initial={{ width: "0%" }}
          animate={{ width: "84%" }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
      );
  }
}

/**
 * A Boss bed arrives: its icon grows in, its name and rule appear over its own
 * small motion. About 3 seconds, a tap skips. "preview" (tapped from the Season
 * dots) stays until tapped and has no motion.
 */
export function BossIntro({ id, preview = false, onDone }: { id: BossRuleId; preview?: boolean; onDone: () => void }) {
  const boss = BOSS_RULE_REGISTRY[id];
  const look = BOSS_LOOK[id];
  const still = useReducedMotion() || preview;
  useEffect(() => {
    if (preview) return;
    const t = window.setTimeout(onDone, 3400);
    return () => window.clearTimeout(t);
  }, [preview, onDone]);

  return (
    <motion.button
      type="button"
      onClick={onDone}
      aria-label={`Boss: ${boss.name}. ${boss.description} Tap to continue`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ui-zoom fixed inset-0 z-[68] overflow-hidden flex flex-col items-center justify-center px-6 text-center text-white cursor-pointer select-none"
      style={{ background: `radial-gradient(ellipse at 50% 40%, ${look.color}33 0%, #101813 70%)` }}
    >
      {!still && <EffectLayer id={id} />}
      <motion.div
        initial={still ? false : { scale: 0.2, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        className="relative drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
        aria-hidden="true"
      >
        <BossIcon id={id} size={150} />
      </motion.div>
      <motion.div
        initial={still ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: still ? 0 : 0.6 }}
        className="relative mt-4"
      >
        <div className="text-[14px] font-semibold uppercase tracking-[0.18em]" style={{ color: look.color }}>
          Boss bed
        </div>
        <div className="mt-1 font-display text-[32px] font-bold leading-tight">{boss.name}</div>
        <div className="mx-auto mt-2 max-w-[320px] text-[17px] leading-snug text-white/85">{boss.description}</div>
        <div className="mt-3 text-[15px] font-semibold text-amber-200"><Badge id="crown" /> Beat it for a Legendary relic</div>
        <div className="mt-6 text-[13px] text-white/45">{preview ? "Tap to close" : "Tap to begin"}</div>
      </motion.div>
    </motion.button>
  );
}

/** The Boss bed bloomed: the Boss's icon bursts into petals, the Legendary relic appears */
export function BossBeaten({ id, legendary, onDone }: { id: BossRuleId; legendary: RelicId | null; onDone: () => void }) {
  const boss = BOSS_RULE_REGISTRY[id];
  const look = BOSS_LOOK[id];
  const still = useReducedMotion();
  const petals = useMemo(() => Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2), []);
  useEffect(() => {
    const t = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(t);
  }, [onDone]);
  const relic = legendary ? RELIC_REGISTRY[legendary] : null;

  return (
    <motion.button
      type="button"
      onClick={onDone}
      aria-label={`${boss.name} beaten. Tap to continue`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ui-zoom fixed inset-0 z-[68] flex flex-col items-center justify-center bg-[#101813]/95 px-6 text-center text-white cursor-pointer select-none"
    >
      <div className="relative h-28 w-28">
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-[80px] leading-none"
          initial={{ scale: 1, opacity: 1 }}
          animate={still ? { opacity: 0.3 } : { scale: [1, 1.25, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 0.9, times: [0, 0.4, 1] }}
          aria-hidden="true"
        >
          <BossIcon id={id} size={104} />
        </motion.div>
        {!still &&
          petals.map((a, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-3 w-2 rounded-[60%_40%_60%_40%]"
              style={{ background: i % 2 ? "#FDA4AF" : look.color }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ x: Math.cos(a) * 110, y: Math.sin(a) * 110, opacity: [0, 1, 0], rotate: 220 }}
              transition={{ delay: 0.55, duration: 1.2, ease: "easeOut" }}
            />
          ))}
        {relic && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: still ? 0 : 0.9, type: "spring", stiffness: 220, damping: 12 }}
          >
            <RelicIcon id={relic.id} size={96} />
          </motion.div>
        )}
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: still ? 0 : 0.8 }}>
        <div className="mt-4 font-display text-[30px] font-bold leading-tight">{boss.name} is beaten!</div>
        {relic && (
          <div className="mt-2 text-[17px] text-amber-200">
            <Badge id="crown" /> Legendary relic: <b>{relic.name}</b>
          </div>
        )}
        <div className="mt-6 text-[13px] text-white/45">Tap to continue</div>
      </motion.div>
    </motion.button>
  );
}
