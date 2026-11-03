"use client";

import React, { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Tip } from "@/lib/tips";

/** How long a tip stays before it closes by itself */
const TIP_MS = 3200;

/**
 * A short card between beds: a picture, "Game tip" or "Gardening tip", and one
 * line in handwriting. It closes by itself (a thin bar shows the time left) or
 * on a tap anywhere.
 */
export default function TipCard({ tip, onDone }: { tip: Tip; onDone: () => void }) {
  const still = useReducedMotion();

  useEffect(() => {
    const id = window.setTimeout(onDone, TIP_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <motion.button
      type="button"
      aria-label={`${tip.label ?? (tip.kind === "GAME" ? "Game tip" : "Gardening tip")}: ${tip.text} Tap to continue`}
      onClick={onDone}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ui-zoom fixed inset-0 z-[66] flex items-center justify-center bg-black/55 p-6 cursor-pointer select-none"
    >
      <motion.div
        initial={{ y: 16, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#1B281F] px-5 pt-5 pb-6 text-center text-white shadow-2xl"
      >
        <motion.img
          src={tip.art}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="mx-auto h-[72px] w-[72px] object-contain drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)]"
          animate={still ? undefined : { rotate: [-4, 4, -4], y: [0, -3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className={`mt-2 text-[13px] font-semibold ${tip.kind === "GAME" ? "text-amber-200/90" : "text-lime-200/90"}`}>
          {tip.label ?? (tip.kind === "GAME" ? "Game tip" : "Gardening tip")}
        </div>
        <p className="mt-1 font-hand text-[18px] leading-snug text-white/90">{tip.text}</p>
        <div className="mt-3 text-[12px] text-white/45">Tap to continue</div>
        {/* Time left */}
        <motion.span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-1 bg-amber-300/70"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: TIP_MS / 1000, ease: "linear" }}
        />
      </motion.div>
    </motion.button>
  );
}
