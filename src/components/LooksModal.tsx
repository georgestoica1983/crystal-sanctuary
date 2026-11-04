"use client";

import Badge from "@/components/Badge";
import { artify } from "@/components/ArtText";
import { motion } from "framer-motion";
import { useBackClose } from "@/lib/backClose";
import { DoneButton, GrabBar, sheetDrag } from "@/components/SheetBits";
import React, { useMemo, useState } from "react";
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
  shortNeedText,
  UNLOCKS,
} from "@/lib/unlocks";
import { loadBestClearedAscension } from "@/lib/ascension";
import { HERO_CLASS_REGISTRY } from "@/lib/engine";
import { COMPANION_RULES, companionStartText } from "@/components/AscensionPicker";
import EntityIcon from "@/components/EntityIcon";
import UnlockIcon from "@/components/UnlockIcon";

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
  const [tab, setTab] = useState<"COMPANIONS" | "LINE" | "BOARD">("COMPANIONS");
  useBackClose(isOpen, onClose);
  if (!isOpen || !progress) return null;
  const { rank } = getGardenerRank(progress);
  const nextRunCompanion = loadChosenCompanion(cosmetics.companionId);
  const trails = UNLOCKS.filter((u) => u.kind === "TRAIL");
  const boards = UNLOCKS.filter((u) => u.kind === "BOARD");
  const currentBoard = cosmetics.boardThemeId ?? "SPRING";

  const tile = (selected: boolean, unlocked: boolean) =>
    `relative rounded-xl border-2 p-2 flex flex-col items-center gap-1 text-center min-h-[80px] transition active:scale-95 ${
      selected
        ? "border-amber-300 bg-amber-400/15"
        : unlocked
        ? "border-white/15 bg-white/[0.04]"
        : "border-white/[0.06] bg-black/20 opacity-60"
    }`;

  return artify(
    <div className="ui-zoom fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label="Companions and looks"
        onClick={(e) => e.stopPropagation()}
        {...sheetDrag(onClose)}
        className="w-full max-w-[430px] max-h-[calc(94dvh/var(--ui-zoom,1))] overflow-y-auto overscroll-contain rounded-2xl bg-[#19271E] border border-white/[0.08] px-3 pt-2 pb-3 space-y-2 text-white"
      >
        <GrabBar />
        {/* Title and your rank in one row */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[16px] font-bold">Companions &amp; looks</div>
          <div className="min-w-0 truncate text-[14px] text-amber-100">
            <UnlockIcon item={rank} /> {rank.name} · <Badge id="star" /> {progress.stars}
            {loadBestClearedAscension() > 0 && <span className="text-orange-200"> · <Badge id="flame" />A{loadBestClearedAscension()}</span>}
          </div>
        </div>

        {/* One section at a time, so the sheet fits on a phone */}
        <div className="flex rounded-xl bg-black/25 p-1" role="tablist" aria-label="Looks sections">
          {(
            [
              ["COMPANIONS", "Companions"],
              ["LINE", "Line colour"],
              ["BOARD", "Board"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`flex-1 h-9 rounded-lg text-[14px] font-bold transition ${tab === k ? "bg-white/[0.12] text-white" : "text-white/55"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* All three sections share one grid cell: the sheet keeps the tallest
            one's height, so switching tabs never makes it jump */}
        <div className="grid [&>*]:[grid-area:1/1]">
        <section className={tab === "COMPANIONS" ? "" : "invisible"} aria-hidden={tab !== "COMPANIONS"}>
          <div className="text-[12px] font-semibold text-white/60 mb-1.5">
            Pick one when you start a Run
          </div>
          <div className="space-y-1">
            {RUN_COMPANION_ORDER.map((id) => {
              const def = HERO_CLASS_REGISTRY[id];
              const unlocked = isCompanionUnlocked(id, progress);
              const isNext = id === nextRunCompanion;
              return (
                <div
                  key={id}
                  className={`rounded-xl border px-2.5 py-1 flex items-start gap-2.5 ${
                    unlocked ? "border-white/15 bg-white/[0.04]" : "border-white/[0.06] bg-black/20 opacity-60"
                  }`}
                >
                  <EntityIcon type="HERO" companionId={id} size={30} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5">
                      <span className="text-[14px] font-bold">{def.sanctuaryShortName ?? def.shortName}</span>
                      <span className="text-[10px] tabular-nums text-white/55">{companionStartText(id)}</span>
                      {isNext && unlocked && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-100">
                          Next run
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] leading-snug text-white/70">{COMPANION_RULES[id]}</div>
                    {!unlocked && (
                      <div className="text-[12px] text-white/60"><Badge id="lock" /> {companionUnlockFor(id).needText}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={tab === "LINE" ? "" : "invisible"} aria-hidden={tab !== "LINE"}>
          <div className="text-[12px] text-white/60 mb-1.5">Just looks: pick the colour of your line.</div>
          <div className="grid grid-cols-4 auto-rows-fr gap-1.5">
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
                  <span className="text-[10px] font-bold leading-tight mt-1">{u.name.replace(" line", "")}</span>
                  {!unlocked && <LockLine full={u.needText} short={shortNeedText(u)} />}
                </button>
              );
            })}
          </div>
        </section>

        <section className={tab === "BOARD" ? "" : "invisible"} aria-hidden={tab !== "BOARD"}>
          <div className="grid grid-cols-4 auto-rows-fr gap-1.5">
            {boards.map((u) => {
              if (u.kind !== "BOARD") return null;
              const unlocked = isUnlocked(u, progress);
              const selected = currentBoard === u.target;
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={selected}
                  onClick={() => onSelect({ ...cosmetics, boardThemeId: u.target })}
                  className={tile(selected, unlocked)}
                >
                  <UnlockIcon item={u} size={44} />
                  <span className="text-[10px] font-bold leading-tight mt-0.5">{u.name.replace(" board", "")}</span>
                  {!unlocked && <LockLine full={u.needText} short={shortNeedText(u)} />}
                </button>
              );
            })}
          </div>
        </section>
        </div>
        {/* Pinned, so Done is always in reach */}
        <div className="sticky -bottom-3 -mx-3 -mb-3 bg-[#19271E] px-3 pt-1 pb-3">
          <DoneButton onClick={onClose} />
        </div>
      </motion.div>
    </div>
  );
}

/** A locked tile's requirement (the tile is dimmed): a short label, the full sentence on hover and for screen readers */
function LockLine({ full, short }: { full: string; short: string }) {
  return (
    <span className="w-full text-[10px] leading-tight text-white/60" title={full} aria-label={`Locked: ${full}`}>
      {short}
    </span>
  );
}
