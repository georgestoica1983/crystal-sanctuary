"use client";

import { useBackClose } from "@/lib/backClose";
import { BackButton } from "@/components/SheetBits";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MUSIC_LAYERS, soundEngine } from "@/lib/audio";
import {
  earnedMusicLayers,
  GARDEN_MILESTONES,
  MyGarden,
  Plant,
  plantLook,
  plantSpot,
  plantedAgo,
  visitMyGarden,
  VISITOR_MILESTONES,
  VISITOR_NAMES,
  VisitorKind,
} from "@/lib/myGarden";
import { formatScore } from "@/lib/formatScore";
import { decorArt, visitorArt } from "@/lib/art";
import { DayPhase, getDayPhase, getYearSeason, loadFollowTimeOfDay, YearSeason } from "@/lib/timeOfDay";

const BED_NAMES = ["Small", "Big", "Boss"];

/** The sky over the garden, by time of day */
const SKY: Record<DayPhase, string> = {
  DAWN: "from-[#3B2A3A] via-[#2E3A2C] to-[#2C3F23]",
  DAY: "from-[#1C2B22] via-[#20331F] to-[#2C3F23]",
  GOLDEN: "from-[#3A2A16] via-[#2C3420] to-[#2A3A20]",
  NIGHT: "from-[#0B1424] via-[#132029] to-[#1A2A1E]",
};
/** Plants that glow softly after dark */
const NIGHT_GLOW = new Set(["Moonflower", "Mist Orchid", "Set Bloom"]);

/** Where each visitor rests once it has arrived */
const VISITOR_SPOTS: Record<VisitorKind, React.CSSProperties> = {
  ladybug: { left: "60%", bottom: "16%", width: "8%" },
  bee: { left: "22%", top: "18%", width: "8%" },
  butterfly: { right: "24%", top: "30%", width: "9%" },
  snail: { right: "8%", bottom: "6%", width: "9%" },
};

/** Where each milestone decoration sits (behind the plants, except the front ones) */
const DECOR_SPOTS: Array<{ key: string; at: number; decor: string; label: string; style: React.CSSProperties; z: number }> = [
  { key: "stones", at: 5, decor: "stepping-stones", label: "Stepping stones", style: { left: "38%", bottom: "2%", width: "22%" }, z: 120 },
  { key: "bench", at: 10, decor: "bench", label: "Bench", style: { right: "4%", top: "24%", width: "21%" }, z: 30 },
  { key: "pond", at: 25, decor: "pond", label: "Pond", style: { left: "4%", top: "42%", width: "38%" }, z: 5 },
  { key: "birdbath", at: 40, decor: "bird-bath", label: "Bird bath", style: { left: "68%", top: "50%", width: "13%" }, z: 60 },
  { key: "lantern1", at: 50, decor: "lantern", label: "Lantern", style: { left: "2%", top: "12%", width: "11%" }, z: 20 },
  { key: "lantern2", at: 50, decor: "lantern", label: "Lantern", style: { right: "3%", top: "58%", width: "11%" }, z: 70 },
  { key: "chime", at: 75, decor: "wind-chime", label: "Wind chime", style: { right: "14%", top: "3%", width: "9%" }, z: 10 },
  { key: "arch", at: 100, decor: "arch", label: "Flower arch", style: { left: "33%", top: "-1%", width: "34%" }, z: 8 },
  { key: "gate", at: 150, decor: "gate", label: "Garden gate", style: { left: "6%", bottom: "1%", width: "26%" }, z: 125 },
];
/** Past this many plants, new ones make older spots bloom fuller instead of crowding */
const MAX_SPOTS = 60;

/**
 * My Garden: a calm scene of everything the player has grown. Flowers sway,
 * pollen drifts, a touch makes a flower ring and tells its story. After a few
 * days away it opens sleepy and gently wakes up.
 */
export default function MyGardenScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [garden, setGarden] = useState<MyGarden | null>(null);
  const [sleepy, setSleepy] = useState(false);
  const [picked, setPicked] = useState<Plant | null>(null);
  const [pokes, setPokes] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<DayPhase>("DAY");
  const [season, setSeason] = useState<YearSeason>("SPRING");

  useEffect(() => {
    if (!open) return;
    const follow = loadFollowTimeOfDay();
    setPhase(follow ? getDayPhase() : "DAY");
    setSeason(getYearSeason());
    const visit = visitMyGarden();
    setGarden(visit.garden);
    setPicked(null);
    setSleepy(visit.wasSleepy);
    if (visit.wasSleepy) {
      // The garden wakes up: buds open and a soft rising chime
      const id = window.setTimeout(() => {
        setSleepy(false);
        soundEngine.playFloorClear();
      }, 900);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Spots: one per plant up to MAX_SPOTS; later plants make earlier spots fuller
  const spots = useMemo(() => {
    const plants = garden?.plants ?? [];
    const shown = plants.slice(0, MAX_SPOTS).map((p) => ({ plant: p, fullness: 1 }));
    plants.slice(MAX_SPOTS).forEach((p, i) => {
      const s = shown[i % MAX_SPOTS];
      s.fullness += 1;
      s.plant = p;
    });
    return shown
      .map((s) => ({ ...s, spot: plantSpot(s.plant.id) }))
      .sort((a, b) => a.spot.y - b.spot.y);
  }, [garden]);

  useBackClose(open, onClose);
  if (!open) return null;
  const count = garden?.plants.length ?? 0;
  const reached = GARDEN_MILESTONES.filter((m) => count >= m.at);
  const next = GARDEN_MILESTONES.find((m) => count < m.at);
  const has = (at: number) => reached.some((m) => m.at === at);

  const touch = (p: Plant, i: number) => {
    setPokes((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 }));
    setPicked(p);
    soundEngine.playTilePoke(i % 10);
  };

  return (
    <div className={`ui-zoom fixed inset-0 z-[70] flex flex-col bg-gradient-to-b ${SKY[phase]} select-none transition-colors duration-1000`}>
      {/* Header: Back (top left, where phones put it), then the title */}
      <div className="px-4 pt-2 max-w-[430px] w-full mx-auto">
        <BackButton onClick={onClose} label="Back to the game" />
      </div>
      <div className="flex items-start justify-between gap-2 px-4 pb-2 max-w-[430px] w-full mx-auto">
        <div>
          <h2 className="text-[24px] font-display font-semibold text-amber-50 leading-tight">My Garden</h2>
          <div className="text-[12.5px] text-white/60">
            {count === 0
              ? "Nothing planted yet"
              : `${count} ${count === 1 ? "plant" : "plants"}`}
            {next && count > 0 && (
              <span className="text-emerald-200/80">
                {" "}
                · {next.at - count} more → {next.icon} {next.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The garden */}
      <div className="relative flex-1 w-full max-w-[430px] mx-auto overflow-hidden">
        {/* Soft ground and light */}
        <div
          className={`absolute inset-x-0 bottom-0 top-[6%] rounded-t-[48%] bg-gradient-to-b transition-colors duration-1000 ${
            phase === "NIGHT"
              ? "from-[#22361F]/70 to-[#152517]"
              : phase === "GOLDEN"
              ? "from-[#4A5530]/70 to-[#2E3A20]"
              : "from-[#3A5230]/70 to-[#2A3D22]"
          }`}
        />
        <div
          className={`absolute -top-10 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl ${
            phase === "NIGHT" ? "bg-sky-200/[0.05]" : phase === "GOLDEN" ? "bg-amber-300/[0.14]" : phase === "DAWN" ? "bg-pink-200/[0.10]" : "bg-amber-200/[0.06]"
          }`}
        />
        {phase === "NIGHT" && (
          <div
            aria-hidden="true"
            className="absolute right-[10%] top-[1%] h-10 w-10 rounded-full bg-amber-50/90 shadow-[0_0_30px_8px_rgba(254,243,199,0.35)]"
            title="Moon"
          />
        )}
        {/* The real season, on the ground */}
        {season === "WINTER" && (
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-[6%] rounded-t-[48%] bg-gradient-to-b from-white/[0.10] to-white/[0.03]" />
        )}
        {season === "AUTUMN" &&
          Array.from({ length: 7 }, (_, i) => (
            <span
              key={`leaf-${i}`}
              aria-hidden="true"
              className="garden-leaf absolute h-2 w-1.5 rounded-[60%_40%_60%_40%] bg-orange-400/70"
              style={{ left: `${(i * 29) % 95}%`, top: "-2%", animationDelay: `${i * 1.9}s` }}
            />
          ))}

        {/* Milestone decorations, each in its own spot */}
        {DECOR_SPOTS.filter((d) => has(d.at)).map((d) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={d.key}
            src={decorArt(d.decor)}
            alt={d.label}
            draggable={false}
            className={`absolute object-contain drop-shadow-[0_3px_3px_rgba(0,0,0,0.4)] ${d.decor === "lantern" ? "living-lantern" : ""}`}
            style={{ ...d.style, zIndex: d.z }}
          />
        ))}

        {/* Plants: back rows smaller, front rows larger */}
        <div className="absolute inset-0" style={{ filter: sleepy ? "saturate(0.45) brightness(0.8)" : undefined, transition: "filter 1.2s ease" }}>
          {spots.map(({ plant, spot, fullness }, i) => {
            const look = plantLook(plant);
            const base = (plant.kind === "SEASON" ? 62 : plant.kind === "BOSS" ? 46 : 40) * (0.7 + spot.y * 0.5);
            const size = Math.round(base * Math.min(1.6, 1 + (fullness - 1) * 0.15));
            return (
              <motion.button
                key={`${plant.id}-${pokes[plant.id] ?? 0}`}
                type="button"
                onClick={() => touch(plant, i)}
                aria-label={`${plant.golden ? "Golden " : ""}${plant.species}`}
                initial={pokes[plant.id] ? { rotate: 12 } : { scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: sleepy ? 0.85 : 1, opacity: 1 }}
                transition={
                  pokes[plant.id]
                    ? { type: "spring", stiffness: 240, damping: 6 }
                    : { type: "spring", stiffness: 180, damping: 14, delay: Math.min(1.2, i * 0.025) }
                }
                className="absolute origin-bottom garden-sway"
                style={{
                  left: `${spot.x * 100}%`,
                  top: `${12 + spot.y * 84}%`,
                  x: "-50%",
                  y: "-100%",
                  zIndex: 10 + Math.round(spot.y * 100),
                  animationDelay: `${(i % 7) * 0.6}s`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={look.src}
                  alt=""
                  draggable={false}
                  className="object-contain drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)]"
                  style={{
                    width: size,
                    height: size,
                    filter:
                      phase === "NIGHT" && NIGHT_GLOW.has(plant.species)
                        ? `${look.filter === "none" ? "" : look.filter} drop-shadow(0 0 8px rgba(224,231,255,0.85))`
                        : look.filter,
                  }}
                />
                {plant.golden && <span className="absolute -top-1 -right-1 text-[10px]" aria-hidden="true">✨</span>}
              </motion.button>
            );
          })}
        </div>

        {/* Visitors: collection pieces that settle in the garden at their milestones (still, never wandering) */}
        {VISITOR_MILESTONES.filter((v) => count >= v.at).map((v) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={v.kind}
            src={visitorArt(v.kind)}
            alt={VISITOR_NAMES[v.kind]}
            draggable={false}
            className="absolute object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]"
            style={{ ...VISITOR_SPOTS[v.kind], zIndex: 110 }}
          />
        ))}

        {/* Drifting pollen by day, fireflies by night */}
        {count > 0 &&
          Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={phase === "NIGHT" ? "firefly absolute h-1.5 w-1.5 rounded-full bg-lime-200" : "garden-pollen absolute h-1 w-1 rounded-full bg-amber-100/60"}
              style={{ left: `${(i * 37 + 11) % 97}%`, top: `${12 + ((i * 53) % 78)}%`, animationDelay: `${i * 1.3}s` }}
            />
          ))}

        {count === 0 && (
          <div className="absolute inset-x-8 top-1/3 text-center text-[14px] leading-relaxed text-white/70">
            Your garden is waiting.
            <br />
            Clear a Garden Bed and your first flower grows here, and it stays forever.
          </div>
        )}
      </div>

      {/* The garden's music: one layer per relic set ever completed */}
      {count > 0 && (() => {
        const layers = earnedMusicLayers();
        const newest = layers[layers.length - 1];
        return (
          <button
            type="button"
            onClick={() => newest && soundEngine.previewMusicLayer(newest)}
            disabled={!newest}
            className="mx-auto mb-2 w-[calc(100%-2rem)] max-w-[398px] rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-left text-[12.5px] text-white/75"
          >
            🎵 Your garden&apos;s music: <b className="text-amber-100">{layers.length} of 8 layers</b>
            <span className="block text-[11.5px] text-white/50">
              {newest
                ? `Newest: ${MUSIC_LAYERS[newest].icon} ${MUSIC_LAYERS[newest].name}. Tap to hear it`
                : "Complete a relic set to add its layer to the music."}
            </span>
          </button>
        );
      })()}

      {/* A flower's story */}
      <AnimatePresence>
        {picked && (
          <motion.div
            key={picked.id}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="mx-auto mb-4 w-[calc(100%-2rem)] max-w-[398px] rounded-2xl border border-white/10 bg-[#1A271E]/95 px-4 py-3 text-white shadow-2xl"
            onClick={() => setPicked(null)}
          >
            <div className="font-display text-[16px] font-bold">
              {picked.golden ? "✨ Golden " : ""}
              {picked.species}
            </div>
            <div className="font-hand text-[13px] leading-snug text-white/70">
              {picked.kind === "SET"
                ? `Grew from your first relic set · ${plantedAgo(picked.at)}`
                : picked.kind === "SEASON"
                ? `Grew when you finished Season ${picked.from.season} · ${plantedAgo(picked.at)}`
                : `Planted after Season ${picked.from.season} · ${BED_NAMES[picked.from.bed % 3]} bed · ${formatScore(picked.from.score)} points · ${plantedAgo(picked.at)}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sleepy && (
        <div className="pointer-events-none absolute inset-x-0 top-24 text-center text-[13px] text-white/70">
          The garden was resting… it&apos;s waking up 🌙
        </div>
      )}
    </div>
  );
}
