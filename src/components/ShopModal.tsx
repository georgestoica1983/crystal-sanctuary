"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ArrowRight, Lock } from "lucide-react";
import {
  BossRuleId,
  RelicCounters,
  RelicId,
  RelicRarity,
  RunUpgrades,
  ShopOffer,
} from "@/types/game";
import {
  BOSS_RULE_REGISTRY,
  countCommonRelics,
  describeRelicGrowth,
  getRelicSellValue,
  MAX_COMMON_RELICS,
  RELIC_REGISTRY,
  SHOP_STAT_BOOSTS,
} from "@/lib/engine";
import { getRelicDisplay } from "@/lib/sanctuaryCopy";

interface ShopModalProps {
  isOpen: boolean;
  gems: number;
  offers: ShopOffer[];
  soldIds: string[];
  ownedRelics: RelicId[];
  upgrades: RunUpgrades;
  rerollCost: number;
  clearedFloorNumber: number;
  totalFloors: number;
  nextFloorTitle?: string;
  nextBossRuleId?: BossRuleId;
  /** Replaces the "Garden x/y cleared" header (Run mode) */
  headerLabel?: string;
  legendaryAward?: RelicId | null;
  /** Something was bought in this Shop visit (sold marks reset on reroll) */
  hasPurchased?: boolean;
  isSanctuary: boolean;
  /** Growth of scaling relics (shown on their slot) */
  relicCounters?: RelicCounters;
  /** Selling relics (Run); hidden when omitted */
  onSell?: (relicId: RelicId) => void;
  onBuy: (offer: ShopOffer) => void;
  onReroll: () => void;
  onLeave: () => void;
}

const RARITY_LABEL: Record<RelicRarity, { label: string; className: string }> = {
  COMMON: { label: "Common", className: "bg-white/10 text-zinc-300" },
  UNCOMMON: { label: "Uncommon", className: "bg-emerald-400/20 text-emerald-200" },
  RARE: { label: "Rare", className: "bg-fuchsia-400/25 text-fuchsia-100" },
  LEGENDARY: { label: "Legendary", className: "bg-amber-400/25 text-amber-100" },
};

/** Display data for one shop offer (relic or stat boost) */
function describeOffer(offer: ShopOffer, isSanctuary: boolean) {
  if (offer.kind === "RELIC" && offer.relicId) {
    const relic = getRelicDisplay(RELIC_REGISTRY[offer.relicId], isSanctuary);
    const rarity = RARITY_LABEL[relic.rarity ?? "COMMON"];
    return {
      icon: relic.icon,
      name: relic.name,
      tag: relic.shortTag,
      description: relic.description,
      accent: relic.accentColor,
      kindLabel: rarity.label,
      kindClass: rarity.className,
    };
  }
  const boost = SHOP_STAT_BOOSTS[offer.stat ?? "MAX_MAGIC"];
  return {
    icon: boost.icon,
    name: boost.name,
    tag: boost.shortTag,
    description: boost.description,
    accent: boost.accentColor,
    kindLabel: "Boost",
    kindClass: "bg-cyan-400/15 text-cyan-200",
  };
}

/**
 * Between-garden Sanctuary Shop: spend this visit's Gems on seeded relics and
 * stat boosts, sell relics (Run), reroll, or skip ahead.
 */
export default function ShopModal({
  isOpen,
  gems,
  offers,
  soldIds,
  ownedRelics,
  upgrades,
  rerollCost,
  clearedFloorNumber,
  totalFloors,
  nextFloorTitle,
  nextBossRuleId,
  headerLabel,
  legendaryAward,
  hasPurchased = false,
  isSanctuary,
  relicCounters,
  onSell,
  onBuy,
  onReroll,
  onLeave,
}: ShopModalProps) {
  // The owned relic tapped in the loadout (shows its details and Sell)
  const [selectedRelic, setSelectedRelic] = useState<RelicId | null>(null);
  if (!isOpen) return null;

  const commonOwned = ownedRelics.filter(
    (id) => RELIC_REGISTRY[id]?.rarity !== "LEGENDARY"
  );
  const legendaryOwned = ownedRelics.filter(
    (id) => RELIC_REGISTRY[id]?.rarity === "LEGENDARY"
  );
  const slotsFull = countCommonRelics(ownedRelics) >= MAX_COMMON_RELICS;
  const selectedSlotRelic =
    selectedRelic && commonOwned.includes(selectedRelic) ? selectedRelic : null;
  const selectedInfo = selectedSlotRelic
    ? getRelicDisplay(RELIC_REGISTRY[selectedSlotRelic], isSanctuary)
    : null;
  const selectedGrowth = selectedSlotRelic
    ? describeRelicGrowth(selectedSlotRelic, relicCounters)
    : null;
  const selectedSellValue = selectedSlotRelic ? getRelicSellValue(selectedSlotRelic) : null;
  const boughtAnything = hasPurchased || soldIds.length > 0;
  const nextBoss = nextBossRuleId ? BOSS_RULE_REGISTRY[nextBossRuleId] : null;
  const legendary = legendaryAward ? RELIC_REGISTRY[legendaryAward] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto select-none">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[430px] my-auto rounded-2xl p-4 space-y-3 text-white border-2 border-fuchsia-400/70 bg-gradient-to-b from-[#1C0F2E] via-[#120A22] to-[#0A0614] shadow-[0_0_40px_rgba(217,70,239,0.45),inset_0_0_30px_rgba(34,211,238,0.08)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-extrabold uppercase tracking-[0.2em] text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">
              {headerLabel ??
                `${isSanctuary ? "Garden" : "Floor"} ${clearedFloorNumber}/${totalFloors} cleared`}
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-fuchsia-200 drop-shadow-[0_0_10px_rgba(217,70,239,0.9)]">
              Sanctuary Shop
            </h2>
          </div>
          <div className="shrink-0 rounded-xl px-3 py-1.5 border-2 border-amber-300/80 bg-amber-400/10 shadow-[0_0_16px_rgba(250,204,21,0.45)] text-right">
            <div className="text-[9px] font-mono font-bold uppercase text-amber-200/80">
              Your Gems
            </div>
            <motion.div
              key={gems}
              initial={{ scale: 1.35, color: "#FFFFFF" }}
              animate={{ scale: 1, color: "#FDE047" }}
              className="text-lg font-mono font-black leading-none"
            >
              💎 {gems}
            </motion.div>
          </div>
        </div>

        {/* Boss reward */}
        {legendary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl px-3 py-2 border-2 border-amber-300 bg-gradient-to-r from-amber-500/25 via-fuchsia-500/20 to-cyan-500/20 shadow-[0_0_22px_rgba(250,204,21,0.5)] flex items-center gap-2.5"
          >
            <span className="text-2xl">{legendary.icon}</span>
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-black uppercase text-amber-200">
                👑 Boss defeated · Legendary relic
              </div>
              <div className="text-sm font-black text-white">{legendary.name}</div>
              <div className="text-[11px] text-amber-50/90 leading-snug">
                {legendary.description.replace(/^Legendary: /, "")}
              </div>
            </div>
          </motion.div>
        )}

        {/* Offers */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {offers.map((offer, idx) => {
              const info = describeOffer(offer, isSanctuary);
              const sold = soldIds.includes(offer.id);
              const blockedBySlots = offer.kind === "RELIC" && slotsFull;
              const affordable = gems >= offer.cost;
              const disabled = sold || blockedBySlots || !affordable;
              return (
                <motion.button
                  key={offer.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.07 } }}
                  exit={{ opacity: 0, x: 18 }}
                  whileTap={disabled ? undefined : { scale: 0.97 }}
                  disabled={disabled}
                  onClick={() => onBuy(offer)}
                  style={{
                    borderColor: sold ? "rgba(255,255,255,0.12)" : `${info.accent}AA`,
                    boxShadow: sold || disabled ? undefined : `0 0 16px ${info.accent}55`,
                  }}
                  className={`w-full text-left rounded-xl border-2 p-2.5 flex items-center gap-3 transition ${
                    sold
                      ? "bg-white/5 opacity-50"
                      : disabled
                      ? "bg-[#0E0B1A] opacity-60"
                      : "bg-[#120D22] hover:bg-[#1A1230]"
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 border"
                    style={{
                      backgroundColor: `${info.accent}22`,
                      borderColor: `${info.accent}66`,
                    }}
                  >
                    {info.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${info.kindClass}`}>
                        {info.kindLabel}
                      </span>
                      <span className="font-black text-sm leading-tight">{info.name}</span>
                    </div>
                    <div
                      className="text-[10px] font-mono font-extrabold mt-0.5"
                      style={{ color: info.accent }}
                    >
                      {info.tag}
                    </div>
                    <div className="text-[11px] text-zinc-300 leading-snug">
                      {info.description}
                      {blockedBySlots && !sold && (
                        <span className="block text-rose-200/90 font-semibold">
                          Slots full ({MAX_COMMON_RELICS}/{MAX_COMMON_RELICS}) —{" "}
                          {onSell ? "sell a relic below to make room." : "no room."}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 rounded-lg px-2 py-1 font-mono font-black text-xs border ${
                      sold
                        ? "border-white/15 text-zinc-400"
                        : affordable && !blockedBySlots
                        ? "border-amber-300 text-amber-200 bg-amber-400/15"
                        : "border-rose-400/50 text-rose-300/80"
                    }`}
                  >
                    {sold ? "SOLD" : blockedBySlots ? <Lock className="w-3.5 h-3.5" /> : `💎${offer.cost}`}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Loadout */}
        <div className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-zinc-400">
            <span>
              Relics {commonOwned.length}/{MAX_COMMON_RELICS}
            </span>
            {(upgrades.bonusMaxMagic > 0 || upgrades.bonusStartDew > 0) && (
              <span className="text-emerald-300 normal-case">
                {upgrades.bonusMaxMagic > 0 && `✨ +${upgrades.bonusMaxMagic} Max Magic `}
                {upgrades.bonusStartDew > 0 && `💧 +${upgrades.bonusStartDew} Dew`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: MAX_COMMON_RELICS }, (_, i) => {
              const id = commonOwned[i];
              const relic = id ? getRelicDisplay(RELIC_REGISTRY[id], isSanctuary) : null;
              const selected = Boolean(id) && id === selectedSlotRelic;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!relic}
                  onClick={() => id && setSelectedRelic(selected ? null : id)}
                  aria-label={relic ? `${relic.name} — tap for details` : "Empty relic slot"}
                  aria-pressed={selected}
                  className={`h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 px-0.5 transition ${
                    relic
                      ? selected
                        ? "border-amber-300 bg-amber-400/20 shadow-[0_0_12px_rgba(250,204,21,0.45)]"
                        : "border-cyan-300/50 bg-cyan-400/10 active:scale-95"
                      : "border-dashed border-white/15"
                  }`}
                >
                  {relic ? (
                    <>
                      <span className="text-xl leading-none" aria-hidden="true">{relic.icon}</span>
                      <span className="sr-only">{relic.name}</span>
                    </>
                  ) : (
                    <span className="text-[9px] font-mono text-zinc-600">empty</span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedInfo && selectedSlotRelic && (
            <div className="rounded-lg border border-amber-300/40 bg-amber-400/5 px-2 py-1.5 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white">
                  {selectedInfo.icon} {selectedInfo.name}
                </div>
                <div className="text-[11px] text-zinc-300 leading-snug">
                  {selectedInfo.description}
                  {selectedGrowth && (
                    <span className="text-emerald-300 font-semibold"> ({selectedGrowth})</span>
                  )}
                </div>
              </div>
              {onSell && selectedSellValue !== null && (
                <button
                  type="button"
                  onClick={() => {
                    onSell(selectedSlotRelic);
                    setSelectedRelic(null);
                  }}
                  className="shrink-0 rounded-lg px-2 py-1.5 border-2 border-amber-300 bg-amber-400/15 text-amber-100 font-mono font-black text-[10px] uppercase leading-tight active:scale-95"
                >
                  Sell
                  <span className="block text-[11px]">+{selectedSellValue} 💎</span>
                </button>
              )}
            </div>
          )}
          {!selectedSlotRelic && commonOwned.length > 0 && onSell && (
            <div className="text-[10px] font-mono text-zinc-500">
              Tap a relic to see it or sell it for half its price.
            </div>
          )}
          {legendaryOwned.length > 0 && (
            <div className="text-[10px] font-mono text-amber-200">
              Legendary:{" "}
              {legendaryOwned
                .map((id) => `${RELIC_REGISTRY[id].icon} ${RELIC_REGISTRY[id].name}`)
                .join(" · ")}
            </div>
          )}
        </div>

        {/* Up next */}
        {nextFloorTitle && (
          <div
            className={`rounded-xl px-3 py-2 text-xs border ${
              nextBoss
                ? "border-rose-400/70 bg-rose-500/15 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.35)]"
                : "border-white/10 bg-white/5 text-zinc-300"
            }`}
          >
            <span className="font-mono font-bold uppercase text-[10px] opacity-80">
              Up next:{" "}
            </span>
            {nextBoss ? (
              <>
                <span className="font-black">
                  {nextBoss.icon} Boss Garden — {nextBoss.name}
                </span>
                <div className="text-[11px] mt-0.5">{nextBoss.description}</div>
              </>
            ) : (
              <span className="font-bold">{nextFloorTitle}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onReroll}
            disabled={gems < rerollCost}
            className="rounded-xl py-2.5 px-2 border-2 border-cyan-300/70 bg-cyan-400/10 text-cyan-100 font-mono font-black text-[11px] uppercase flex items-center justify-center gap-1.5 shadow-[0_0_14px_rgba(34,211,238,0.35)] active:scale-95 transition disabled:opacity-40 disabled:shadow-none"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span>Reroll Shop</span>
              <span className="text-[9px] text-cyan-200/80 normal-case">
                Cost: {rerollCost} 💎
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl py-2.5 px-2 border-2 border-fuchsia-300 bg-fuchsia-500/25 text-white font-mono font-black text-[11px] uppercase flex items-center justify-center gap-1.5 shadow-[0_0_18px_rgba(217,70,239,0.55)] active:scale-95 transition"
          >
            {boughtAnything ? "Continue" : "Skip Shop"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
