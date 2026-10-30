"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ASCENSION_LEVELS } from "@/lib/runReplay";

/** Choose the difficulty of a new Garden Run (each level adds to the ones below) */
export default function AscensionPicker({
  isOpen,
  unlocked,
  initial,
  onStart,
  onClose,
}: {
  isOpen: boolean;
  /** Highest level unlocked on this device */
  unlocked: number;
  initial: number;
  onStart: (level: number) => void;
  onClose: () => void;
}) {
  const [level, setLevel] = useState(initial);
  useEffect(() => {
    if (isOpen) setLevel(Math.min(initial, unlocked));
  }, [isOpen, initial, unlocked]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="New Garden Run"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] max-h-[88dvh] overflow-y-auto rounded-2xl bg-[#151B2E] border border-white/[0.08] p-3 space-y-3 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold">New Garden Run</div>
            <div className="text-[11.5px] text-white/55">Pick a difficulty. Each level keeps the ones below it.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.06] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="space-y-1.5">
          {ASCENSION_LEVELS.map((l) => {
            const locked = l.level > unlocked;
            const selected = l.level === level;
            return (
              <button
                key={l.level}
                type="button"
                disabled={locked}
                aria-pressed={selected}
                onClick={() => setLevel(l.level)}
                className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-3 transition active:scale-[0.98] ${
                  selected
                    ? "border-amber-300 bg-amber-400/15"
                    : locked
                    ? "border-white/[0.06] bg-black/20 opacity-55"
                    : "border-white/15 bg-white/[0.04]"
                }`}
              >
                <span className="text-[20px] w-7 text-center" aria-hidden="true">{l.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold">
                    {l.level === 0 ? "Normal" : `Ascension ${l.level}`}
                  </span>
                  <span className="block text-[11.5px] text-white/60 leading-snug">
                    {locked ? `🔒 Clear the Season 3 Boss on Ascension ${l.level - 1}` : l.adds}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onStart(level)}
          className="w-full rounded-xl py-3 font-bold text-[14px] bg-teal-300 text-slate-950 active:scale-95"
        >
          Start {level === 0 ? "a Garden Run" : `Ascension ${level}`} →
        </button>
      </div>
    </div>
  );
}
