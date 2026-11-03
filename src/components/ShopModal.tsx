"use client";

import Badge from "@/components/Badge";
import BossIcon from "@/components/BossIcon";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ArrowRight, Lock } from "lucide-react";
import {
  BossRuleId,
  RelicCounters,
  RelicId,
  RelicRarity,
  RunUpgrades,
  SeedTile,
  ShopOffer,
} from "@/types/game";
import {
  BOSS_RULE_REGISTRY,
  countCommonRelics,
  describeRelicGrowth,
  FERTILIZER,
  EDITIONS,
  GARDEN_TOOLS,
  getFertLevel,
  MAX_TOOLS,
  getRelicSellValue,
  MAX_COMMON_RELICS,
  RELIC_REGISTRY,
  RUN_INTEREST_MAX,
  RUN_INTEREST_STEP,
  SHOP_STAT_BOOSTS,
} from "@/lib/engine";
import { getRelicDisplay } from "@/lib/sanctuaryCopy";
import PruneSheet from "@/components/PruneCard";
import { packetArt, statArt, themeArt, tileArt } from "@/lib/art";
import SupplyIcon from "@/components/SupplyIcon";
import {
  getRelicTags,
  RELIC_SET_SIZE,
  RELIC_SET_X,
  RELIC_TAG_INFO,
  RelicTag,
  setProgressFor,
} from "@/lib/relicTags";
import RelicIcon from "@/components/RelicIcon";
import { GARDEN_UPGRADES, MAX_PACKETS, RUN_PRUNE_COST, SEED_PACKETS } from "@/lib/runReplay";
import { artify } from "@/components/ArtText";

/** Small build-theme chip (🌺 Thorns) */
function TagChip({ tag }: { tag: RelicTag }) {
  const info = RELIC_TAG_INFO[tag];
  return artify(
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${info.className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={themeArt(tag)} alt="" aria-hidden="true" draggable={false} className="h-3.5 w-3.5 object-contain" />
      {info.name}
    </span>
  );
}

interface ShopModalProps {
  isOpen: boolean;
  /** Rules v10+: 3 relics with one theme tag score every line ×1.25 */
  relicSets?: boolean;
  /** First Shop visit: a one-line explanation under the header */
  showIntro?: boolean;
  /** Relic offer id → extra points it would have added to your best line */
  scorePreview?: Record<string, number>;
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
  /** Garden tools held (rules v13+): a full pair blocks buying another */
  toolsHeld?: number;
  /** Seed packets held (rules v22+): two at most */
  packetsHeld?: number;
  /** Selling relics (Run); hidden when omitted */
  onSell?: (relicId: RelicId) => void;
  /** Pruning Shears (Run, rules v9+): the Tile Bag; hidden when omitted */
  bag?: SeedTile[];
  pruned?: boolean;
  onPrune?: (index: number) => void;
  onBuy: (offer: ShopOffer) => void;
  onReroll: () => void;
  onLeave: () => void;
}

/** An offer tile's price, the same chip on every tile: seed and number, ✓ once bought, a lock when there's no room */
function PriceChip({ sold, blocked, affordable, cost }: { sold: boolean; blocked: boolean; affordable: boolean; cost: number }) {
  return (
    <span
      className={`absolute top-1 right-1 flex items-center gap-0.5 rounded-md px-1 text-[10.5px] leading-[15px] font-mono font-black ${
        sold ? "text-white/50" : affordable && !blocked ? "bg-amber-400/20 text-amber-200" : "bg-white/[0.06] text-white/40"
      }`}
    >
      {sold ? "✓" : blocked ? <Lock className="w-3 h-3" /> : (
        <>
          <Badge id="seed" size={11} />
          {cost}
        </>
      )}
    </span>
  );
}

/** Kinds of Shop offer this device has seen (for the "New" label) */
const SHOP_KINDS_SEEN_KEY = "ost_shop_kinds_seen_v1";

const RARITY_LABEL: Record<RelicRarity, { label: string; className: string }> = {
  COMMON: { label: "Common", className: "bg-white/10 text-zinc-300" },
  UNCOMMON: { label: "Uncommon", className: "bg-emerald-400/20 text-emerald-200" },
  RARE: { label: "Rare", className: "bg-fuchsia-400/25 text-fuchsia-100" },
  LEGENDARY: { label: "Legendary", className: "bg-amber-400/25 text-amber-100" },
};

/** Display data for one shop offer (relic or stat boost) */
const TOOL_DESCRIPTIONS: Record<string, string> = {
  RICH_SOIL: "Put it on any tile: that tile adds +20 Value to every line through it, for the whole Run.",
  LONG_ROOT: "Put it on any tile: that tile adds +2 Length to every line through it, for the whole Run.",
  SUNLIT: "Put it on any tile: every line through it scores ×1.25, for the whole Run.",
  DEW: "Put it on any tile: the next 3 lines through it score ×1.5, then the Dew dries.",
  ECHO: "Put it on any tile (even an upgraded one): its number, upgrade and shimmer count twice on every line, for the whole Run.",
};

const TILE_NAMES: Record<string, string> = {
  ENEMY: "Thorn",
  TRAP: "Spike",
  GOLD: "Acorn",
  POTION: "Berries",
  SHIELD: "Gloves",
  WEAPON: "Shears",
};

/** What an offer does, in a few words for its tile (the panel below has the full text) */
function glanceOf(offer: ShopOffer, info: { tag: string }): string {
  if (offer.kind === "TOOL" && offer.tool) return `Tool: ${GARDEN_TOOLS[offer.tool].tag}`;
  if (offer.kind === "PACKET" && offer.packet) return SEED_PACKETS[offer.packet].short;
  if (offer.kind === "TILE" && offer.tile?.ed) return `${EDITIONS[offer.tile.ed].tag} tile`;
  if (offer.kind === "FERT" && offer.fert) {
    const f = FERTILIZER[offer.fert];
    return `+${f.perLevel} Value per ${f.name.replace(/s$/, "")}`;
  }
  if (offer.kind === "UPGRADE" && offer.upgrade) return GARDEN_UPGRADES[offer.upgrade].text;
  return info.tag;
}

function describeOffer(offer: ShopOffer, isSanctuary: boolean, counters?: RelicCounters) {
  if (offer.kind === "PACKET" && offer.packet) {
    const p = SEED_PACKETS[offer.packet];
    return {
      icon: "🌱",
      name: p.name,
      tag: p.short,
      description: `${p.text} ${p.nextLine ? "It waits for your next line." : "It works the moment you use it."} One use; hold up to ${MAX_PACKETS}.`,
      accent: "#F0ABFC",
      kindLabel: "Seed packet",
      kindClass: "bg-fuchsia-400/15 text-fuchsia-200",
    };
  }
  if (offer.kind === "UPGRADE" && offer.upgrade) {
    const u = GARDEN_UPGRADES[offer.upgrade];
    return {
      icon: u.icon,
      name: u.name,
      tag: u.text,
      description: `Garden upgrade: ${u.text}, for the rest of this Run. One per Season.`,
      accent: "#A7F3D0",
      kindLabel: "Upgrade",
      kindClass: "bg-emerald-400/15 text-emerald-200",
    };
  }
  if (offer.kind === "TILE" && offer.tile?.ed) {
    const ed = EDITIONS[offer.tile.ed];
    return {
      icon: "✦",
      name: `${ed.name} ${TILE_NAMES[offer.tile.type] ?? "tile"} ${offer.tile.value}`,
      tag: `${ed.tag} · joins your bag`,
      description: `A ${ed.name} ${TILE_NAMES[offer.tile.type] ?? "tile"} joins your Tile Bag: every line through it gets ${ed.tag}.`,
      accent: offer.tile.ed === "GOLDEN" ? "#FCD34D" : offer.tile.ed === "IRIDESCENT" ? "#C4B5FD" : "#FED7AA",
      kindLabel: "Special tile",
      kindClass: "bg-amber-400/15 text-amber-200",
    };
  }
  if (offer.kind === "TOOL" && offer.tool) {
    const t = GARDEN_TOOLS[offer.tool];
    return {
      icon: t.icon,
      name: t.name,
      tag: `Garden tool · ${t.tag}`,
      description: TOOL_DESCRIPTIONS[offer.tool],
      accent: "#FCD34D",
      kindLabel: "Tool",
      kindClass: "bg-amber-400/15 text-amber-200",
    };
  }
  if (offer.kind === "FERT" && offer.fert) {
    const f = FERTILIZER[offer.fert];
    const level = getFertLevel(counters, offer.fert);
    return {
      icon: "🌱",
      name: `Fertilizer · ${f.name}`,
      tag:
        level > 0
          ? `${f.name} Lv ${level + 1} → Lv ${level + 2}: +${f.perLevel * (level + 1)} Value each`
          : `${f.name} → Lv 2: +${f.perLevel} Value each`,
      description: `Every ${f.name.replace(/s$/, "")} on a line adds +${f.perLevel} more Value for the rest of this Garden Run. Stacks.`,
      accent: "#A3E635",
      kindLabel: "Fertilizer",
      kindClass: "bg-lime-400/15 text-lime-200",
    };
  }
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
 * A short guided look at the Shop: a soft spotlight on one thing at a time,
 * with a line of text and Next. Tapping anywhere also moves on.
 */
function ShopCoach({
  step,
  cardRef,
  targets,
  texts,
  onStep,
  onDone,
}: {
  step: number;
  cardRef: React.RefObject<HTMLDivElement | null>;
  targets: Array<React.RefObject<HTMLElement | null>>;
  texts: string[];
  onStep: (n: number) => void;
  onDone: () => void;
}) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number; cardH: number } | null>(null);
  useLayoutEffect(() => {
    const card = cardRef.current;
    const el = targets[step]?.current;
    if (!card || !el) return;
    // Rects are on screen (zoomed); the overlay lives inside the zoomed card
    const c = card.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const z = c.width / card.offsetWidth || 1;
    setBox({ x: (r.left - c.left) / z, y: (r.top - c.top) / z, w: r.width / z, h: r.height / z, cardH: card.offsetHeight });
  }, [step, cardRef, targets]);
  const last = step >= texts.length - 1;
  const next = () => (last ? onDone() : onStep(step + 1));
  const below = box ? box.y + box.h / 2 < box.cardH / 2 : true;
  return (
    <div className="absolute inset-0 z-20 overflow-hidden rounded-2xl" onClick={next} role="dialog" aria-label="How the Shop works">
      {box && (
        <motion.div
          className="pointer-events-none absolute rounded-xl ring-2 ring-amber-300"
          initial={false}
          animate={{ left: box.x - 4, top: box.y - 4, width: box.w + 8, height: box.h + 8 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          style={{ boxShadow: "0 0 0 9999px rgba(8,14,10,0.72)" }}
        />
      )}
      {box && (
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-x-3 rounded-xl border border-amber-300/40 bg-[#24301f] p-3 text-white shadow-2xl"
          style={below ? { top: box.y + box.h + 12 } : { bottom: box.cardH - box.y + 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[13px] font-semibold text-amber-200/90">
            {step + 1} of {texts.length}
          </div>
          <p className="mt-0.5 text-[16px] leading-snug">{artify(texts[step])}</p>
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={onDone} className="h-11 flex-1 rounded-xl bg-white/[0.07] text-[14px] font-semibold text-white/80">
              Skip
            </button>
            <button type="button" onClick={next} className="h-11 flex-[2] rounded-xl bg-amber-300 text-[15px] font-bold text-slate-950">
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Between-garden Sanctuary Shop: spend this visit's Gems on seeded relics and
 * stat boosts, sell relics (Run), reroll, or skip ahead.
 */
export default function ShopModal({
  isOpen,
  relicSets = false,
  showIntro = false,
  scorePreview,
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
  toolsHeld = 0,
  packetsHeld = 0,
  onSell,
  bag,
  pruned = false,
  onPrune,
  onBuy,
  onReroll,
  onLeave,
}: ShopModalProps) {
  // What the detail panel shows: an offer, an owned relic (to sell), or pruning
  const [picked, setPicked] = useState<{ kind: "OFFER"; id: string } | { kind: "OWNED"; id: RelicId } | null>(null);
  // Pruning opens its own sheet over the Shop
  const [pruneOpen, setPruneOpen] = useState(false);
  // First visit: a short guided look (also from the "?" in the header)
  const [coach, setCoach] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const seedsRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const offersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && showIntro) setCoach(0);
  }, [isOpen, showIntro]);
  // Kinds of offer this device hasn't seen in a Shop yet get a "New" label
  // (rules v21 opens them up by Season); worked out once, when the Shop opens
  const [newKinds, setNewKinds] = useState<string[] | null>(null);
  useEffect(() => {
    if (!isOpen || newKinds !== null || offers.length === 0) return;
    try {
      const seen: string[] = JSON.parse(window.localStorage.getItem(SHOP_KINDS_SEEN_KEY) ?? "[]");
      const fresh = Array.from(new Set(offers.map((o) => o.kind))).filter((k) => k !== "RELIC" && k !== "STAT" && !seen.includes(k));
      setNewKinds(fresh);
      if (fresh.length > 0) window.localStorage.setItem(SHOP_KINDS_SEEN_KEY, JSON.stringify([...seen, ...fresh]));
    } catch {
      setNewKinds([]);
    }
  }, [isOpen, newKinds, offers]);

  if (!isOpen) return null;

  const commonOwned = ownedRelics.filter((id) => RELIC_REGISTRY[id]?.rarity !== "LEGENDARY");
  const legendaryOwned = ownedRelics.filter((id) => RELIC_REGISTRY[id]?.rarity === "LEGENDARY");
  const slotsFull = countCommonRelics(ownedRelics) >= MAX_COMMON_RELICS;
  const boughtAnything = hasPurchased || soldIds.length > 0;
  const nextBoss = nextBossRuleId ? BOSS_RULE_REGISTRY[nextBossRuleId] : null;
  const legendary = legendaryAward ? RELIC_REGISTRY[legendaryAward] : null;
  const canPrune = Boolean(bag && onPrune);

  // Relics first (the main decision), then garden supplies
  const ordered = [...offers.filter((o) => o.kind === "RELIC"), ...offers.filter((o) => o.kind !== "RELIC")];
  // Until the player taps something: the first unsold relic (or the first-visit tips)
  const fallback = ordered.find((o) => !soldIds.includes(o.id));
  // (a tapped offer that a reroll replaced falls back too)
  const pickedValid = picked && !(picked.kind === "OFFER" && !offers.some((o) => o.id === picked.id)) ? picked : null;
  const current =
    pickedValid ?? (legendary ? null : fallback ? { kind: "OFFER" as const, id: fallback.id } : null);

  /** A gain as a share of the best line's score (whole percent, 0 when unknown) */
  const gainPct = (gain: number) => {
    const base = scorePreview?.__base ?? 0;
    return base > 0 && gain > 0 ? Math.max(1, Math.round((gain / base) * 100)) : 0;
  };
  const blockedOf = (o: ShopOffer) =>
    (o.kind === "RELIC" && slotsFull) || (o.kind === "TOOL" && toolsHeld >= MAX_TOOLS) || (o.kind === "PACKET" && packetsHeld >= MAX_PACKETS);

  const offerIcon = (offer: ShopOffer, size: number) =>
    offer.relicId ? (
      <RelicIcon id={offer.relicId} size={size} />
    ) : offer.kind === "PACKET" && offer.packet ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={packetArt(offer.packet)} alt="" aria-hidden="true" draggable={false} style={{ width: size, height: size }} className="object-contain" />
    ) : offer.kind === "UPGRADE" && offer.upgrade ? (
      <SupplyIcon kind="upgrade" id={offer.upgrade} size={size} />
    ) : offer.kind === "TOOL" && offer.tool ? (
      <SupplyIcon kind="tool" id={offer.tool} size={size} />
    ) : offer.kind === "TILE" && offer.tile ? (
      <span
        className={`edition-shimmer edition-${(offer.tile.ed ?? "golden").toLowerCase()} relative rounded-lg flex items-center justify-center`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tileArt(offer.tile.type) ?? ""} alt="" aria-hidden="true" draggable={false} style={{ width: size * 0.75, height: size * 0.75 }} className="object-contain" />
      </span>
    ) : offer.kind === "FERT" && offer.fert ? (
      <span className="relative" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tileArt(offer.fert) ?? ""} alt="" aria-hidden="true" draggable={false} className="h-full w-full object-contain" />
        <Badge id="seed" size={14} className="absolute -bottom-1 -right-1.5" />
      </span>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={statArt(offer.stat === "START_DEW" ? "gloves" : "life")} alt="" aria-hidden="true" draggable={false} style={{ width: size, height: size }} className="object-contain" />
    );

  /** The detail panel: everything needed to decide, and the one button that acts
   *  (kept outside the panel's scroll, so it is always on screen) */
  let action: React.ReactNode = null;
  const detail = (() => {
    if (current?.kind === "OWNED") {
      const id = current.id;
      const info = getRelicDisplay(RELIC_REGISTRY[id], isSanctuary);
      const growth = describeRelicGrowth(id, relicCounters);
      const sellValue = getRelicSellValue(id);
      if (onSell && sellValue !== null) {
        action = (
          <button
            type="button"
            onClick={() => {
              onSell(id);
              setPicked(null);
            }}
            className="h-11 w-full rounded-xl border border-amber-300/60 bg-amber-400/15 text-amber-100 font-bold text-[14px] active:scale-95"
          >
            Sell for {sellValue} 🌱
          </button>
        );
      }
      // Same layout as an offer: framed picture, chips, name, text
      const rarity = RARITY_LABEL[info.rarity ?? "COMMON"];
      return (
        <div className="flex gap-3">
          <div
            className="h-12 w-12 shrink-0 rounded-xl border flex items-center justify-center"
            style={{ backgroundColor: `${info.accentColor}22`, borderColor: `${info.accentColor}66` }}
          >
            <RelicIcon id={id} size={38} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1">
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${rarity.className}`}>Yours · {rarity.label}</span>
              {getRelicTags(id).map((t) => <TagChip key={t} tag={t} />)}
            </div>
            <div className="mt-0.5 text-[15px] font-black leading-tight">{info.name}</div>
            <div className="text-[13px] leading-snug text-white/80">
              {info.description}
              {growth && <span className="text-emerald-300 font-semibold"> ({growth})</span>}
            </div>
          </div>
        </div>
      );
    }
    const offer = current?.kind === "OFFER" ? offers.find((o) => o.id === current.id) : undefined;
    if (!offer) {
      if (legendary && legendaryAward) {
        return (
          <div className="flex gap-3">
            <RelicIcon id={legendary.id} size={44} />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-amber-200"><Badge id="crown" /> Boss beaten · Legendary relic</div>
              <div className="text-[15px] font-black">{legendary.name}</div>
              <div className="text-[13px] leading-snug text-amber-50/90">{legendary.description.replace(/^Legendary: /, "")}</div>
            </div>
          </div>
        );
      }
      return (
        <div className="text-[13.5px] leading-snug text-teal-50">
          <b className="text-white">Spend 🌱 Seeds on relics</b>: lasting powers for this Garden Run. Or save them:
          every {RUN_INTEREST_STEP} you keep earns +1 more after each bed (up to +{RUN_INTEREST_MAX}).
          <span className="block mt-1 text-white/60">Tap an offer to see what it does.</span>
        </div>
      );
    }
    const info = describeOffer(offer, isSanctuary, relicCounters);
    const sold = soldIds.includes(offer.id);
    const blocked = blockedOf(offer);
    const affordable = gems >= offer.cost;
    const preview = scorePreview?.[offer.id];
    const progress = offer.kind === "RELIC" && offer.relicId ? setProgressFor(offer.relicId, ownedRelics) : [];
    action = (
      <button
        type="button"
        disabled={sold || blocked || !affordable}
        onClick={() => onBuy(offer)}
        className="h-11 w-full rounded-xl bg-amber-300 text-slate-950 font-bold text-[15px] active:scale-95 transition disabled:bg-white/10 disabled:text-white/45"
      >
        {sold ? "Bought" : blocked ? "No room" : affordable ? `Buy for ${offer.cost} 🌱` : `Needs ${offer.cost} 🌱`}
      </button>
    );
    const completes = relicSets ? progress.filter((p) => p.have < RELIC_SET_SIZE && p.after >= RELIC_SET_SIZE) : [];
    return (
      <div className="flex gap-3">
        <div
          className="h-12 w-12 shrink-0 rounded-xl border flex items-center justify-center"
          style={{ backgroundColor: `${info.accent}22`, borderColor: `${info.accent}66` }}
        >
          {offerIcon(offer, 38)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${info.kindClass}`}>{info.kindLabel}</span>
            {offer.relicId && getRelicTags(offer.relicId).map((t) => <TagChip key={t} tag={t} />)}
          </div>
          <div className="mt-0.5 text-[15px] font-black leading-tight">{info.name}</div>
          {offer.kind === "FERT" && (
            <div className="text-[13px] font-semibold" style={{ color: info.accent }}>
              {info.tag}
            </div>
          )}
          <div className="text-[13px] leading-snug text-white/80">{info.description}</div>
          {progress.length > 0 && !sold && (
            <div className="text-[12.5px] font-semibold text-lime-200">
              ✓ Fits your build ·{" "}
              {progress
                .map(({ tag, after }) => {
                  const label = `${RELIC_TAG_INFO[tag].icon} ${RELIC_TAG_INFO[tag].name}`;
                  return relicSets ? `${label} ${Math.min(after, RELIC_SET_SIZE)}/${RELIC_SET_SIZE}` : label;
                })
                .join(" · ")}
              {completes.length > 0 && <span className="text-amber-200"> · completes a set: every line ×{RELIC_SET_X}</span>}
            </div>
          )}
          {preview !== undefined && !sold && (
            <div className={`text-[12.5px] font-mono font-black ${preview > 0 ? "text-emerald-300" : "text-white/55"}`}>
              {preview > 0
                ? `≈ +${preview.toLocaleString()}${gainPct(preview) ? ` (+${gainPct(preview)}%)` : ""} on your best line`
                : offer.relicId && RELIC_REGISTRY[offer.relicId]?.category === "XMULT"
                ? "Your last best line didn't meet its rule; another line could"
                : "No boost on your last best line"}
            </div>
          )}
          {blocked && !sold && (
            <div className="text-[12.5px] font-semibold text-amber-200">
              {offer.kind === "TOOL"
                ? `You already hold ${MAX_TOOLS} tools. Use one on a tile first.`
                : offer.kind === "PACKET"
                ? `You already hold ${MAX_PACKETS} Seed packets. Use one first.`
                : `Slots full (${MAX_COMMON_RELICS}/${MAX_COMMON_RELICS}). ${onSell ? "Tap one of your relics below to sell it." : "No room."}`}
            </div>
          )}
        </div>
      </div>
    );
  })();

  return artify(
    <div className="ui-zoom-card fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        ref={cardRef}
        className="relative w-full max-w-[430px] max-h-full overflow-y-auto overscroll-contain flex flex-col gap-2.5 rounded-2xl p-3.5 text-white border border-white/[0.08] bg-[#1B281F] shadow-2xl shadow-black/50"
      >
        {/* Header: one row */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-emerald-300/90 truncate">
              {headerLabel ?? `${isSanctuary ? "Garden" : "Floor"} ${clearedFloorNumber}/${totalFloors} cleared`}
            </div>
            <h2 className="whitespace-nowrap text-[22px] font-display font-semibold leading-tight">{isSanctuary ? "Garden Shop" : "Sanctuary Shop"}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCoach(0)}
              aria-label="How the Shop works"
              className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.05] text-[16px] font-bold text-white/70"
            >
              ?
            </button>
            <motion.div
              ref={seedsRef}
              key={gems}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="rounded-xl px-3 py-1.5 border border-amber-300/40 bg-amber-400/10 text-[18px] font-mono font-black text-amber-200"
              aria-label={`Your Seeds: ${gems}`}
            >
              <Badge id="seed" size={20} className="mr-1 align-[-3px]" />{gems}
            </motion.div>
          </div>
        </div>

        {/* Every offer as a tile: tap to see it below */}
        <div ref={offersRef} className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-1.5">
          {ordered.map((offer) => {
            const info = describeOffer(offer, isSanctuary, relicCounters);
            const sold = soldIds.includes(offer.id);
            const blocked = blockedOf(offer);
            const affordable = gems >= offer.cost;
            const on = current?.kind === "OFFER" && current.id === offer.id;
            const name = offer.kind === "FERT" && offer.fert ? "Fertilizer" : info.name;
            return (
              <button
                key={offer.id}
                type="button"
                onClick={() => setPicked({ kind: "OFFER", id: offer.id })}
                aria-pressed={on}
                aria-label={`${info.name}, ${offer.cost} Seeds${sold ? ", bought" : ""}`}
                style={{ borderColor: on ? "#FCD34D" : sold ? "rgba(255,255,255,0.08)" : `${info.accent}55` }}
                className={`relative h-[118px] [@media(max-height:700px)]:h-[100px] rounded-xl border flex flex-col items-center justify-start gap-0.5 px-1 pt-[19px] transition active:scale-95 ${
                  on ? "bg-amber-300/15" : offer.kind === "RELIC" ? "bg-white/[0.07]" : "bg-white/[0.035]"
                } ${sold ? "opacity-45" : ""}`}
              >
                {offerIcon(offer, 26)}
                <span className="w-full text-center text-[10.5px] font-bold leading-tight line-clamp-2">{name}</span>
                {/* What it does, at a glance */}
                <span className="w-full text-center text-[9.5px] leading-[1.2] text-white/65 line-clamp-3 [@media(max-height:700px)]:line-clamp-2">{artify(glanceOf(offer, info))}</span>
                {/* Top row, above the art: what it adds to your best line (or New) on the left, the price on the right */}
                {!sold && gainPct(scorePreview?.[offer.id] ?? 0) > 0 ? (
                  <span className="absolute top-1 left-1 rounded-md bg-emerald-400/20 px-1 text-[10px] leading-[15px] font-mono font-black text-emerald-200">
                    {/* Short enough to sit beside the price: +45%, or ×2.9 from double up */}
                    {gainPct(scorePreview?.[offer.id] ?? 0) >= 100
                      ? `×${(1 + gainPct(scorePreview?.[offer.id] ?? 0) / 100).toFixed(1)}`
                      : `+${gainPct(scorePreview?.[offer.id] ?? 0)}%`}
                  </span>
                ) : (
                  newKinds?.includes(offer.kind) &&
                  !sold && (
                    <span className="absolute top-1 left-1 rounded-md bg-lime-300 px-1 text-[9px] leading-[15px] font-black uppercase text-slate-950">New</span>
                  )
                )}
                <PriceChip sold={sold} blocked={blocked} affordable={affordable} cost={offer.cost} />
              </button>
            );
          })}
          {canPrune && (
            <button
              type="button"
              onClick={() => setPruneOpen(true)}
              aria-haspopup="dialog"
              className={`relative h-[118px] [@media(max-height:700px)]:h-[100px] rounded-xl border flex flex-col items-center justify-start gap-0.5 px-1 pt-[19px] active:scale-95 border-white/15 bg-white/[0.035] ${
                pruned ? "opacity-45" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tileArt("WEAPON") ?? ""} alt="" aria-hidden="true" draggable={false} className="h-[26px] w-[26px] object-contain" />
              <span className="w-full text-center text-[10.5px] font-bold leading-tight line-clamp-2">Prune a tile</span>
              <span className="w-full text-center text-[9.5px] leading-[1.2] text-white/65 line-clamp-3 [@media(max-height:700px)]:line-clamp-2">Take one tile out of your bag</span>
              <PriceChip sold={pruned} blocked={false} affordable={gems >= RUN_PRUNE_COST} cost={RUN_PRUNE_COST} />
            </button>
          )}
        </div>

        {/* The tapped offer, in full */}
        <div ref={detailRef} className="min-h-[120px] [@media(max-height:700px)]:min-h-[104px] flex-1 shrink-0 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{detail}</div>
          {action}
        </div>

        {/* Your relics: tap one to see it or sell it */}
        <div>
          <div className="mb-1 text-[11px] font-semibold text-white/55">
            Your relics · {commonOwned.length}/{MAX_COMMON_RELICS}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: MAX_COMMON_RELICS }, (_, i) => {
              const id = commonOwned[i];
              const on = Boolean(id) && current?.kind === "OWNED" && current.id === id;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!id}
                  onClick={() => id && setPicked(on ? null : { kind: "OWNED", id })}
                  aria-label={id ? `${RELIC_REGISTRY[id].name}. Tap to see or sell` : "Empty relic slot"}
                  aria-pressed={on}
                  className={`h-11 rounded-lg border flex items-center justify-center ${
                    id ? (on ? "border-amber-300 bg-amber-400/20" : "border-white/15 bg-white/[0.06]") : "border-dashed border-white/15"
                  }`}
                >
                  {id && <RelicIcon id={id} size={28} />}
                </button>
              );
            })}
          </div>
        </div>
        {legendaryOwned.length > 0 && (
          <div className="-mt-1 text-[12px] text-amber-200 truncate">
            <Badge id="crown" /> {legendaryOwned.map((id) => RELIC_REGISTRY[id].name).join(" · ")}
          </div>
        )}

        {/* Up next, in one line */}
        {nextFloorTitle && (
          <div className={`text-[12.5px] leading-snug ${nextBoss ? "text-rose-100" : "text-white/65"}`}>
            Up next:{" "}
            <b>
              {nextBoss && nextBossRuleId ? (
                <>
                  <BossIcon id={nextBossRuleId} size={18} className="mr-1 -mt-0.5 align-middle" />
                  Boss Garden: {nextBoss.name}
                </>
              ) : (
                nextFloorTitle
              )}
            </b>
            {(upgrades.bonusMaxMagic > 0 || upgrades.bonusStartDew > 0) && (
              <span className="text-emerald-300">
                {upgrades.bonusMaxMagic > 0 && ` · ❤️ +${upgrades.bonusMaxMagic} Max Life`}
                {upgrades.bonusStartDew > 0 && ` · 🧤 +${upgrades.bonusStartDew} Gloves`}
              </span>
            )}
          </div>
        )}

        {/* Actions, pinned: always in reach, even when a full Shop scrolls on a small phone */}
        <div className="card-footer grid grid-cols-2 gap-2 bg-[#1B281F]" style={{ bottom: "-0.875rem", marginBottom: "-0.875rem", paddingBottom: "0.875rem" }}>
          <button
            type="button"
            onClick={onReroll}
            disabled={gems < rerollCost}
            className="h-12 rounded-xl px-2 border border-white/15 bg-white/[0.06] text-white/90 font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-40"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            Reroll · {rerollCost} 🌱
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="h-12 rounded-xl px-2 bg-teal-300 text-slate-950 font-bold text-[15px] flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            {boughtAnything ? "Continue" : "Skip the Shop"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {coach !== null && (
          <ShopCoach
            step={coach}
            cardRef={cardRef}
            targets={[seedsRef, offersRef, seedsRef]}
            texts={[
              `You earned ${gems} 🌱 by clearing the bed. Spend them here, or keep some.`,
              (() => {
                const relic = ordered.find((o) => o.kind === "RELIC");
                const p = relic ? scorePreview?.[relic.id] : undefined;
                return p && p > 0
                  ? `Relics are lasting powers for this Run. This one adds about +${p.toLocaleString()} to your best line.`
                  : "Relics are lasting powers for this Run. Tap any offer to see what it does.";
              })(),
              `Seeds you keep earn interest: +1 for every ${RUN_INTEREST_STEP} 🌱 you keep, up to +${RUN_INTEREST_MAX} after each bed.`,
            ]}
            onStep={(n) => {
              if (n === 1) {
                const relic = ordered.find((o) => o.kind === "RELIC");
                if (relic) setPicked({ kind: "OFFER", id: relic.id });
              }
              setCoach(n);
            }}
            onDone={() => setCoach(null)}
          />
        )}
      </motion.div>
      {pruneOpen && bag && onPrune && (
        <PruneSheet bag={bag} gems={gems} pruned={pruned} onPrune={onPrune} onClose={() => setPruneOpen(false)} />
      )}
    </div>
  );
}
