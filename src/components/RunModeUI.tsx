"use client";

import Badge from "@/components/Badge";
import BossIcon from "@/components/BossIcon";
import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PartyPopper, Sparkles, Trophy } from "lucide-react";
import EntityIcon from "@/components/EntityIcon";
import { BossRuleId, GridCell, GridCoord, RelicId, RunGardenState } from "@/types/game";
import {
  BOSS_RULE_REGISTRY,
  getRunGardenKindLabel,
  getRunGardenLabel,
  getRunGardenPosition,
  RELIC_REGISTRY,
  RUN_FINAL_SEASON,
  RUN_INTEREST_MAX,
  RUN_INTEREST_STEP,
  RUN_STROKES_PER_GARDEN,
  RUN_WEEDOUT_MAX_TILES,
  RUN_WEEDOUTS_PER_GARDEN,
  WEATHER_INFO,
} from "@/lib/engine";
import RelicIcon from "@/components/RelicIcon";
import { dailyArt, miscArt, tileArt, weatherArt } from "@/lib/art";
import { pickNextGoal } from "@/lib/unlocks";
import { DailyRecord, dailyGridRows, dailyShareText } from "@/lib/daily";
import { seedCodeLink } from "@/lib/seedCode";
import { CLOSER_TIP } from "@/lib/tips";

const BLOOM_ART = tileArt("ENEMY", { bloomed: true }) ?? "";
import { soundEngine } from "@/lib/audio";
import { artify } from "@/components/ArtText";
import { formatScore } from "@/lib/formatScore";
import { FEEDBACK_URL, markFeedbackAsked, shouldAskFeedback, track } from "@/lib/analytics";
import UnlockIcon from "@/components/UnlockIcon";

const fmt = formatScore;

/** Season · garden, target, score bar, lines and weed-outs */
const BED_SHORT: Record<RunGardenState["kind"], string> = { SMALL: "Small bed", BIG: "Big bed", BOSS: "Boss bed" };

export function RunHudStrip({
  garden,
  previewScore,
  noSafeLine,
  weedOutActive,
  weedOutCount = 0,
  onToggleWeedOut,
  onConfirmWeedOut,
  suggestSwap = false,
  asc = 0,
  upcomingBoss = null,
  bare = false,
  onBossPreview,
}: {
  /** Tapping the coming Boss on the Season dots shows its card */
  onBossPreview?: (id: BossRuleId) => void;
  /** Drawn inside the top card (no border or background of its own) */
  bare?: boolean;
  /** The Season's Boss rule, previewed before its bed (from the Run's seed) */
  upcomingBoss?: BossRuleId | null;
  garden: RunGardenState;
  previewScore: number | null;
  noSafeLine: boolean;
  weedOutActive: boolean;
  weedOutCount?: number;
  onToggleWeedOut: () => void;
  onConfirmWeedOut?: () => void;
  /** The board looks too weak for the target: Swap glows gently */
  suggestSwap?: boolean;
  /** Ascension level of this Garden Run */
  asc?: number;
}) {
  const pct = Math.min(100, (garden.score / garden.target) * 100);
  const previewPct =
    previewScore && previewScore > 0
      ? Math.min(100 - pct, (previewScore / garden.target) * 100)
      : 0;
  const isBoss = garden.kind === "BOSS";
  const boss = garden.bossRuleId ? BOSS_RULE_REGISTRY[garden.bossRuleId] : null;
  const strokesTotal = garden.strokesTotal ?? RUN_STROKES_PER_GARDEN;
  const strokesUsed = strokesTotal - garden.strokesLeft;
  const [bossOpen, setBossOpen] = useState(false);
  // A weak board is told in the line meter and by the glowing Swap button now
  void noSafeLine;
  // The Swap button under the board confirms a swap now
  void onConfirmWeedOut;
  void suggestSwap;
  return artify(
    <div
      className={
        bare
          ? "w-full min-w-0 px-1 pb-0.5 space-y-1.5"
          : `w-full max-w-game min-w-0 rounded-xl px-3 pt-2 pb-1.5 [@media(max-height:640px)]:pt-1.5 [@media(max-height:640px)]:pb-1 border space-y-1.5 [@media(max-height:640px)]:space-y-1 bg-white/[0.04] ${
              isBoss ? "border-rose-300/40" : "border-white/[0.07]"
            }`
      }
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-white/75 whitespace-nowrap">
            Season {garden.season}
            {garden.season > RUN_FINAL_SEASON ? " · Endless" : ""} ·{" "}
            <span className={isBoss ? "text-rose-200" : "text-white/90"}>
              {garden.bossRuleId && <BossIcon id={garden.bossRuleId} size={20} className="mr-1 -mt-0.5 align-middle" />}
              {BED_SHORT[garden.kind]}
            </span>
            <SeasonDots
              gardenIndex={garden.gardenIndex}
              boss={upcomingBoss ? { id: upcomingBoss, name: BOSS_RULE_REGISTRY[upcomingBoss].name } : null}
              onBossTap={() => (onBossPreview && upcomingBoss ? onBossPreview(upcomingBoss) : setBossOpen((v) => !v))}
            />
            {asc > 0 && (
              <span className="ml-1.5 rounded-md bg-orange-400/15 px-1 py-px text-[10.5px] font-bold text-orange-200" title={`Ascension ${asc}`}>
                <Badge id="flame" className="mr-px" />A{asc}
              </span>
            )}
          </div>
        </div>
        <div
          className="shrink-0 flex items-center gap-1"
          aria-label={`${garden.strokesLeft} ${garden.strokesLeft === 1 ? "line" : "lines"} left`}
          title="Lines left in this bed"
        >
          {Array.from({ length: strokesTotal }, (_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${i < strokesUsed ? "bg-white/15" : "bg-teal-300"}`}
            />
          ))}
          <span className="ml-0.5 text-[13px] text-white/70">
            <span className="font-mono font-black text-white/85">{garden.strokesLeft}</span>{" "}
            {garden.strokesLeft === 1 ? "line" : "lines"}
          </span>
        </div>
      </div>

      {boss && (
        <div className="text-[13px] leading-snug text-rose-100">
          <b>{boss.name}:</b> {boss.description}{" "}
          <span className="text-rose-50/60"><Badge id="crown" /> Legendary relic if cleared</span>
        </div>
      )}
      {/* Garden weather (rules v20) */}
      {garden.weather && (
        <div className={`text-[13px] leading-snug ${
            garden.weather === "GOLDEN_HOUR" ? "text-amber-100" : garden.weather === "SPRING_RAIN" || garden.weather === "FIREFLY_NIGHT" ? "text-sky-100" : "text-lime-100"
          }`}>
          <b>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={weatherArt(garden.weather)} alt="" aria-hidden="true" draggable={false} className="inline-block h-[1.35em] w-[1.35em] align-[-0.3em] object-contain" />{" "}
            {WEATHER_INFO[garden.weather].name}:
          </b>{" "}
          {artify(WEATHER_INFO[garden.weather].short)}
        </div>
      )}

      {bossOpen && upcomingBoss && garden.kind !== "BOSS" && (
        <button
          type="button"
          onClick={() => setBossOpen(false)}
          className="w-full text-left rounded-lg border border-rose-300/30 bg-rose-500/[0.07] px-2.5 py-1.5 text-[12px] leading-snug text-rose-50"
        >
          <span className="font-bold">
            <BossIcon id={upcomingBoss} size={20} className="mr-1 align-middle" /> Boss ahead: {BOSS_RULE_REGISTRY[upcomingBoss].name}
          </span>
          <span className="block text-rose-50/75">{BOSS_RULE_REGISTRY[upcomingBoss].description}</span>
        </button>
      )}

      {/* Score progress: the score in the bar, the roses on it, what's left under it */}
      <div className="relative h-6 [@media(max-height:640px)]:h-5 rounded-full bg-black/30 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-amber-300/80"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {previewPct > 0 && (
          <div
            className="absolute inset-y-0 bg-amber-200/35"
            style={{ left: `${pct}%`, width: `${previewPct}%` }}
          />
        )}
        <div className="absolute inset-0 flex items-center px-2.5 text-[15px] [@media(max-height:640px)]:text-[13px] font-mono font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
          {shortScore(garden.score)} / {shortScore(garden.target)}
        </div>
      </div>
      {/* Bloom bar: buds at half, three quarters and full open as the bed fills (the line you draw previews it) */}
      <div className="relative h-0 !mt-0" aria-hidden="true">
        {[50, 75, 100].map((mark) => {
          const open = pct >= mark;
          const soon = !open && pct + previewPct >= mark;
          return (
            <motion.img
              key={mark}
              src={BLOOM_ART}
              alt=""
              draggable={false}
              initial={false}
              animate={open ? { scale: [1.5, 1], opacity: 1, filter: "grayscale(0)" } : { scale: soon ? 0.85 : 0.6, opacity: soon ? 0.9 : 0.45, filter: "grayscale(1)" }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              // Centred on the bar: half the bar (12px, 10px on short screens) plus half the rose (11px)
              className="absolute -top-[23px] [@media(max-height:640px)]:-top-[21px] h-[22px] w-[22px] object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              style={{ left: `calc(${mark}% - ${mark === 100 ? 23 : 11}px)` }}
            />
          );
        })}
      </div>
      <div className="!mt-1 text-right text-[12px] leading-none font-semibold text-white/70">
        {garden.score >= garden.target ? "Bloomed ✓" : `${shortScore(garden.target - garden.score)} to go`}
      </div>

      {weedOutActive && (
        // Swapping: what to do here, and Cancel; the Swap button below confirms
        <div className="flex items-center gap-1.5 h-8">
          <div className="flex-1 text-[12.5px] text-lime-100 leading-tight">
            Tap up to {RUN_WEEDOUT_MAX_TILES} tiles to swap ({weedOutCount}/{RUN_WEEDOUT_MAX_TILES})
          </div>
          {(weedOutCount ?? 0) > 0 && (
            <button
              type="button"
              onClick={onToggleWeedOut}
              className="h-8 px-3 rounded-lg border border-white/15 bg-white/[0.06] text-[12px] font-semibold text-white/80"
            >
              Cancel
            </button>
          )}
        </div>
      )}

    </div>
  );
}

/** Scores in the bar: full digits below 10,000, then 48.2K, 1.25M… */
function shortScore(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v < 10_000) return v.toLocaleString("en-US");
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 100_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return fmt(v);
}

/** Tap up to 3 tiles on the board to swap them for new ones from the Tile Bag */
export function RunWeedOutOverlay({
  grid,
  selected,
  onToggle,
}: {
  grid: GridCell[][];
  selected: GridCoord[];
  onToggle: (coord: GridCoord) => void;
}) {
  const isSelected = (r: number, c: number) =>
    selected.some((s) => s.row === r && s.col === c);
  return artify(
    <div className="absolute inset-0 z-30 flex flex-col">
      <div className="relative flex-1 rounded-2xl p-2.5 bg-lime-950/35 ring-2 ring-lime-300/70">
        <div className="grid grid-cols-5 grid-rows-5 board-gap w-full h-full">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const locked = cell.type === "HERO" || cell.type === "EXIT" || cell.type === "VOID";
              const on = isSelected(r, c);
              return artify(
                <button
                  key={cell.id}
                  type="button"
                  disabled={locked}
                  aria-label={`Swap row ${r + 1} column ${c + 1}`}
                  aria-pressed={on}
                  onClick={() => onToggle({ row: r, col: c })}
                  className={`rounded-xl transition ${
                    locked
                      ? "bg-black/40 cursor-not-allowed"
                      : on
                      ? "bg-lime-300/45 ring-4 ring-lime-200 shadow-[0_0_14px_rgba(190,242,100,0.9)]"
                      : "bg-transparent hover:bg-lime-200/15 ring-1 ring-lime-200/30"
                  } flex items-center justify-center text-xl`}
                >
                  {on && (
                    // On a solid round backing, so it reads over any tile
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1B281F] ring-2 ring-lime-200 shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={miscArt("swap")} alt="" aria-hidden="true" draggable={false} className="h-8 w-8 object-contain" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export interface RunClearInfo {
  gardenIndex: number;
  score: number;
  target: number;
  strokesLeft: number;
  clearReward: number;
  strokeBonus: number;
  interest: number;
  /** Interest cap with relics (Squirrel's Stash raises it) */
  interestCap?: number;
  /** Extra Gems from relics (Seed Purse) */
  relicBonus?: number;
  /** First-garden welcome bonus */
  welcomeBonus?: number;
  total: number;
  gemsBefore: number;
  legendary: RelicId | null;
  relicsAfter: RelicId[];
  /** ❤️ Life restored for the next garden (rules v5+) */
  lifeBonus?: number;
  /** Best stars ever on this Season's Small, Big and Boss beds (this device) */
  seasonBestStars?: [number, number, number];
  /** These stars beat the best ever on this bed */
  newBestStars?: boolean;
  /** Looks unlocked by this clear (companions, line colours, ranks) */
  unlocked?: Array<{ id?: string; icon: string; name: string }>;
  /** The next star reward, e.g. 🌙 Night Garden board at 30 ⭐ */
  nextUnlock?: { stars: number; have: number; text: string; id?: string; icon?: string } | null;
  /** Deepest Season ever reached on this device (shown in Endless) */
  deepestSeason?: number;
  /** Ascension level of this Garden Run */
  asc?: number;
  /** What's next: the next bed and its target, or the Boss ahead (none after the Daily's last bed) */
  nextBed?: { label: string; target: number; boss: BossRuleId | null } | null;
}

const BAG_ORDER = ["ENEMY", "TRAP", "WEAPON", "SHIELD", "POTION", "GOLD"] as const;

/** What's still in the Tile Bag: the tiles that will refill the board next */
export function BagPanel({ garden, prunedCount = 0 }: { garden: RunGardenState; prunedCount?: number }) {
  const counts = new Map<string, number>();
  for (const t of garden.drawPile) counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
  const shown = BAG_ORDER.filter((t) => (counts.get(t) ?? 0) > 0);
  return artify(
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {shown.map((t) => (
          <span key={t} className="flex items-center gap-1 text-[12px] font-mono font-black text-white/90">
            <EntityIcon type={t} size={16} />
            {counts.get(t)}
          </span>
        ))}
        {shown.length === 0 && <span className="text-[11px] text-white/60">The bag is empty.</span>}
      </div>
      <div className="mt-1 text-[10.5px] leading-snug text-white/50">
        Next tiles to refill the board.
        {garden.discardPile.length > 0 &&
          ` Then your ${garden.discardPile.length} used tiles get shuffled back in.`}
        {prunedCount > 0 && ` ✂️ ${prunedCount} tile${prunedCount === 1 ? "" : "s"} pruned this run.`}
      </div>
    </motion.div>
  );
}

/**
 * Stars for a cleared Garden Bed (display only): ⭐ cleared, ⭐⭐ with a line
 * to spare, ⭐⭐⭐ also scoring 1.5× the target.
 */
export function getRunBedStars(score: number, target: number, strokesLeft: number): number {
  return 1 + (strokesLeft >= 1 ? 1 : 0) + (strokesLeft >= 1 && score >= target * 1.5 ? 1 : 0);
}

/** The card's headline, by how well the bed went */
const BLOOM_HEADLINE: Record<number, string> = {
  1: "Bed bloomed!",
  2: "Beautiful bed!",
  3: "Perfect bloom!",
};

/** One short line worth bragging about */
function bloomBrag(score: number, target: number, linesLeft: number): string {
  const ratio = score / Math.max(1, target);
  if (ratio >= 2) return `${Math.floor(ratio * 10) / 10}× what it needed!`;
  if (linesLeft > 0) return `Bloomed with ${linesLeft} ${linesLeft === 1 ? "line" : "lines"} to spare.`;
  return "Just in time!";
}

const STAR_HINT: Record<number, string> = {
  1: "⭐⭐ for a line to spare · ⭐⭐⭐ for 1.5× the target too",
  2: "⭐⭐⭐ for 1.5× the target with a line to spare",
  3: "Perfect Garden Bed!",
};

/** Small → Big → Boss beds of this Season, with the one just cleared */
function SeasonMap({
  season,
  clearedKind,
  bestStars,
}: {
  season: number;
  clearedKind: string;
  bestStars?: [number, number, number];
}) {
  const order = ["SMALL", "BIG", "BOSS"] as const;
  const done = order.indexOf(clearedKind as (typeof order)[number]);
  return artify(
    <div className="mt-2.5" aria-label={`Season ${season} map`}>
    <div className="flex items-center justify-center gap-1">
      {order.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className={`h-0.5 w-6 rounded-full ${i <= done ? "bg-emerald-300" : "bg-white/15"}`} />}
          <span
            className={`flex flex-col items-center gap-0.5 text-[9px] font-mono font-bold ${
              i <= done ? "text-emerald-200" : i === done + 1 ? "text-white/80" : "text-white/35"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] border ${
                i <= done
                  ? "bg-emerald-400/25 border-emerald-300"
                  : i === done + 1
                  ? "border-white/50"
                  : "border-white/15"
              }`}
            >
              {i <= done ? "✓" : k === "BOSS" ? <Badge id="crown" /> : "🌼"}
            </span>
            {k === "SMALL" ? "Small" : k === "BIG" ? "Big" : "Boss"}
            {bestStars && (
              <span className="flex leading-none" aria-label={`best ${bestStars[i]} stars`}>
                {[1, 2, 3].map((n) => (
                  <Badge key={n} id="star" size={10} className={n <= bestStars[i] ? "" : "opacity-25 grayscale"} />
                ))}
              </span>
            )}
          </span>
        </React.Fragment>
      ))}
    </div>
      {done === 2 && <div className="mt-1 text-center text-[10.5px] text-white/50">Next: Season {season + 1}</div>}
    </div>
  );
}

/** Garden-clear screen: the Seed payout, then on to the Shop */
/** Where you are in the Season: Small → Big → Boss (done, current, still to come) */
function SeasonDots({
  gardenIndex,
  boss,
  onBossTap,
}: {
  gardenIndex: number;
  /** The Season's Boss, shown ahead on its dot */
  boss?: { id: BossRuleId; name: string } | null;
  onBossTap?: () => void;
}) {
  const at = gardenIndex % 3;
  return (
    <span className="ml-1.5 inline-flex items-center gap-[3px] align-middle" aria-label={`Bed ${at + 1} of 3 this Season`}>
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`rounded-full h-1.5 w-1.5 ${
            i < at ? "bg-amber-300/80" : i === at ? "bg-amber-200 ring-2 ring-amber-200/30" : "bg-white/20"
          }`}
        />
      ))}
      {boss && at < 2 ? (
        <button
          type="button"
          onClick={onBossTap}
          aria-label={`Boss ahead: ${boss.name}. Tap for its rule.`}
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-400/15 ring-1 ring-rose-300/40 active:scale-90"
        >
          <BossIcon id={boss.id} size={24} />
        </button>
      ) : (
        <span className={`rounded-full h-2 w-2 ${at === 2 ? "bg-amber-200 ring-2 ring-amber-200/30" : "bg-white/20"}`} />
      )}
    </span>
  );
}

/**
 * Shown once, before the very first Garden Bed: the goal in one sentence and
 * how a Season is built, so a new player knows what winning looks like.
 */
/** Centres of a 3×3 mini board (in a 90×90 box) */
const DEMO_CELL = [15, 45, 75];
const DEMO_SHORT = [[0, 0], [0, 1], [0, 2]];
const DEMO_LONG = [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [2, 1], [2, 2]];
const demoPath = (cells: number[][]) =>
  cells.map(([r, c], i) => `${i ? "L" : "M"}${DEMO_CELL[c]} ${DEMO_CELL[r]}`).join(" ");

/** A mini board that draws a line again and again, then shows what it scored */
function LineDemo({ cells, label, score, delay }: { cells: number[][]; label: string; score: string; delay: number }) {
  const still = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 90 90" className="h-[72px] w-[72px] [@media(max-height:640px)]:h-[60px] [@media(max-height:640px)]:w-[60px]" aria-hidden="true">
        {DEMO_CELL.flatMap((y) =>
          DEMO_CELL.map((x) => <rect key={`${x}-${y}`} x={x - 12} y={y - 12} width="24" height="24" rx="6" fill="rgba(255,255,255,0.07)" />)
        )}
        <motion.path
          d={demoPath(cells)}
          fill="none"
          stroke="#e9cf7e"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: still ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={still ? { duration: 0 } : { duration: 0.25 * cells.length, delay, repeat: Infinity, repeatDelay: 1.6, ease: "linear" }}
        />
      </svg>
      <div className="text-[13px] text-white/70">{label}</div>
      <div className="text-[22px] font-extrabold leading-none text-amber-200 tabular-nums">{score}</div>
    </div>
  );
}

/** Before a Garden Run's first bed: what to do, in one short screen */
export function RunGoalCard({
  target,
  lines,
  canHide,
  onStart,
  onHide,
}: {
  target: number;
  lines: number;
  /** After a few views the player may turn it off */
  canHide: boolean;
  onStart: () => void;
  onHide: () => void;
}) {
  return artify(
    <div className="ui-zoom fixed inset-0 z-[65] bg-black/70 flex items-end sm:items-center justify-center p-3 overflow-y-auto" onClick={onStart}>
      <motion.div
        role="dialog"
        aria-label="Before you begin"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="fit-card w-full max-w-[400px] rounded-2xl border border-white/10 bg-[#1B281F] px-5 pt-4 pb-4 text-white"
      >
        <h2 className="text-center font-display text-[24px] font-bold leading-tight text-balance">Draw one line to the gate</h2>
        <p className="mt-2 text-center text-[15.5px] leading-snug text-white/85">
          Every tile you pass adds to your score, and <b className="text-amber-200">longer lines score far more</b>.
        </p>

        <div className="mt-3 [@media(max-height:640px)]:mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/20 py-2.5 [@media(max-height:640px)]:py-2">
          <LineDemo cells={DEMO_SHORT} label="3 tiles" score="27" delay={0} />
          <LineDemo cells={DEMO_LONG} label="9 tiles" score="243" delay={0.2} />
        </div>
        <p className="mt-2 text-center text-[13px] text-white/65">3 times the length, 9 times the points.</p>

        <p className="mt-3 [@media(max-height:640px)]:mt-2 text-center text-[15px] leading-snug text-white/85">
          Thorns and Spikes cost Life, so plan your path. Reach <b className="text-amber-200">{fmt(target)}</b> in{" "}
          <b>{lines} lines</b> to clear this bed.
        </p>

        <div className="card-footer mt-2 bg-[#1B281F]">
          <button
            type="button"
            onClick={onStart}
            className="w-full h-12 rounded-xl bg-lime-300 text-slate-950 text-[16px] font-bold active:scale-95 transition"
          >
            Start
          </button>
          {canHide && (
            <button type="button" onClick={onHide} className="mt-1 w-full h-11 text-[14px] font-semibold text-white/60">
              Don&apos;t show this again
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function RunGardenClearModal({
  info,
  onContinue,
  onStop,
  finishLabel,
}: {
  info: RunClearInfo | null;
  onContinue: () => void;
  /** The last bed of a Daily Garden: the button finishes the day instead of opening the Shop */
  finishLabel?: string;
  /** After a Boss: a natural place to stop, the Run waits in its save */
  onStop?: () => void;
}) {
  // Each earned star lands on a rising bell, in time with its pop-in
  useEffect(() => {
    if (!info) return;
    const earned = getRunBedStars(info.score, info.target, info.strokesLeft);
    const timers = [1, 2, 3]
      .filter((n) => n <= earned)
      .map((n) => window.setTimeout(() => soundEngine.playStarLand(n), (0.2 + n * 0.22) * 1000 + 120));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [info]);
  if (!info) return null;
  const { kind, season } = getRunGardenPosition(info.gardenIndex);
  const legendary = info.legendary ? RELIC_REGISTRY[info.legendary] : null;
  const stars = getRunBedStars(info.score, info.target, info.strokesLeft);
  const lines = [
    { label: `${getRunGardenKindLabel(kind)} cleared`, value: info.clearReward },
    {
      label: (
        <>
          Unused lines ({info.strokesLeft})
          {info.strokeBonus > info.strokesLeft && (
            <>
              {" · "}
              <RelicIcon id="SUN_HAT" size={14} className="inline-block align-[-2px]" /> ×2
            </>
          )}
        </>
      ),
      value: info.strokeBonus,
    },
    {
      label: `Interest (1 per ${RUN_INTEREST_STEP} 🌱, max ${info.interestCap ?? RUN_INTEREST_MAX})`,
      value: info.interest,
    },
    ...(info.relicBonus
      ? [{ label: <><RelicIcon id="SEED_PURSE" size={14} className="inline-block align-[-2px]" /> Seed Purse</>, value: info.relicBonus }]
      : []),
    ...(info.welcomeBonus ? [{ label: "Welcome bonus", value: info.welcomeBonus }] : []),
  ];
  return artify(
    <div className="ui-zoom fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="fit-card w-full max-w-[380px] rounded-2xl p-4 space-y-3 text-white border border-white/[0.08] bg-[#1B281F] shadow-2xl shadow-black/50"
      >
        <div className="text-center">
          <div className="text-[12px] font-semibold text-emerald-300/90">
            {getRunGardenLabel(info.gardenIndex)}
            {!!info.asc && <span className="ml-1 text-orange-200">· <Badge id="flame" /> Ascension {info.asc}</span>}
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="text-[28px] leading-tight font-display font-semibold text-amber-100"
          >
            {kind === "BOSS" ? "Boss bed beaten!" : BLOOM_HEADLINE[stars] ?? "Bed bloomed!"}
          </motion.div>
          <div className="flex justify-center gap-2 mt-2" aria-label={`${stars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <motion.span
                key={n}
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0, transition: { delay: 0.2 + n * 0.22, type: "spring", stiffness: 380, damping: 14 } }}
                className={`leading-none ${n <= stars ? "" : "opacity-20 grayscale"}`}
              >
                <Badge id="star" size={40} />
              </motion.span>
            ))}
          </div>
          <div className="mt-2 text-[15px] font-semibold text-emerald-100">{bloomBrag(info.score, info.target, info.strokesLeft)}</div>
          {info.newBestStars && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2.5 py-0.5 text-[12px] font-bold text-amber-100">
              <Sparkles className="w-3.5 h-3.5" /> Your best on this bed
            </div>
          )}
          {stars < 3 && <div className="mt-0.5 text-[12px] leading-snug text-white/50">Next time: {STAR_HINT[stars]}</div>}
          <SeasonMap season={season} clearedKind={kind} bestStars={info.seasonBestStars} />
          {season > RUN_FINAL_SEASON && (
            <div className="mt-2 rounded-lg border border-violet-300/40 bg-violet-500/10 px-2.5 py-1 text-[12px] text-violet-100">
              🌌 Endless · your deepest: <b>Season {Math.max(season, info.deepestSeason ?? season)}</b>. Go further!
            </div>
          )}
        </div>

        {/* The reward, as one number to enjoy */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.6 } }}
          className="flex items-center justify-center gap-2"
        >
          <span className="rounded-2xl border border-amber-300/50 bg-amber-400/15 px-4 py-2 text-[26px] font-display font-semibold tabular-nums text-amber-100">
            +{info.total} 🌱
          </span>
          {!!info.lifeBonus && (
            <span className="rounded-2xl border border-rose-300/40 bg-rose-400/10 px-3 py-2 text-[20px] font-display font-semibold text-rose-100">
              +{info.lifeBonus} ❤️
            </span>
          )}
        </motion.div>

        {/* What's next, in one line */}
        {info.nextBed && (
          <div
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
              info.nextBed.boss ? "border-rose-300/40 bg-rose-500/10" : "border-white/10 bg-white/[0.04]"
            }`}
          >
            {info.nextBed.boss && <BossIcon id={info.nextBed.boss} size={36} />}
            <div className="min-w-0 flex-1 text-[13px] leading-snug">
              <div className={info.nextBed.boss ? "font-bold text-rose-100" : "font-bold text-white/90"}>
                {info.nextBed.boss ? `Boss ahead: ${BOSS_RULE_REGISTRY[info.nextBed.boss].name}` : `Up next: ${info.nextBed.label}`}
              </div>
              <div className="text-white/60">
                {info.nextBed.boss ? BOSS_RULE_REGISTRY[info.nextBed.boss].description : `Reach ${fmt(info.nextBed.target)} to bloom it.`}
              </div>
            </div>
          </div>
        )}

        {/* Where the Seeds came from, for anyone who wants it */}
        <details className="group rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-white/70">
          <summary className="cursor-pointer list-none text-center font-semibold text-white/55 [&::-webkit-details-marker]:hidden">
            How you earned it <span className="inline-block transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-1.5 space-y-1">
            <div className="flex justify-between gap-2">
              <span>Bed score</span>
              <span className="font-mono font-bold text-white/85">{fmt(info.score)} / {fmt(info.target)}</span>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between items-start gap-2 leading-snug">
                <span className="min-w-0">{l.label}</span>
                <span className="font-mono font-black shrink-0 whitespace-nowrap text-amber-100">+{l.value} 🌱</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-1 flex justify-between font-bold text-white/80">
              <span>Your Seeds</span>
              <span className="font-mono">{info.gemsBefore} → {info.gemsBefore + info.total} 🌱</span>
            </div>
          </div>
        </details>


        {info.unlocked && info.unlocked.length > 0 && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [0.7, 1.08, 1], opacity: 1, transition: { delay: 0.6, duration: 0.45 } }}
            className="rounded-xl border border-violet-300/50 bg-violet-500/15 px-3 py-2 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[12px] font-semibold text-violet-200">
              <PartyPopper className="w-3.5 h-3.5" /> Unlocked
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-center text-[14px] font-black text-white leading-snug">
              {info.unlocked.map((u, i) => (
                <span key={u.name} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="mx-1 text-white/40">·</span>}
                  {u.id ? <UnlockIcon item={{ id: u.id, icon: u.icon }} size={22} /> : u.icon} {u.name}
                </span>
              ))}
            </div>
            <div className="text-[10.5px] text-white/60">See it in ☰ → Companions &amp; looks</div>
          </motion.div>
        )}

        {info.nextUnlock && (
          <div className="text-center text-[11.5px] text-white/60">
            <Badge id="star" /> {info.nextUnlock.have} · next: <span className="font-semibold text-white/85">
              {info.nextUnlock.id && <UnlockIcon item={{ id: info.nextUnlock.id, icon: info.nextUnlock.icon ?? "" }} />} {info.nextUnlock.text}
            </span> at{" "}
            {info.nextUnlock.stars} <Badge id="star" />
          </div>
        )}

        {legendary && (
          <div className="rounded-xl border border-amber-300/50 bg-amber-400/10 px-3 py-2 text-xs text-amber-50">
            <span className="flex items-center gap-1.5">
              <RelicIcon id={legendary.id} size={28} />
              <span>
                Legendary relic earned: <span className="font-black">{legendary.name}</span>
              </span>
            </span>
            <div className="text-[11px] opacity-85">{legendary.description}</div>
          </div>
        )}

        <div className="card-footer bg-[#1B281F]">
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-xl py-3 font-bold text-[15px] bg-teal-300 text-slate-950 active:scale-95 flex items-center justify-center gap-1.5"
          >
            {finishLabel ?? <>Enter the Shop · {info.gemsBefore + info.total} 🌱 to spend</>}
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
          {onStop && !finishLabel && kind === "BOSS" && (
            <button
              type="button"
              onClick={onStop}
              className="mt-2 w-full rounded-xl py-2.5 text-[13px] font-semibold border border-white/10 bg-white/[0.05] text-white/80 active:scale-[0.98]"
            >
              Stop here, resume later
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/** The player chose to stop after a Boss: the Run is saved and waits right here */
export function RunSavedRest({
  open,
  season,
  onKeepPlaying,
}: {
  open: boolean;
  /** The Season just finished */
  season: number;
  onKeepPlaying: () => void;
}) {
  if (!open) return null;
  return artify(
    <div className="ui-zoom fixed inset-0 z-[70] bg-[#101813] flex items-center justify-center p-5">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="w-full max-w-[300px] text-center text-white space-y-3"
      >
        <img src={BLOOM_ART} alt="" aria-hidden="true" draggable={false} className="mx-auto h-14 w-14 object-contain" />
        <div className="font-display text-[26px] font-semibold text-amber-100">Saved for later</div>
        <p className="text-[14px] leading-snug text-white/75">
          Season {season} is done and your Run is saved on this device. Open Bloomline any time and you&apos;ll pick up
          right here, before the Shop.
        </p>
        <p className="text-[13px] text-white/50">You can close the game now.</p>
        <button
          type="button"
          onClick={onKeepPlaying}
          className="w-full rounded-xl py-3 font-bold text-[15px] bg-teal-300 text-slate-950 active:scale-[0.98]"
        >
          Keep playing
        </button>
      </motion.div>
    </div>
  );
}

export type RunEndReason = "MISSED_TARGET" | "NO_SAFE_LINE" | "WILTED" | "ENDED" | "DAILY_DONE";

export interface RunOverInfo {
  reason: RunEndReason;
  gardenIndex: number;
  gardenScore: number;
  target: number;
  runScore: number;
  gardensCleared: number;
  best: { season: number; gardenIndex: number; score: number };
  isNewBest: boolean;
  /** Ascension level of this Garden Run */
  asc?: number;
  /** The Run's best single line */
  bestLine?: { points: number; tiles: number } | null;
  /** Relics gathered this Run, and which were found for the first time ever */
  relics?: RelicId[];
  newRelics?: RelicId[];
  /** A Daily Garden: its date, the official try's record (null if this was a replay) and the day streak */
  daily?: { dateKey: string; record: DailyRecord | null; streak: number };
  /** This Run's garden code (MOSS-4821), to share; older Runs have none */
  seedCode?: string | null;
  /** Planted from someone else's code */
  fromCode?: boolean;
  /** The first finished Run: the closing line is shown, once ever */
  closer?: boolean;
}

/** Why the garden rests: said gently, never as a failure */
const REST_COPY: Record<RunEndReason, string> = {
  MISSED_TARGET: "This bed wanted a few more points.",
  NO_SAFE_LINE: "No path was left through this bed. It will grow back next time.",
  WILTED: "Your companion gave everything on that line and is resting now.",
  ENDED: "You let the garden rest for now.",
  DAILY_DONE: "All three Seasons bloomed. Come back tomorrow for a new garden.",
};

/** Share sheet on phones, otherwise copy; true once copied */
async function shareOrCopy(text: string): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return false;
    }
  } catch {
    // Cancelled or unavailable: fall back to copying
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** This Run's garden code: anyone who plants it gets the same beds */
function GardenCodeRow({ code, fromCode, reached, score }: { code: string; fromCode: boolean; reached: string; score: number }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    track("code_share");
    const text = `My Bloomline garden ${code}: I reached ${reached} with ${fmt(score)}. Can you beat it?\n${seedCodeLink(code)}`;
    if (await shareOrCopy(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="flex-1">
        <div className="text-[11px] text-white/45">{fromCode ? "Garden code (a friend's)" : "Garden code"}</div>
        <div className="whitespace-nowrap font-mono text-[14px] font-bold text-teal-100">{code}</div>
      </div>
      <button
        type="button"
        onClick={share}
        className="ml-auto shrink-0 rounded-lg border border-teal-300/40 bg-teal-300/10 px-2.5 py-1.5 text-[12.5px] font-bold text-teal-100 active:scale-[0.97]"
      >
        {copied ? "Copied!" : "Challenge a friend"}
      </button>
    </div>
  );
}

/** The grid's cells, as the legend under it names them (only the ones that show) */
const DAILY_LEGEND: Array<[string, string]> = [
  ["🌸", "3 stars"],
  ["🌼", "2 stars"],
  ["🌱", "1 star"],
  ["🥀", "stopped here"],
];

/** One cell of the Daily grid: the share text's emoji, drawn as the game's flowers (⬛ is a bed not reached) */
const DAILY_CELL_ART: Record<string, Parameters<typeof dailyArt>[0]> = { "🌸": 3, "🌼": 2, "🌱": 1, "🥀": "stopped" };
function DailyCell({ cell, size }: { cell: string; size: number }) {
  const art = DAILY_CELL_ART[cell];
  if (!art) return <span className="inline-block rounded-md bg-white/10" style={{ width: size, height: size }} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dailyArt(art)} alt="" aria-hidden="true" draggable={false} className="inline-block object-contain" style={{ width: size, height: size }} />;
}

/** The Daily Garden's flower grid with a Share button (a replay shows it's practice) */
function DailyResultCard({ dateKey, record, streak }: { dateKey: string; record: DailyRecord | null; streak: number }) {
  const [copied, setCopied] = useState(false);
  if (!record) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[12.5px] text-white/65">
        This was a practice replay. Today&apos;s first try is the one you can share.
      </div>
    );
  }
  const text = dailyShareText(dateKey, record, streak);
  const share = async () => {
    track("daily_share");
    if (await shareOrCopy(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="rounded-xl border-2 border-amber-300/50 bg-amber-400/10 px-3 py-2.5 text-center">
      <div className="text-[11px] font-semibold text-amber-200/85">
        Daily Garden{streak > 1 ? ` · 🔥 ${streak} days in a row` : ""}
      </div>
      {/* The same grid as the share text, painted: one row per Season */}
      <div className="mt-1.5 flex flex-col items-center gap-1" aria-label="Your Daily Garden flowers">
        {dailyGridRows(record).map((row, i) => (
          <div key={i} className="flex gap-1.5">
            {Array.from(row).map((cell, k) => (
              <DailyCell key={k} cell={cell} size={30} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-white/50">
        {DAILY_LEGEND.filter(([cell]) => dailyGridRows(record).some((row) => row.includes(cell))).map(([cell, text]) => (
          <span key={cell} className="inline-flex items-center gap-0.5">
            <DailyCell cell={cell} size={14} /> {text}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={share}
        className="mt-2 w-full rounded-lg py-2 text-[13.5px] font-bold border border-amber-300/50 bg-amber-300/15 text-amber-50 active:scale-[0.98]"
      >
        {copied ? "Copied! Paste it anywhere" : "Share your garden"}
      </button>
    </div>
  );
}

/** Today's Daily Garden: a dot until it's played, and the streak */
export function TodaysGardenButton({ played, streak, onClick }: { played: boolean; streak: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-amber-300/50 bg-amber-400/10 px-3 py-2.5 text-left active:scale-[0.98] transition"
    >
      <span className="flex items-center gap-1.5 text-[14px] font-bold text-amber-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={miscArt("daily")} alt="" aria-hidden="true" draggable={false} className="h-6 w-6 object-contain" /> Today&apos;s garden
        {!played && (
          <span className="rounded-full bg-amber-300 px-1.5 text-[10px] leading-[16px] font-black text-slate-950" aria-label="Not played today">
            New today
          </span>
        )}
      </span>
      <span className="block text-[12px] text-white/60">
        {played ? "Played today. Replay it as practice" : "Same beds for everyone · Seasons 1 to 3"}
        {streak > 0 ? ` · 🔥 ${streak} day${streak > 1 ? "s" : ""}` : ""}
      </span>
    </button>
  );
}

/** Run summary: how far the run reached and the best record on this device */
export function RunOverModal({
  info,
  newRunLabel = "Plant another Run",
  rankLine,
  onOpenLeaderboard,
  onNewRun,
  onClose,
  askFeedback = false,
  onPlayDaily,
  dailyToday,
}: {
  info: RunOverInfo | null;
  newRunLabel?: string;
  /** Start today's Daily Garden (left out in practice) */
  onPlayDaily?: () => void;
  /** Whether today's Daily Garden was played, and the streak */
  dailyToday?: { played: boolean; streak: number };
  rankLine?: string | null;
  onOpenLeaderboard?: () => void;
  /** Ask for feedback here (once ever, after a real Run) */
  askFeedback?: boolean;
  onNewRun: () => void;
  onClose: () => void;
}) {
  // Decided once when the card opens, so it doesn't vanish while it's on screen
  const [feedbackAsk, setFeedbackAsk] = useState(false);
  useEffect(() => {
    if (!info || !askFeedback || !shouldAskFeedback()) return;
    setFeedbackAsk(true);
    markFeedbackAsked();
    track("feedback_prompt");
  }, [info, askFeedback]);
  if (!info) return null;
  // One thing for the next Run to aim at, shown before the harvest (a daily shows its grid instead)
  const goal = info.daily ? null : pickNextGoal(info.asc ?? 0);
  const dailyRec = info.daily?.record ?? null;
  const shortBy = Math.max(0, info.target - info.gardenScore);
  const why =
    info.reason === "MISSED_TARGET"
      ? shortBy <= info.target * 0.35
        ? `So close! This bed wanted just ${fmt(shortBy)} more.`
        : `This bed wanted ${fmt(shortBy)} more. Longer lines and score relics grow fast.`
      : REST_COPY[info.reason];
  const relicCounts = new Map<RelicId, number>();
  for (const r of info.relics ?? []) relicCounts.set(r, (relicCounts.get(r) ?? 0) + 1);
  const newSet = new Set(info.newRelics ?? []);
  const harvest: Array<{ label: string; value: React.ReactNode; tone?: string }> = [
    { label: "Beds bloomed", value: info.gardensCleared, tone: "text-emerald-200" },
    ...(info.bestLine && info.bestLine.points > 0
      ? [{ label: "Best line", value: `${fmt(info.bestLine.points)} · ${info.bestLine.tiles} tiles`, tone: "text-amber-200" }]
      : []),
    { label: "Run score", value: fmt(info.runScore), tone: "text-amber-200" },
  ];
  return artify(
    <div className="ui-zoom fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="fit-card w-full max-w-[380px] rounded-2xl p-4 space-y-3 text-white border border-white/[0.08] bg-[#1A271E]"
      >
        <div className="text-center">
          <motion.img
            src={BLOOM_ART}
            alt=""
            aria-hidden="true"
            draggable={false}
            initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
            className="mx-auto h-12 w-12 object-contain"
          />
          <div className="mt-1 text-[22px] font-display font-semibold text-amber-100">
            {info.reason === "DAILY_DONE" ? "Today's garden bloomed!" : info.daily ? "Today's garden rests" : "The garden rests"}
          </div>
          <p className="text-[13px] text-white/70 leading-snug mt-1">{why}</p>
        </div>

        {info.isNewBest && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-400/15 px-3 py-2 text-center text-amber-100">
            <div className="flex items-center justify-center gap-1 text-[13px] font-black">
              <Sparkles className="w-4 h-4" /> Your best Garden Run yet!
            </div>
            <div className="text-[12px] font-semibold text-amber-100/80">{getRunGardenLabel(info.best.gardenIndex)}</div>
          </div>
        )}

        {info.daily && (
          <DailyResultCard dateKey={info.daily.dateKey} record={dailyRec} streak={info.daily.streak} />
        )}

        {goal && (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
            className="rounded-xl border-2 border-teal-300/60 bg-teal-300/10 px-3 py-2.5"
          >
            <div className="text-[11px] font-semibold text-teal-200/80">Next goal</div>
            <div className="mt-0.5 flex items-center gap-2">
              {goal.art ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={goal.art} alt="" aria-hidden="true" draggable={false} className="h-8 w-8 shrink-0 object-contain" />
              ) : (
                <span className="text-[22px] leading-none">{goal.icon}</span>
              )}
              <span className="text-[15px] font-bold text-white leading-tight">{goal.title}</span>
            </div>
            <p className="mt-1 text-[12px] text-white/65 leading-snug">{goal.detail}</p>
            {goal.need !== undefined && goal.have !== undefined && (
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-300"
                  style={{ width: `${Math.min(100, (goal.have / goal.need) * 100)}%` }}
                />
              </div>
            )}
          </motion.div>
        )}

        {info.closer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-2.5 px-1"
          >
            <img src={CLOSER_TIP.art} alt="" aria-hidden="true" draggable={false} className="h-10 w-10 shrink-0 object-contain" />
            <p className="font-hand text-[16px] leading-snug text-amber-50/90">{CLOSER_TIP.text}</p>
          </motion.div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 space-y-1.5 text-[12.5px]">
          <div className="text-[11px] font-semibold text-white/45">Your harvest</div>
          {harvest.map((h, i) => (
            <motion.div
              key={h.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.12 }}
              className="flex justify-between"
            >
              <span className="text-white/65">{h.label}</span>
              <span className={`font-black tabular-nums ${h.tone ?? ""}`}>{h.value}</span>
            </motion.div>
          ))}
          <div className="flex justify-between gap-2">
            <span className="text-white/65">Reached</span>
            <span className="text-right font-semibold text-white/85">
              {getRunGardenLabel(info.gardenIndex)}
              {!!info.asc && <span className="ml-1 text-orange-200">· <Badge id="flame" />A{info.asc}</span>}
            </span>
          </div>
          {!info.isNewBest && (
            <div className="flex justify-between gap-2">
              <span className="text-white/65">Best ever</span>
              <span className="text-right font-semibold text-white/85">{getRunGardenLabel(info.best.gardenIndex)}</span>
            </div>
          )}
          {relicCounts.size > 0 && (
            <div className="pt-1">
              <div className="text-[11px] text-white/45 mb-1">
                Relics gathered{newSet.size > 0 ? ` · ${newSet.size} found for the first time` : ""}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(relicCounts.entries()).map(([id, count], i) => (
                  <motion.span
                    key={id}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.5 + i * 0.07 }}
                    className={`relative h-9 w-9 rounded-lg flex items-center justify-center border ${
                      newSet.has(id) ? "border-amber-300/70 bg-amber-400/10" : "border-white/10 bg-white/[0.04]"
                    }`}
                    title={RELIC_REGISTRY[id]?.name}
                  >
                    <RelicIcon id={id} size={26} />
                    {count > 1 && <span className="absolute -bottom-1 -right-1 text-[9px] font-black text-teal-200">×{count}</span>}
                    {newSet.has(id) && (
                      <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-300 px-1 text-[8px] font-black text-slate-950">
                        NEW
                      </span>
                    )}
                  </motion.span>
                ))}
              </div>
            </div>
          )}
        </div>


        {info.seedCode && !info.daily && (
          <GardenCodeRow
            code={info.seedCode}
            fromCode={Boolean(info.fromCode)}
            reached={getRunGardenLabel(info.gardenIndex)}
            score={info.runScore}
          />
        )}


        {feedbackAsk && (
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("feedback_open", { from: "run_over" })}
            className="block rounded-xl border border-lime-300/40 bg-lime-300/10 px-3 py-2.5 text-center active:scale-[0.98] transition"
          >
            <span className="block text-[14px] font-bold text-lime-100">Tell us what you thought</span>
            <span className="block text-[12px] text-white/60">One minute, it really helps</span>
          </a>
        )}

        {onPlayDaily && !info.daily && dailyToday && (
          <TodaysGardenButton played={dailyToday.played} streak={dailyToday.streak} onClick={onPlayDaily} />
        )}

        <div className="card-footer bg-[#1A271E] space-y-2">
        <button
          type="button"
          onClick={onNewRun}
          className="w-full py-3 rounded-xl bg-teal-300 text-slate-950 text-[15px] font-bold active:scale-[0.98] transition"
        >
          {newRunLabel}
        </button>
        <div className={`grid ${onOpenLeaderboard ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white/80 text-[13px] font-semibold"
          >
            Look at the board
          </button>
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="py-2.5 rounded-xl px-2 text-[12.5px] font-semibold border border-amber-300/40 bg-amber-400/10 text-amber-100 truncate"
            >
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="w-4 h-4 shrink-0 text-amber-300" />
                {rankLine ? rankLine.replace("🏆 Leaderboard: ", "") : "Leaderboard"}
              </span>
            </button>
          )}
        </div>
        </div>
      </motion.div>
    </div>
  );
}
