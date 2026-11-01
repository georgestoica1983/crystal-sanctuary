"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { loadReduceMotion } from "@/lib/motionPrefs";

const INTRO_DAY_KEY = "ost_intro_day_v1";

const today = () => new Date().toISOString().slice(0, 10);

/** The full intro plays on the first launch of each day; later launches get a quick fade */
function fullIntroDue(): boolean {
  try {
    return window.localStorage.getItem(INTRO_DAY_KEY) !== today();
  } catch {
    return false;
  }
}

/** A long, wandering line that ends just under the slogan, where it blooms (viewBox 0 0 390 844) */
const WANDER = "M 24 806 C 140 800, 350 790, 340 726 S 50 690, 60 632 S 195 620, 195 566";
const BLOOM_AT = { x: 195, y: 566 };

/**
 * Opening card: a golden line takes the long way across the screen, then
 * "Bloomline" and the slogan appear. At most 2.5 seconds; a tap skips it.
 * It sits on top of the game, so a saved Run is already restored underneath.
 */
export default function IntroSplash() {
  const [mode] = useState<"full" | "still" | "quick">(() =>
    !fullIntroDue() ? "quick" : loadReduceMotion() ? "still" : "full",
  );
  // shown → fading (taps already pass through to the game) → gone
  const [stage, setStage] = useState<"shown" | "fading" | "gone">("shown");
  const close = () => setStage((s) => (s === "shown" ? "fading" : s));

  useEffect(() => {
    try {
      window.localStorage.setItem(INTRO_DAY_KEY, today());
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    const ms = mode === "quick" ? 250 : 2500;
    const id = window.setTimeout(close, ms);
    return () => window.clearTimeout(id);
  }, [mode]);

  if (stage === "gone") return null;
  return (
    <motion.button
      type="button"
      aria-label="Bloomline. Go long. Bloom big. Tap to start"
      onClick={close}
      initial={false}
      animate={{ opacity: stage === "fading" ? 0 : 1 }}
      transition={{ duration: mode === "quick" ? 0.35 : 0.5 }}
      onAnimationComplete={() => stage === "fading" && setStage("gone")}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#16231a] text-white cursor-pointer select-none ${
        stage === "fading" ? "pointer-events-none" : ""
      }`}
    >
      {mode !== "quick" && (
        <>
          <svg
            viewBox="0 0 390 844"
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <motion.path
              d={WANDER}
              fill="none"
              stroke="#e9cf7e"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: mode === "still" ? 1 : 0, opacity: 0.9 }}
              animate={{ pathLength: 1, opacity: 0.55 }}
              transition={
                mode === "still"
                  ? { duration: 0 }
                  : { pathLength: { duration: 1.1, ease: "easeInOut" }, opacity: { delay: 1.1, duration: 0.6 } }
              }
            />
            {/* The line's end blooms */}
            <motion.circle
              cx={BLOOM_AT.x}
              cy={BLOOM_AT.y}
              r="9"
              fill="#e9cf7e"
              initial={{ scale: mode === "still" ? 1 : 0 }}
              animate={{ scale: [null, 1.5, 1] }}
              transition={mode === "still" ? { duration: 0 } : { delay: 1.05, duration: 0.45 }}
              style={{ transformOrigin: `${BLOOM_AT.x}px ${BLOOM_AT.y}px` }}
            />
          </svg>
          <motion.h1
            initial={{ opacity: mode === "still" ? 1 : 0, y: mode === "still" ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: mode === "still" ? 0 : 0.9, duration: 0.5 }}
            className="relative -mt-16 font-display text-[clamp(44px,13vw,64px)] font-bold leading-none tracking-tight"
          >
            Bloomline
          </motion.h1>
          <motion.p
            initial={{ opacity: mode === "still" ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: mode === "still" ? 0 : 1.4, duration: 0.5 }}
            className="relative mt-3 text-[clamp(18px,5vw,24px)] font-semibold text-amber-200"
          >
            Go long. Bloom big.
          </motion.p>
        </>
      )}
    </motion.button>
  );
}
