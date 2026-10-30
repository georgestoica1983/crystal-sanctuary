"use client";

import React, { useMemo } from "react";
import { X } from "lucide-react";
import { CosmeticPreferences } from "@/types/game";
import { TRAIL_SKINS } from "@/lib/engine";
import { getGardenerRank, isUnlocked, loadUnlockProgress, UNLOCKS } from "@/lib/unlocks";

/** Pick a companion and line colour earned by playing (looks only) */
export default function LooksModal({
  isOpen,
  cosmetics,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  cosmetics: CosmeticPreferences;
  onSelect: (next: CosmeticPreferences) => void;
  onClose: () => void;
}) {
  // Re-read progress each time the screen opens
  const progress = useMemo(() => (isOpen ? loadUnlockProgress() : null), [isOpen]);
  if (!isOpen || !progress) return null;
  const { rank, next } = getGardenerRank(progress);
  const companions = UNLOCKS.filter((u) => u.kind === "COMPANION");
  const trails = UNLOCKS.filter((u) => u.kind === "TRAIL");
  const currentCompanion = cosmetics.companionId ?? "CAT";

  const tile = (selected: boolean, unlocked: boolean) =>
    `relative rounded-xl border-2 p-2 flex flex-col items-center gap-1 text-center min-h-[92px] transition active:scale-95 ${
      selected
        ? "border-amber-300 bg-amber-400/15"
        : unlocked
        ? "border-white/15 bg-white/[0.04]"
        : "border-white/[0.06] bg-black/20 opacity-60"
    }`;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Looks"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] max-h-[88dvh] overflow-y-auto rounded-2xl bg-[#121A2E] border border-white/[0.08] p-3 space-y-3 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold">Looks</div>
            <div className="text-[11.5px] text-white/55">Earned by playing. Looks only — same rules for everyone.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close looks"
            className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.06] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="rounded-xl bg-amber-400/[0.07] border border-amber-300/20 px-3 py-2 text-[12.5px]">
          <span className="font-bold text-amber-100">
            {rank.icon} {rank.name}
          </span>
          <span className="text-white/60"> · ⭐ {progress.stars}</span>
          {next && <div className="text-[11px] text-white/50 mt-0.5">Next: {next.icon} {next.name} — {next.needText}</div>}
        </div>

        <section>
          <div className="text-[12px] font-semibold text-white/60 mb-1.5">Companion</div>
          <div className="grid grid-cols-4 gap-1.5">
            {companions.map((u) => {
              if (u.kind !== "COMPANION") return null;
              const unlocked = isUnlocked(u, progress);
              const selected = currentCompanion === u.target;
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={selected}
                  onClick={() => onSelect({ ...cosmetics, companionId: u.target })}
                  className={tile(selected, unlocked)}
                >
                  <span className="text-[26px] leading-none">{u.icon}</span>
                  <span className="text-[10.5px] font-bold leading-tight">{u.name}</span>
                  {!unlocked && <span className="text-[9.5px] text-white/60 leading-tight">🔒 {u.needText}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="text-[12px] font-semibold text-white/60 mb-1.5">Line colour</div>
          <div className="grid grid-cols-4 gap-1.5">
            {trails.map((u) => {
              if (u.kind !== "TRAIL") return null;
              const unlocked = isUnlocked(u, progress);
              const selected = cosmetics.trailId === u.target;
              const color = TRAIL_SKINS.find((t) => t.id === u.target)?.primaryStroke ?? "#FFFFFF";
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={selected}
                  onClick={() => onSelect({ ...cosmetics, trailId: u.target })}
                  className={tile(selected, unlocked)}
                >
                  <span
                    className="mt-1 h-2 w-12 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                    aria-hidden="true"
                  />
                  <span className="text-[10.5px] font-bold leading-tight mt-1">{u.name.replace(" line", "")}</span>
                  {!unlocked && <span className="text-[9.5px] text-white/60 leading-tight">🔒 {u.needText}</span>}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
