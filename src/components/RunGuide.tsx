"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EntityType, RelicCategory } from "@/types/game";
import EntityIcon, { ENTITY_COLORS } from "@/components/EntityIcon";
import {
  BOSS_RULE_REGISTRY,
  getRunGardenTarget,
  getRunSeasonGrowth,
  HERO_CLASS_LIST,
  getRelicSellValue,
  MAX_COMMON_RELICS,
  RELIC_LIST,
  RUN_CLEAR_REWARD,
  RUN_ENDLESS_GROWTH,
  RUN_FINAL_SEASON,
  RUN_INTEREST_MAX,
  RUN_INTEREST_STEP,
  RUN_REROLL_BASE_COST,
  RUN_SEED_BAG_SIZE,
  RUN_STROKES_PER_GARDEN,
  RUN_WEEDOUT_MAX_TILES,
  RUN_WEEDOUTS_PER_GARDEN,
  SHOP_STAT_BOOSTS,
} from "@/lib/engine";
import { getRelicDisplay } from "@/lib/sanctuaryCopy";
import { RELIC_SET_SIZE, RELIC_SET_X } from "@/lib/relicTags";
import RelicIcon from "@/components/RelicIcon";

export const RUN_GUIDE_STORAGE_KEY = "ost_run_guide_seen_v1";

const fmt = (n: number) => n.toLocaleString();

/** A board tile as it looks in the garden: icon plus its number */
function Tile({
  type,
  value,
  label,
  size = 44,
}: {
  type: EntityType;
  value?: number;
  label?: string;
  size?: number;
}) {
  const color = ENTITY_COLORS[type] ?? "#fff";
  return (
    <div
      className="relative shrink-0 rounded-xl bg-[#223328] border border-white/10 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <EntityIcon type={type} size={size * 0.62} glow />
      {value !== undefined && (
        <span
          className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-black flex items-center justify-center bg-[#0F1812] border"
          style={{ color, borderColor: color }}
        >
          {value}
        </span>
      )}
      {label && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 rounded text-[8px] font-mono font-black bg-amber-300 text-slate-950">
          {label}
        </span>
      )}
    </div>
  );
}

function Row({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start rounded-xl bg-white/[0.04] border border-white/10 p-2.5">
      <div className="pt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-black text-white">{title}</div>
        <div className="text-[12px] leading-snug text-indigo-100/85 space-y-1">{children}</div>
      </div>
    </div>
  );
}

function Example({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-400/[0.07] p-2.5">
      <div className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-200 mb-1">
        {title}
      </div>
      <div className="text-[12px] leading-snug text-amber-50/90 space-y-1">{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-indigo-50/90">{children}</p>;
}

function B({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-white">{children}</span>;
}

/** Mini 3×3 picture of a line: numbers show the order of the steps */
function MiniLine({
  cells,
}: {
  cells: Array<{ type: EntityType | null; step?: number; value?: number; label?: string }>;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 w-[156px] shrink-0">
      {cells.map((c, i) =>
        c.type ? (
          <div key={i} className="relative">
            <Tile type={c.type} value={c.value} label={c.label} size={48} />
            {c.step !== undefined && (
              <span className="absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full bg-cyan-300 text-slate-950 text-[10px] font-mono font-black flex items-center justify-center">
                {c.step}
              </span>
            )}
          </div>
        ) : (
          <div key={i} className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5" />
        )
      )}
    </div>
  );
}

interface GuidePage {
  title: string;
  icon: string;
  body: React.ReactNode;
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-[14px] leading-snug text-white/85">
          <span className="text-teal-300 shrink-0" aria-hidden="true">•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function TileLine({ type, value, name, text }: { type: EntityType; value?: number; name: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <Tile type={type} value={value} size={44} />
      <div className="text-[14px] leading-snug text-white/85">
        <B>{name}</B> {text}
      </div>
    </div>
  );
}

function buildPages(): GuidePage[] {
  const commonRelics = RELIC_LIST.filter((r) => r.rarity !== "LEGENDARY").map((r) =>
    getRelicDisplay(r, true)
  );
  const relicGroups: Array<{ category: RelicCategory; title: string }> = [
    { category: "CHIPS", title: "More value" },
    { category: "MULT", title: "More length" },
    { category: "XMULT", title: "Multipliers" },
    { category: "ECONOMY", title: "Seeds" },
    { category: "MAGIC", title: "Life and defence" },
  ];
  const legendaryRelics = RELIC_LIST.filter((r) => r.rarity === "LEGENDARY").map((r) =>
    getRelicDisplay(r, true)
  );

  return [
    {
      title: "How to play",
      icon: "🌸",
      body: (
        <>
          <div className="flex gap-3 items-center">
            <Tile type="HERO" label="YOU" size={48} />
            <span className="text-xl text-white/40" aria-hidden="true">→</span>
            <Tile type="EXIT" label="EXIT" size={48} />
          </div>
          <Bullets
            items={[
              <>Drag one line from <B>YOU</B> to the <B>🌈 EXIT</B>, then let go.</>,
              <><B>Longer lines score far more.</B></>,
              <>Don&apos;t run out of <B>❤️ Life</B>.</>,
              <>Reach the garden&apos;s <B>target</B> in {RUN_STROKES_PER_GARDEN} lines.</>,
              <>Clear Garden Beds, earn 🌱 Seeds, buy relics. It gets harder each Season.</>,
            ]}
          />
        </>
      ),
    },
    {
      title: "Tiles",
      icon: "🧩",
      body: (
        <div className="space-y-2.5">
          <TileLine type="ENEMY" value={5} name="Thorn" text="costs ❤️ Life." />
          <TileLine type="WEAPON" value={5} name="Shears" text="cut the next Thorn completely." />
          <TileLine type="SHIELD" value={5} name="Gloves" text="block Thorn damage, and last." />
          <TileLine type="POTION" value={5} name="Berries" text="give back ❤️ Life." />
          <TileLine type="GOLD" value={5} name="Acorn" text="adds points." />
          <TileLine type="TRAP" value={3} name="Spike" text="costs ❤️ Life — step on it diagonally ↗ to dodge." />
          <P>Tap any tile on the board to read what it does.</P>
        </div>
      ),
    },
    {
      title: "Scoring",
      icon: "🧮",
      body: (
        <>
          <div className="rounded-xl border-2 border-amber-300/70 bg-amber-400/10 p-2.5 text-center font-mono font-black text-amber-100">
            <span className="text-sky-300">Value</span> × <span className="text-emerald-300">Length</span>
          </div>
          <Bullets
            items={[
              <><B>Value</B> = the numbers on the tiles your line passes — every tile counts, even 🌺 Thorns. Risk = reward.</>,
              <><B>Length</B> = how many tiles the line has.</>,
              <>Both grow with every tile — so a line twice as long scores about <B>4×</B>.</>,
              <>The meter above the board shows the score live while you draw.</>,
            ]}
          />
        </>
      ),
    },
    {
      title: "A Garden Bed",
      icon: "🌸",
      body: (
        <Bullets
          items={[
            <>You get <B>{RUN_STROKES_PER_GARDEN} lines</B>. Each adds to the bar.</>,
            <>Used tiles are replaced with new ones from your Tile Bag.</>,
            <>❤️ Life, 🧤 Gloves and ✂️ Shears carry over between lines. Clearing a Garden Bed gives back +3 ❤️.</>,
            <><B>🌿 Swap</B> ({RUN_WEEDOUTS_PER_GARDEN} per garden): change up to {RUN_WEEDOUT_MAX_TILES} tiles.</>,
            <><B>✨ Hint</B> (1 per garden): lights up a good route.</>,
            <>If a line would run out of Life, it pulls back and shows why.</>,
          ]}
        />
      ),
    },
    {
      title: "Seasons and the Shop",
      icon: "🗓️",
      body: (
        <>
          <Bullets
            items={[
              <>Each Season: <B>Small</B>, <B>Big</B> and <B>Boss</B> garden.</>,
              <>Targets rise every Season, and Thorns get stronger.</>,
              <>Boss gardens have a twist — beat one for a Legendary relic.</>,
              <>Clearing a Garden Bed pays 🌱 Seeds: {RUN_CLEAR_REWARD.SMALL}/{RUN_CLEAR_REWARD.BIG}/{RUN_CLEAR_REWARD.BOSS}, +1 per unused line, +1 per {RUN_INTEREST_STEP} 🌱 you&apos;ve saved (max +{RUN_INTEREST_MAX}).</>,
              <>In the Shop: buy relics and boosts, or reroll ({RUN_REROLL_BASE_COST} 🌱). You can hold {MAX_COMMON_RELICS} relics.</>,
            ]}
          />
          <div className="rounded-xl border border-white/10 overflow-hidden text-[12px] font-mono">
            <div className="grid grid-cols-4 bg-white/10 font-black text-white">
              <span className="px-2 py-1">Season</span>
              <span className="px-2 py-1">Small</span>
              <span className="px-2 py-1">Big</span>
              <span className="px-2 py-1">Boss</span>
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="grid grid-cols-4 odd:bg-white/[0.03] text-white/80">
                <span className="px-2 py-0.5">{n}</span>
                <span className="px-2 py-0.5">{fmt(getRunGardenTarget(n, "SMALL"))}</span>
                <span className="px-2 py-0.5">{fmt(getRunGardenTarget(n, "BIG"))}</span>
                <span className="px-2 py-0.5">{fmt(getRunGardenTarget(n, "BOSS"))}</span>
              </div>
            ))}
          </div>
          <P>After Season {RUN_FINAL_SEASON} the Run keeps going until you lose.</P>
        </>
      ),
    },
    {
      title: "Relics",
      icon: "🧿",
      body: (
        <>
          <P>Lasting powers for your Run. Mix them — they multiply each other. 📈 = grows every Garden Bed.</P>
          <P>
            Each relic has a theme tag (🌺 Thorns, 🌰 Acorns…). Hold <B>{RELIC_SET_SIZE} relics with one tag</B> for a set:
            every line scores <B>×{RELIC_SET_X}</B>. ⭐ Any build relics never count.
          </P>
          {relicGroups.map((g) => (
            <React.Fragment key={g.category}>
              <div className="text-[12px] font-bold text-teal-200 pt-1">{g.title}</div>
              {commonRelics
                .filter((r) => (r.category ?? "MAGIC") === g.category)
                .map((r) => (
                  <div key={r.id} className="flex gap-2.5 items-start">
                    <RelicIcon id={r.id} size={28} />
                    <div className="text-[13px] leading-snug text-white/80">
                      <B>{r.name}</B> · {r.cost ?? 10} 🌱{r.scaling ? " 📈" : ""}
                      <div className="text-white/60">{r.description}</div>
                    </div>
                  </div>
                ))}
            </React.Fragment>
          ))}
          <div className="text-[12px] font-bold text-fuchsia-200 pt-1">Legendary (Boss rewards)</div>
          {legendaryRelics.map((r) => (
            <div key={r.id} className="flex gap-2.5 items-start">
              <RelicIcon id={r.id} size={28} />
              <div className="text-[13px] leading-snug text-white/80">
                <B>{r.name}</B>
                <div className="text-white/60">{r.description}</div>
              </div>
            </div>
          ))}
        </>
      ),
    },
  ];
}

/** Multi-page How-to-play guide for the Run (shown on first launch) */
export default function RunGuide({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const [showIndex, setShowIndex] = useState(false);
  const pages = React.useMemo(buildPages, []);
  if (!isOpen) return null;
  const current = pages[page];
  const isLast = page === pages.length - 1;
  const close = () => {
    setPage(0);
    setShowIndex(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-3">
      <div className="relative w-full max-w-[440px] sm:max-h-[92dvh] flex flex-col bg-gradient-to-b from-[#1F3125] via-[#1A281F] to-[#111A14] rounded-2xl border border-emerald-300/40 shadow-[0_0_40px_rgba(52,211,153,0.25)] text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-white/10">
          <button
            type="button"
            onClick={() => setShowIndex((v) => !v)}
            className="h-9 text-[11px] font-mono font-black uppercase tracking-wider text-emerald-200 px-3 rounded-lg bg-white/5 border border-white/10"
            aria-expanded={showIndex}
          >
            ☰ {page + 1}/{pages.length}
          </button>
          <div className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-emerald-300">
            Rules
          </div>
          <button
            type="button"
            onClick={close}
            className="h-9 text-[12px] font-mono font-bold px-3 rounded-lg bg-white/10 text-zinc-200"
          >
            {isLast ? "Close" : "Skip"}
          </button>
        </div>

        {/* Progress */}
        <div className="flex px-2 pt-1">
          {pages.map((p, i) => (
            <button
              key={p.title}
              type="button"
              aria-label={`Go to ${p.title}`}
              onClick={() => setPage(i)}
              className="h-7 flex-1 px-0.5 flex items-center"
            >
              <span
                className={`block h-1.5 w-full rounded-full transition ${
                  i <= page ? "bg-emerald-300" : "bg-white/15"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Chapter list */}
        {showIndex && (
          <div className="mx-3 mt-2 rounded-xl border border-white/10 bg-[#111A14] p-1.5 grid grid-cols-1 gap-0.5 max-h-[50dvh] overflow-y-auto">
            {pages.map((p, i) => (
              <button
                key={p.title}
                type="button"
                onClick={() => {
                  setPage(i);
                  setShowIndex(false);
                }}
                className={`text-left text-[12px] px-2 py-1.5 rounded-lg ${
                  i === page ? "bg-emerald-400/20 text-white font-bold" : "text-indigo-100/85 hover:bg-white/5"
                }`}
              >
                {p.icon} {i + 1}. {p.title}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="space-y-2.5"
            >
              <h2 className="text-lg font-black text-emerald-100 flex items-center gap-2">
                <span className="text-2xl">{current.icon}</span>
                {current.title}
              </h2>
              {current.body}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {!isLast && (
            <div className="text-[11px] font-mono text-indigo-200/70 text-center leading-snug">
              Up next: <span className="text-emerald-100 font-bold">{pages[page + 1].title}</span>
            </div>
          )}
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="h-11 rounded-xl bg-white/10 border border-white/15 text-xs font-mono font-bold disabled:opacity-30"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => (isLast ? close() : setPage((p) => p + 1))}
              className="h-11 rounded-xl bg-emerald-300 text-slate-950 text-xs font-mono font-black"
            >
              {isLast ? "Start playing 🌸" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
