"use client";

import React from "react";
import { motion } from "framer-motion";
import type { GardenerGiftId, RelicId } from "@/types/game";
import { GARDENER_GIFTS } from "@/lib/runReplay";
import { RELIC_REGISTRY } from "@/lib/engine";
import { badgeArt, miscArt, statArt } from "@/lib/art";
import RelicIcon from "@/components/RelicIcon";
import { artify } from "@/components/ArtText";

/**
 * The Wandering Gardener (rules v20): at the start of Seasons 4 and 6 a
 * visitor offers three gifts and the player keeps one. The bed waits until
 * one is picked, so there is no way to close this without choosing.
 */
export default function GardenerCard({
  gifts,
  relic,
  season,
  onPick,
}: {
  gifts: GardenerGiftId[];
  /** The Rare relic the relic gift would give (shown on its tile) */
  relic: RelicId | null;
  season: number;
  onPick: (index: number) => void;
}) {
  const art = (g: GardenerGiftId) =>
    g === "RARE_RELIC" && relic ? (
      <RelicIcon id={relic} size={52} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={g === "GOLDEN_TILES" ? badgeArt("golden") : g === "MAX_LIFE" ? statArt("life") : badgeArt("seed")}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-[52px] w-[52px] object-contain"
      />
    );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ui-zoom fixed inset-0 z-[64] flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        role="dialog"
        aria-label="The Wandering Gardener: pick one gift"
        initial={{ y: 16, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="fit-card w-full max-w-[380px] rounded-2xl border border-amber-200/25 bg-[#1B281F] p-4 text-white shadow-2xl space-y-3"
      >
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={miscArt("gardener")} alt="" aria-hidden="true" draggable={false} className="mx-auto h-20 w-20 object-contain" />
          <div className="mt-1 text-[13px] font-semibold text-amber-200/90">Season {season} begins</div>
          <h2 className="font-display text-[24px] font-semibold leading-tight">The Wandering Gardener</h2>
          <p className="mt-1 text-[14px] leading-snug text-white/75">
            A visitor stops by your garden with three gifts. Keep one.
          </p>
        </div>
        <div className="space-y-2">
          {gifts.map((g, i) => {
            const info = GARDENER_GIFTS[g];
            const name = g === "RARE_RELIC" && relic ? RELIC_REGISTRY[relic].name : info.name;
            const text = g === "RARE_RELIC" && relic ? `Rare relic, free: ${RELIC_REGISTRY[relic].shortTag.replace(/\.?$/, ".")}` : info.text;
            return (
              <button
                key={g}
                type="button"
                onClick={() => onPick(i)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-left active:scale-[0.98] transition hover:border-amber-200/40"
              >
                <span className="shrink-0">{art(g)}</span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-bold leading-tight">{name}</span>
                  <span className="block text-[13px] leading-snug text-white/70">{artify(text)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
