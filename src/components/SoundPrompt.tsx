"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music } from "lucide-react";

const ASKED_KEY = "ost_sound_asked_v1";

/**
 * Asks once, gently, whether to play with sound and music. Sound starts off
 * (no surprise noise), so without this most players would never hear it.
 * Skipped for anyone who already chose in the menu. Waits for `ready` (after
 * the first lesson) so it never covers a new player's first steps.
 */
export default function SoundPrompt({ ready, onChoose }: { ready: boolean; onChoose: (on: boolean) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    try {
      const ls = window.localStorage;
      const decided =
        ls.getItem(ASKED_KEY) !== null ||
        ls.getItem("ost_sound_enabled") !== null ||
        ls.getItem("ost_music_enabled") !== null;
      if (decided) return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, [ready]);

  const choose = (on: boolean) => {
    try {
      window.localStorage.setItem(ASKED_KEY, on ? "on" : "off");
    } catch {
      // Ignore storage errors
    }
    setOpen(false);
    onChoose(on);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Play with sound?"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] mx-auto max-w-[400px] rounded-2xl border border-lime-200/25 bg-[#1B281F]/95 backdrop-blur px-4 py-3 shadow-2xl text-white"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-lime-300/15 border border-lime-200/30 flex items-center justify-center">
              <Music className="h-5 w-5 text-lime-200" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold leading-tight">Play with sound?</div>
              <div className="text-[12.5px] text-white/65 leading-snug mt-0.5">
                Calm garden music and soft sounds as your line grows. You can change it any time in ☰.
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => choose(false)}
              className="h-11 rounded-xl border border-white/15 bg-white/[0.04] text-[14px] font-semibold text-white/80 active:scale-95 transition"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => choose(true)}
              className="h-11 rounded-xl bg-lime-300 text-slate-950 text-[14px] font-bold active:scale-95 transition"
            >
              Turn on
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
