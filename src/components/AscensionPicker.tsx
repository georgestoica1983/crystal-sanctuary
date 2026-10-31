"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { HeroClassId } from "@/types/game";
import { HERO_CLASS_REGISTRY } from "@/lib/engine";
import { ASCENSION_LEVELS } from "@/lib/runReplay";
import { companionUnlockFor, RUN_COMPANION_ORDER } from "@/lib/unlocks";

/** Each companion's rule in a Garden Run, in plain words */
export const COMPANION_RULES: Record<HeroClassId, string> = {
  KNIGHT: "+2 🧤 each bed · keeps half its spare Gloves",
  ROGUE: "Cross your own line once per bed · Thorns 2 softer from a diagonal",
  VAMPIRE: "🌰 heal +1 · cut Thorns heal +2 · no Gloves (they give ✂️)",
  MAGE: "Hop over one tile once per bed · 🍓 heal +2 more",
};

/** Starting stats line (a Run's Shears rule counts one starting cut) */
export function companionStartText(classId: HeroClassId): string {
  const def = HERO_CLASS_REGISTRY[classId];
  const parts = [`❤️ ${def.startingHp}`];
  if (def.startingShield > 0) parts.push(`🧤 ${def.startingShield}`);
  if (def.startingWeapon > 0) parts.push(`✂️ ${Math.min(1, def.startingWeapon)}`);
  return parts.join(" · ");
}

/** Choose the companion and difficulty of a new Garden Run */
export default function AscensionPicker({
  isOpen,
  unlocked,
  initial,
  companions,
  initialCompanion,
  onStart,
  onClose,
}: {
  isOpen: boolean;
  /** Highest Ascension level unlocked on this device */
  unlocked: number;
  initial: number;
  /** Companions earned on this device */
  companions: HeroClassId[];
  initialCompanion: HeroClassId;
  onStart: (level: number, companion: HeroClassId) => void;
  onClose: () => void;
}) {
  const [level, setLevel] = useState(initial);
  const [companion, setCompanion] = useState<HeroClassId>(initialCompanion);
  useEffect(() => {
    if (!isOpen) return;
    setLevel(Math.min(initial, unlocked));
    setCompanion(companions.includes(initialCompanion) ? initialCompanion : "KNIGHT");
  }, [isOpen, initial, unlocked, initialCompanion, companions]);
  if (!isOpen) return null;
  const pickedDef = HERO_CLASS_REGISTRY[companion];

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
            <div className="text-[11.5px] text-white/55">Pick a companion — each one plays differently.</div>
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

        <div className="grid grid-cols-2 gap-1.5">
          {RUN_COMPANION_ORDER.map((id) => {
            const def = HERO_CLASS_REGISTRY[id];
            const locked = !companions.includes(id);
            const selected = id === companion;
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                aria-pressed={selected}
                onClick={() => setCompanion(id)}
                className={`text-left rounded-xl border px-2.5 py-2 transition active:scale-[0.98] ${
                  selected
                    ? "border-amber-300 bg-amber-400/15"
                    : locked
                    ? "border-white/[0.06] bg-black/20 opacity-55"
                    : "border-white/15 bg-white/[0.04]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[22px] leading-none" aria-hidden="true">{def.sanctuaryEmblem ?? def.emblem}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold leading-tight">{def.sanctuaryShortName ?? def.shortName}</span>
                    <span className="block text-[10.5px] text-white/55 font-mono">{companionStartText(id)}</span>
                  </span>
                </span>
                <span className="block mt-1 text-[11px] leading-snug text-white/70">
                  {locked ? `🔒 ${companionUnlockFor(id).needText}` : COMPANION_RULES[id]}
                </span>
              </button>
            );
          })}
        </div>

        {unlocked === 0 ? (
          <div className="text-[11px] text-white/45">🔒 Harder Ascension levels: clear the Season 3 Boss.</div>
        ) : (
        <div className="space-y-1.5">
          <div className="text-[12px] font-semibold text-white/60">Difficulty · each level keeps the ones below it</div>
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
        )}

        <button
          type="button"
          onClick={() => onStart(level, companion)}
          className="w-full rounded-xl py-3 font-bold text-[14px] bg-teal-300 text-slate-950 active:scale-95"
        >
          Start with {pickedDef.sanctuaryEmblem ?? pickedDef.emblem} {pickedDef.sanctuaryShortName ?? pickedDef.shortName}
          {level > 0 ? ` · Ascension ${level}` : ""} →
        </button>
      </div>
    </div>
  );
}
