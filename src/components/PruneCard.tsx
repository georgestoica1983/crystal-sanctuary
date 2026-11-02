"use client";

import { motion } from "framer-motion";
import { useBackClose } from "@/lib/backClose";
import { DoneButton, GrabBar, sheetDrag } from "@/components/SheetBits";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { EntityType, SeedTile } from "@/types/game";
import EntityIcon from "@/components/EntityIcon";
import { RUN_BAG_MIN_SIZE, RUN_PRUNE_COST } from "@/lib/runReplay";
import { artify } from "@/components/ArtText";

const PRUNE_ORDER: EntityType[] = ["ENEMY", "TRAP", "WEAPON", "SHIELD", "POTION", "GOLD"];
export const TILE_NAMES: Partial<Record<EntityType, string>> = {
  ENEMY: "Thorn",
  TRAP: "Spike",
  WEAPON: "Shears",
  SHIELD: "Gloves",
  POTION: "Berry",
  GOLD: "Acorn",
};

/** One kind of tile in the bag: type + value, how many, and the first bag index */
interface BagGroup {
  type: EntityType;
  value: number;
  count: number;
  index: number;
}

/** Height of one tile group in the Prune sheet */
const TILE_H = 76;

/**
 * ✂️ Pruning Shears (Run Shop): a sheet over the Shop. Pay a few Seeds to take
 * one tile out of the Tile Bag for the rest of the Run. Once per Shop visit.
 * Every kind of tile is a big tap target; long bags split into screens, so
 * nothing scrolls. It opens inside the Shop, so it shares the Shop's scale.
 */
export default function PruneSheet({
  bag,
  gems,
  pruned,
  onPrune,
  onClose,
}: {
  bag: SeedTile[];
  gems: number;
  pruned: boolean;
  onPrune: (index: number) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<BagGroup | null>(null);
  const [screen, setScreen] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [perScreen, setPerScreen] = useState(16);
  useBackClose(true, onClose);

  const groups = useMemo(() => {
    const map = new Map<string, BagGroup>();
    bag.forEach((t, index) => {
      const key = `${t.type}-${t.value}`;
      const g = map.get(key);
      if (g) g.count++;
      else map.set(key, { type: t.type, value: t.value, count: 1, index });
    });
    return [...map.values()].sort(
      (a, b) => PRUNE_ORDER.indexOf(a.type) - PRUNE_ORDER.indexOf(b.type) || a.value - b.value
    );
  }, [bag]);

  // How many tiles fit in the grid area (4 columns)
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const rows = Math.max(1, Math.floor((el.clientHeight + 8) / (TILE_H + 8)));
      setPerScreen(rows * 4);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const screens = Math.max(1, Math.ceil(groups.length / perScreen));
  const at = Math.min(screen, screens - 1);
  const shown = groups.slice(at * perScreen, (at + 1) * perScreen);

  const atMin = bag.length <= RUN_BAG_MIN_SIZE;
  const affordable = gems >= RUN_PRUNE_COST;
  const blockedText = pruned
    ? "Used this visit"
    : atMin
    ? `Your bag is at its smallest (${RUN_BAG_MIN_SIZE})`
    : !affordable
    ? `Needs ${RUN_PRUNE_COST} 🌱`
    : null;

  return artify(
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label="Prune a tile"
        onClick={(e) => e.stopPropagation()}
        {...sheetDrag(onClose)}
        className="w-full max-w-[430px] h-full max-h-[620px] flex flex-col gap-3 rounded-2xl border border-lime-300/30 bg-[#1B281F] px-4 pt-2 pb-4 text-white"
      >
        <GrabBar />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[22px] font-bold leading-tight">Prune a tile</h2>
            <p className="text-[14px] leading-snug text-white/70">
              Take one tile out of your bag for the rest of the Run. {bag.length} tiles in the bag.
            </p>
          </div>
        </div>

        <div ref={gridRef} className="min-h-0 flex-1 overflow-hidden">
          <div className="grid grid-cols-4 gap-2">
            {shown.map((g) => {
              const selected = picked?.type === g.type && picked.value === g.value;
              return (
                <button
                  key={`${g.type}-${g.value}`}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${TILE_NAMES[g.type]} ${g.value}, ${g.count} in the bag`}
                  onClick={() => setPicked(selected ? null : g)}
                  style={{ height: TILE_H }}
                  className={`rounded-xl border flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
                    selected ? "border-lime-300 bg-lime-300/20" : "border-white/[0.12] bg-white/[0.05]"
                  }`}
                >
                  <EntityIcon type={g.type} size={32} />
                  <span className="text-[14px] font-bold leading-none">
                    {TILE_NAMES[g.type]} {g.value}
                  </span>
                  <span className="text-[13px] leading-none text-white/60">×{g.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {screens > 1 && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={at === 0}
              onClick={() => setScreen(at - 1)}
              className="h-10 px-4 rounded-xl bg-white/[0.06] text-[14px] font-semibold disabled:opacity-30"
            >
              ← Back
            </button>
            <span className="text-[13px] text-white/60">
              {at + 1} of {screens}
            </span>
            <button
              type="button"
              disabled={at >= screens - 1}
              onClick={() => setScreen(at + 1)}
              className="h-10 px-4 rounded-xl bg-white/[0.06] text-[14px] font-semibold disabled:opacity-30"
            >
              More →
            </button>
          </div>
        )}

        <p className="text-[13px] leading-snug text-white/55">Numbers are base values. Thorns and Spikes grow each Season.</p>

        <button
          type="button"
          disabled={!picked || !!blockedText}
          onClick={() => {
            if (!picked) return;
            onPrune(picked.index);
            setPicked(null);
            onClose();
          }}
          className="h-12 w-full rounded-xl bg-lime-300 text-slate-950 text-[16px] font-bold active:scale-95 transition disabled:bg-white/10 disabled:text-white/50"
        >
          {blockedText ??
            (picked
              ? `Remove one ${TILE_NAMES[picked.type]} ${picked.value} for ${RUN_PRUNE_COST} 🌱`
              : "Pick a tile to remove")}
        </button>
        <DoneButton onClick={onClose} label="Back to the Shop" />
      </motion.div>
    </div>
  );
}
