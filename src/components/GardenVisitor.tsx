"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { soundEngine } from "@/lib/audio";
import { visitorArt } from "@/lib/art";

export type VisitorKind = "ladybug" | "bee" | "butterfly" | "snail";
export const VISITOR_KINDS: VisitorKind[] = ["ladybug", "bee", "butterfly", "snail"];
export const VISITOR_NAMES: Record<VisitorKind, string> = {
  ladybug: "Ladybug",
  bee: "Bumblebee",
  butterfly: "Butterfly",
  snail: "Snail",
};

/** How each visitor moves: walkers stay low and slow, fliers drift and bob */
const MOTION: Record<VisitorKind, { seconds: number; bob: number; flier: boolean }> = {
  ladybug: { seconds: 22, bob: 2, flier: false },
  snail: { seconds: 40, bob: 0, flier: false },
  bee: { seconds: 14, bob: 10, flier: true },
  butterfly: { seconds: 18, bob: 14, flier: true },
};

/**
 * A small visitor wandering across the board or the garden. It never blocks
 * play (only the creature itself takes a tap): a tap gives a soft chime and it
 * flies away. Looks only — it never gives points or Seeds.
 */
export default function GardenVisitor({
  kind,
  size = 30,
  row = 0.5,
  onMet,
  onDone,
}: {
  kind: VisitorKind;
  size?: number;
  /** How far down the area it travels (0 top – 1 bottom) */
  row?: number;
  onMet?: (kind: VisitorKind) => void;
  onDone?: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const m = MOTION[kind];
  // Half the time it walks right-to-left (mirrored, the art faces right)
  const fromLeft = useMemo(() => Math.random() < 0.5, []);
  const start = fromLeft ? "-12%" : "104%";
  const end = fromLeft ? "104%" : "-12%";

  const tap = () => {
    if (leaving) return;
    setLeaving(true);
    soundEngine.playStarLand(2);
    onMet?.(kind);
  };

  return (
    <motion.button
      type="button"
      aria-label={`A ${VISITOR_NAMES[kind].toLowerCase()} is visiting. Tap to say hello`}
      onClick={tap}
      initial={{ left: start, opacity: 0 }}
      animate={
        leaving
          ? { top: "-20%", opacity: 0, rotate: fromLeft ? -20 : 20, transition: { duration: 1.2, ease: "easeIn" } }
          : {
              left: end,
              opacity: [0, 1, 1, 1, 0],
              y: m.bob ? [0, -m.bob, 0, m.bob * 0.6, 0] : 0,
              transition: {
                left: { duration: m.seconds, ease: "linear" },
                opacity: { duration: m.seconds, times: [0, 0.06, 0.5, 0.94, 1] },
                y: { duration: m.seconds / 4, repeat: 3, ease: "easeInOut" },
              },
            }
      }
      onAnimationComplete={() => onDone?.()}
      className="pointer-events-auto absolute z-[38] p-1"
      style={{ top: `${row * 100}%` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={visitorArt(kind)}
        alt=""
        draggable={false}
        className={`object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] ${m.flier ? "visitor-flutter" : ""}`}
        style={{ width: size, height: size, transform: fromLeft ? undefined : "scaleX(-1)" }}
      />
    </motion.button>
  );
}
