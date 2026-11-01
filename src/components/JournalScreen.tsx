"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { HeroClassId } from "@/types/game";
import {
  BOSS_RULE_REGISTRY,
  EDITIONS,
  FERTILIZER,
  FERT_TILES,
  GARDEN_TOOLS,
  HERO_CLASS_REGISTRY,
  RELIC_LIST,
  TOOL_IDS_WITH_ECHO,
} from "@/lib/engine";
import { GARDEN_UPGRADES, SKIP_TAGS } from "@/lib/runReplay";
import { RELIC_TAG_INFO, RelicTag } from "@/lib/relicTags";
import { BOSS_SPECIES, GARDEN_MILESTONES, SPECIES } from "@/lib/myGarden";
import { loadJournal, markJournalSeen } from "@/lib/journal";
import { journalFound } from "@/lib/journalProgress";
import { decorArt, gardenArt, relicArt, relicHasArt, themeArt, tileArt, visitorArt } from "@/lib/art";
import { VISITOR_KINDS, VISITOR_NAMES } from "@/components/GardenVisitor";
import { formatScore } from "@/lib/formatScore";
import RelicIcon from "@/components/RelicIcon";
import { MUSIC_LAYERS, MusicLayer } from "@/lib/audio";
import EntityIcon from "@/components/EntityIcon";
import { COMPANION_RULES } from "@/components/AscensionPicker";

interface Entry {
  id: string;
  name: string;
  found: boolean;
  art: React.ReactNode;
  /** What it is (shown once found) */
  text: string;
  /** How to find it (shown until then) */
  hint: string;
  /** e.g. "Beaten 3 times · best 48,200" */
  record?: string;
}

type PageId = "RELICS" | "SETS" | "GARDEN" | "BOSSES" | "SUPPLIES" | "VISITORS" | "COMPANIONS";
const PAGES: Array<{ id: PageId; label: string }> = [
  { id: "RELICS", label: "Relics" },
  { id: "SETS", label: "Sets" },
  { id: "GARDEN", label: "Garden" },
  { id: "BOSSES", label: "Bosses" },
  { id: "SUPPLIES", label: "Supplies" },
  { id: "VISITORS", label: "Visitors" },
  { id: "COMPANIONS", label: "Companions" },
];

const img = (src: string | null | undefined, size = 40) =>
  src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden="true" draggable={false} className="object-contain" style={{ width: size, height: size }} />
  ) : null;
const emoji = (e: string, size = 30) => (
  <span aria-hidden="true" className="leading-none" style={{ fontSize: size }}>
    {e}
  </span>
);

/** Everything the Journal can hold, page by page, from what this device remembers */
function buildPages(): Record<PageId, Entry[]> {
  const j = loadJournal();
  const found = journalFound();

  const relics: Entry[] = RELIC_LIST.map((r) => ({
    id: r.id,
    name: r.name,
    found: found.has(r.id),
    art: relicHasArt(r.id) ? img(relicArt(r.id), 40) : <RelicIcon id={r.id} size={36} />,
    text: r.description,
    hint: r.rarity === "LEGENDARY" ? "Beat a Boss bed to win a Legendary relic." : "Look for it in the Shop.",
  }));

  const setTags = (Object.keys(RELIC_TAG_INFO) as RelicTag[]).filter((t) => t !== "ANY");
  const sets: Entry[] = setTags.map((t) => ({
    id: t,
    name: `${RELIC_TAG_INFO[t].name} set`,
    found: found.has(t),
    art: img(themeArt(t), 38),
    text: `3 ${RELIC_TAG_INFO[t].name} relics at once: every line ×1.25. Its music layer: ${MUSIC_LAYERS[t as MusicLayer]?.icon ?? "🎵"} ${MUSIC_LAYERS[t as MusicLayer]?.name ?? ""}.`,
    hint: `Hold 3 ${RELIC_TAG_INFO[t].name} relics at the same time.`,
  }));

  const bossFor = Object.fromEntries(
    Object.entries(BOSS_SPECIES).map(([boss, species]) => [species, boss])
  ) as Record<string, keyof typeof BOSS_RULE_REGISTRY>;
  const plantNames = [...SPECIES.SMALL, ...SPECIES.BIG, ...SPECIES.SEASON, ...Object.values(BOSS_SPECIES), "Set Bloom"] as string[];
  const plants: Entry[] = plantNames.map((name) => ({
    id: `plant-${name}`,
    name,
    found: found.has(`plant-${name}`),
    art: img(gardenArt(name), 42),
    text: "Growing in your garden.",
    hint: SPECIES.SMALL.includes(name)
      ? "Clear a Small bed."
      : SPECIES.BIG.includes(name)
      ? "Clear a Big bed."
      : SPECIES.SEASON.includes(name)
      ? "Finish a whole Season."
      : name === "Set Bloom"
      ? "Complete a relic set."
      : `Beat ${BOSS_RULE_REGISTRY[bossFor[name]]?.name ?? "a Boss"}.`,
  }));
  const decor: Entry[] = GARDEN_MILESTONES.map((m) => ({
    id: `decor-${m.decor}`,
    name: m.name.replace(/^an? /, "").replace(/^\w/, (c) => c.toUpperCase()),
    found: found.has(`decor-${m.decor}`),
    art: img(decorArt(m.decor), 42),
    text: "In your garden.",
    hint: `Grow ${m.at} plants.`,
  }));

  const bosses: Entry[] = (Object.keys(BOSS_RULE_REGISTRY) as Array<keyof typeof BOSS_RULE_REGISTRY>).map((id) => {
    const rec = j.bosses[id];
    return {
      id,
      name: BOSS_RULE_REGISTRY[id].name,
      found: found.has(id),
      art: emoji(BOSS_RULE_REGISTRY[id].icon),
      text: BOSS_RULE_REGISTRY[id].description,
      hint: "Meet it on a Season's Boss bed and beat it.",
      record: rec ? `Beaten ${rec.beaten} ${rec.beaten === 1 ? "time" : "times"} · best ${formatScore(rec.best)}` : undefined,
    };
  });

  const has = (id: string) => found.has(id);
  const supplies: Entry[] = [
    ...FERT_TILES.map((t) => ({
      id: `FERT_${t}`,
      name: `Fertilizer · ${FERTILIZER[t].name}`,
      found: has(`FERT_${t}`),
      art: img(tileArt(t), 34),
      text: `Each level adds Value to every ${FERTILIZER[t].name.replace(/s$/, "")} on a line.`,
      hint: "Buy it in the Shop.",
    })),
    ...TOOL_IDS_WITH_ECHO.map((t) => ({
      id: `TOOL_${t}`,
      name: GARDEN_TOOLS[t].name,
      found: has(`TOOL_${t}`),
      art: emoji(GARDEN_TOOLS[t].icon, 26),
      text: `Garden tool: ${GARDEN_TOOLS[t].tag}, for the whole Run.`,
      hint: "Buy it in the Shop and use it on a tile.",
    })),
    ...(Object.keys(EDITIONS) as Array<keyof typeof EDITIONS>).map((e) => ({
      id: `ED_${e}`,
      name: `${EDITIONS[e].name} tile`,
      found: has(`ED_${e}`),
      art: emoji("✦", 26),
      text: `Special tile: ${EDITIONS[e].tag} on any line through it.`,
      hint: "Find one in your bag, or buy one in the Shop.",
    })),
    ...(Object.keys(GARDEN_UPGRADES) as Array<keyof typeof GARDEN_UPGRADES>).map((u) => ({
      id: `UPG_${u}`,
      name: GARDEN_UPGRADES[u].name,
      found: has(`UPG_${u}`),
      art: emoji(GARDEN_UPGRADES[u].icon, 26),
      text: `Garden upgrade: ${GARDEN_UPGRADES[u].text}.`,
      hint: GARDEN_UPGRADES[u].needs ? `Buy ${GARDEN_UPGRADES[GARDEN_UPGRADES[u].needs!].name} first, then it may appear.` : "Buy it in the Shop (one per Season).",
    })),
    ...(Object.keys(SKIP_TAGS) as Array<keyof typeof SKIP_TAGS>).map((t) => ({
      id: `TAG_${t}`,
      name: SKIP_TAGS[t].name,
      found: has(`TAG_${t}`),
      art: emoji(SKIP_TAGS[t].icon, 26),
      text: `${SKIP_TAGS[t].text}.`,
      hint: "Skip a Small bed that offers it.",
    })),
  ];

  const companions: Entry[] = (Object.keys(HERO_CLASS_REGISTRY) as HeroClassId[]).map((id) => {
    const rec = j.companions[id];
    const def = HERO_CLASS_REGISTRY[id];
    return {
      id,
      name: def.sanctuaryShortName ?? def.shortName,
      found: found.has(id),
      art: <EntityIcon type="HERO" companionId={id} size={38} />,
      text: COMPANION_RULES[id] ?? "",
      hint: "Play a Run with this companion (unlock it with stars).",
      record: rec ? `Best Run ${formatScore(rec.best)} · reached bed ${rec.deepest + 1}` : undefined,
    };
  });

  const visitors: Entry[] = VISITOR_KINDS.map((k) => ({
    id: `VIS_${k}`,
    name: VISITOR_NAMES[k],
    found: found.has(`VIS_${k}`),
    art: img(visitorArt(k), 38),
    text: "A friendly visitor to your garden.",
    hint: "Visitors wander the board and My Garden now and then. Tap one to say hello.",
  }));

  return { RELICS: relics, SETS: sets, GARDEN: [...plants, ...decor], BOSSES: bosses, SUPPLIES: supplies, VISITORS: visitors, COMPANIONS: companions };
}

/** The Garden Journal: a collection book, with hints for what's still missing */
export default function JournalScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [page, setPage] = useState<PageId>("RELICS");
  const [picked, setPicked] = useState<Entry | null>(null);
  const pages = useMemo(() => (open ? buildPages() : null), [open]);
  // NEW dots: found entries not looked at before this visit (snapshot when the Journal opens)
  const seenAtOpen = useMemo(() => (open ? new Set(loadJournal().seen ?? []) : new Set<string>()), [open]);
  useEffect(() => {
    if (!open || !pages) return;
    markJournalSeen(pages[page].filter((e) => e.found).map((e) => e.id));
  }, [open, pages, page]);
  if (!open || !pages) return null;
  const isNew = (e: Entry) => e.found && !seenAtOpen.has(e.id);

  const all = Object.values(pages).flat();
  const total = all.filter((e) => e.found).length;
  const pct = Math.round((total / all.length) * 100);
  const entries = pages[page];

  return (
    <div
      className={`ui-zoom fixed inset-0 z-[70] flex flex-col bg-[#18231C] select-none ${pct >= 100 ? "ring-4 ring-inset ring-amber-300/60" : ""}`}
    >
      <div className="w-full max-w-[430px] mx-auto px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[24px] font-display font-semibold text-amber-50 leading-tight">Garden Journal</h2>
            <div className="text-[12.5px] text-white/60">
              {total} of {all.length} found · {pct}%
              {pct >= 25 && <span className="ml-1.5 rounded-full bg-amber-300/15 px-1.5 py-px text-[11px] font-semibold text-amber-100">📖 Botanist</span>}
              {pct >= 100 && <span className="ml-1 text-amber-200">✨ complete</span>}
            </div>
            {pct < 100 && (
              <div className="text-[11px] text-white/45">
                {pct < 25 ? "25%: Botanist title" : pct < 50 ? "50%: Pressed Petal line" : pct < 75 ? "75%: Herbarium board" : "100%: Golden Leaf line"}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the Journal"
            className="h-10 w-10 rounded-full bg-white/[0.08] flex items-center justify-center active:scale-95"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-amber-300/80" style={{ width: `${pct}%` }} />
        </div>
        {/* Pages */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {PAGES.map((p) => {
            const list = pages[p.id];
            const n = list.filter((e) => e.found).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPage(p.id);
                  setPicked(null);
                }}
                aria-pressed={page === p.id}
                className={`shrink-0 h-8 px-3 rounded-full border text-[12px] font-semibold ${
                  page === p.id ? "bg-amber-300 text-slate-950 border-amber-200" : "bg-white/[0.05] border-white/10 text-white/75"
                }`}
              >
                {p.label} {n}/{list.length}
                {list.some(isNew) && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-lime-300 align-middle" aria-label="new" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-[430px] mx-auto px-4 pb-28">
        <div className="grid grid-cols-4 gap-2 pt-1">
          {entries.map((e, i) => (
            <motion.button
              key={e.id}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { delay: Math.min(0.4, i * 0.015) } }}
              onClick={() => setPicked(picked?.id === e.id ? null : e)}
              aria-label={e.found ? e.name : `Not found yet: ${e.hint}`}
              className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 px-1 ${
                picked?.id === e.id ? "border-amber-300 bg-amber-400/10" : e.found ? "border-white/10 bg-white/[0.05]" : "border-dashed border-white/10 bg-black/20"
              }`}
            >
              <span style={e.found ? undefined : { filter: "brightness(0) opacity(0.35)" }} className="flex items-center justify-center">
                {e.art}
              </span>
              {isNew(e) && (
                <span className="absolute top-1 right-1 rounded-full bg-lime-300 px-1 text-[8px] font-black leading-[12px] text-slate-950">
                  NEW
                </span>
              )}
              <span className={`w-full truncate text-center text-[9.5px] leading-tight ${e.found ? "text-white/75" : "text-white/30"}`}>
                {e.found ? e.name : "?"}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {picked && (
          <motion.div
            key={picked.id}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onClick={() => setPicked(null)}
            className="absolute inset-x-0 bottom-4 mx-auto w-[calc(100%-2rem)] max-w-[398px] rounded-2xl border border-white/10 bg-[#1F2E24] px-4 py-3 text-white shadow-2xl"
          >
            <div className="font-display text-[16px] font-bold">{picked.found ? picked.name : "Not found yet"}</div>
            <div className="font-hand text-[13px] leading-snug text-white/75">{picked.found ? picked.text : picked.hint}</div>
            {picked.found && picked.record && <div className="mt-0.5 text-[12px] font-semibold text-amber-200">{picked.record}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
