"use client";

import React, { useMemo, useState } from "react";
import { EntityType, SeedTile } from "@/types/game";
import EntityIcon from "@/components/EntityIcon";
import { RUN_BAG_MIN_SIZE, RUN_PRUNE_COST } from "@/lib/runReplay";

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

/**
 * ✂️ Pruning Shears (Run Shop): pay a few Seeds to take one tile out of the
 * Tile Bag for the rest of the Run. Once per Shop visit.
 */
export default function PruneCard({
  bag,
  gems,
  pruned,
  onPrune,
}: {
  bag: SeedTile[];
  gems: number;
  pruned: boolean;
  onPrune: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<BagGroup | null>(null);
  const [removed, setRemoved] = useState<SeedTile | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, BagGroup>();
    bag.forEach((t, index) => {
      const key = `${t.type}-${t.value}`;
      const g = map.get(key);
      if (g) g.count++;
      else map.set(key, { type: t.type, value: t.value, count: 1, index });
    });
    return PRUNE_ORDER.map((type) => ({
      type,
      items: [...map.values()].filter((g) => g.type === type).sort((a, b) => a.value - b.value),
    })).filter((row) => row.items.length > 0);
  }, [bag]);

  const atMin = bag.length <= RUN_BAG_MIN_SIZE;
  const affordable = gems >= RUN_PRUNE_COST;
  const blocked = pruned || atMin || !affordable;
  const status = pruned
    ? removed
      ? `✓ ${TILE_NAMES[removed.type]} ${removed.value} removed · ${bag.length} tiles left`
      : `✓ Used this visit · ${bag.length} tiles left`
    : atMin
    ? `Your bag is at its smallest (${RUN_BAG_MIN_SIZE} tiles).`
    : `Take one tile out of your bag for the rest of the run · ${bag.length} tiles`;

  return (
    <div className="rounded-xl border border-lime-300/35 bg-white/[0.04]">
      <button
        type="button"
        disabled={blocked && !open}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setPicked(null);
        }}
        className={`w-full text-left p-2.5 flex items-center gap-3 transition ${
          blocked && !open ? "opacity-60" : "active:bg-white/[0.06]"
        }`}
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 border border-lime-300/40 bg-lime-300/10">
          ✂️
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-lime-300/15 text-lime-100">
            Once per Shop
          </span>
          <div className="font-black text-sm leading-tight mt-0.5">Pruning Shears</div>
          <div className="text-[11px] text-zinc-300 leading-snug">{status}</div>
        </div>
        <div
          className={`shrink-0 rounded-lg px-2 py-1 font-mono font-black text-xs border ${
            pruned
              ? "border-white/15 text-zinc-400"
              : affordable && !atMin
              ? "border-amber-300 text-amber-200 bg-amber-400/15"
              : "border-white/15 text-white/40"
          }`}
        >
          {pruned ? "USED" : `🌱${RUN_PRUNE_COST}`}
        </div>
      </button>

      {open && !blocked && (
        <div className="px-2.5 pb-2.5 space-y-2">
          <div className="text-[11px] text-white/55 leading-snug">
            Tap a tile to remove. Numbers are base values — Thorns and Spikes grow each Season.
          </div>
          <div className="space-y-1.5">
            {groups.map((row) => (
              <div key={row.type} className="flex flex-wrap items-center gap-1.5">
                <span className="w-14 text-[10.5px] font-semibold text-white/55">{TILE_NAMES[row.type]}</span>
                {row.items.map((g) => {
                  const selected = picked?.type === g.type && picked.value === g.value;
                  return (
                    <button
                      key={`${g.type}-${g.value}`}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${TILE_NAMES[g.type]} ${g.value}, ${g.count} in the bag`}
                      onClick={() => setPicked(selected ? null : g)}
                      className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[12px] font-mono font-black transition active:scale-95 ${
                        selected ? "border-lime-300 bg-lime-300/20 text-white" : "border-white/15 bg-black/20 text-white/90"
                      }`}
                    >
                      <EntityIcon type={g.type} size={15} />
                      {g.value}
                      <span className="text-[10px] font-semibold text-white/45">×{g.count}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={!picked}
            onClick={() => {
              if (!picked) return;
              setRemoved({ type: picked.type, value: picked.value });
              onPrune(picked.index);
              setOpen(false);
              setPicked(null);
            }}
            className="w-full rounded-xl py-2 font-bold text-[13px] bg-lime-300 text-slate-950 active:scale-95 transition disabled:opacity-40"
          >
            {picked
              ? `Remove ${TILE_NAMES[picked.type]} ${picked.value} · 🌱${RUN_PRUNE_COST}`
              : "Pick a tile to remove"}
          </button>
        </div>
      )}
    </div>
  );
}
