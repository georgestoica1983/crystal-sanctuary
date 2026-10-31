"use client";

import React, { useMemo } from "react";
import { X } from "lucide-react";
import { CosmeticPreferences } from "@/types/game";
import { TRAIL_SKINS } from "@/lib/engine";
import {
  companionUnlockFor,
  getGardenerRank,
  isCompanionUnlocked,
  isUnlocked,
  loadChosenCompanion,
  loadUnlockProgress,
  RUN_COMPANION_ORDER,
  UNLOCKS,
} from "@/lib/unlocks";
import { loadBestClearedAscension } from "@/lib/ascension";
import { HERO_CLASS_REGISTRY } from "@/lib/engine";
import { COMPANION_RULES, companionStartText } from "@/components/AscensionPicker";
import { getBoardTheme } from "@/lib/boardThemes";
import EntityIcon from "@/components/EntityIcon";

/** Companions (each plays differently) and line colours (looks only), earned by playing */
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
  const nextRunCompanion = loadChosenCompanion(cosmetics.companionId);
  const trails = UNLOCKS.filter((u) => u.kind === "TRAIL");
  const boards = UNLOCKS.filter((u) => u.kind === "BOARD");
  const currentBoard = cosmetics.boardThemeId ?? "SPRING";

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
        aria-label="Companions and looks"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] max-h-[88dvh] overflow-y-auto rounded-2xl bg-[#19271E] border border-white/[0.08] p-3 space-y-3 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold">Companions &amp; looks</div>
            <div className="text-[11.5px] text-white/55">
              Earned by playing. Line colours are looks only — companions change how you play.
            </div>
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
          {loadBestClearedAscension() > 0 && (
            <span className="text-orange-200"> · 🔥A{loadBestClearedAscension()}</span>
          )}
          {next && <div className="text-[11px] text-white/50 mt-0.5">Next: {next.icon} {next.name} — {next.needText}</div>}
        </div>

        <section>
          <div className="text-[12px] font-semibold text-white/60 mb-1.5">
            Companions · pick one when you start a Garden Run
          </div>
          <div className="space-y-1.5">
            {RUN_COMPANION_ORDER.map((id) => {
              const def = HERO_CLASS_REGISTRY[id];
              const unlocked = isCompanionUnlocked(id, progress);
              const isNext = id === nextRunCompanion;
              return (
                <div
                  key={id}
                  className={`rounded-xl border px-2.5 py-2 flex items-start gap-2.5 ${
                    unlocked ? "border-white/15 bg-white/[0.04]" : "border-white/[0.06] bg-black/20 opacity-60"
                  }`}
                >
                  <EntityIcon type="HERO" companionId={id} size={34} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5">
                      <span className="text-[13px] font-bold">{def.sanctuaryShortName ?? def.shortName}</span>
                      <span className="text-[10.5px] font-mono text-white/55">{companionStartText(id)}</span>
                      {isNext && unlocked && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-100">
                          Next run
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] leading-snug text-white/70">{COMPANION_RULES[id]}</div>
                    {!unlocked && (
                      <div className="text-[11px] text-white/60">🔒 {companionUnlockFor(id).needText}</div>
                    )}
                  </div>
                </div>
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

        <section>
          <div className="text-[12px] font-semibold text-white/60 mb-1.5">Board</div>
          <div className="grid grid-cols-3 gap-1.5">
            {boards.map((u) => {
              if (u.kind !== "BOARD") return null;
              const unlocked = isUnlocked(u, progress);
              const selected = currentBoard === u.target;
              const theme = getBoardTheme(u.target);
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={selected}
                  onClick={() => onSelect({ ...cosmetics, boardThemeId: u.target })}
                  className={tile(selected, unlocked)}
                >
                  <span
                    className="mt-0.5 grid grid-cols-3 gap-[3px] rounded-md p-[4px] border"
                    style={{ backgroundColor: theme.frame, borderColor: theme.border, boxShadow: theme.glow }}
                    aria-hidden="true"
                  >
                    {Array.from({ length: 6 }, (_, i) => (
                      <span
                        key={i}
                        className="h-3 w-3 rounded-[3px]"
                        style={{ backgroundImage: `linear-gradient(${theme.plateTop}, ${theme.plateBottom})` }}
                      />
                    ))}
                  </span>
                  <span className="text-[10.5px] font-bold leading-tight mt-0.5">
                    {u.icon} {u.name.replace(" board", "")}
                  </span>
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
