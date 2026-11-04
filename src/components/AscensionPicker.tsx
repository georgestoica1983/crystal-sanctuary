"use client";

import Badge from "@/components/Badge";
import { motion } from "framer-motion";
import { ArrowRight, Backpack } from "lucide-react";
import { useBackClose } from "@/lib/backClose";
import { DoneButton, GrabBar, sheetDrag } from "@/components/SheetBits";
import React, { useEffect, useState } from "react";
import { BagId, HeroClassId } from "@/types/game";
import { HERO_CLASS_REGISTRY } from "@/lib/engine";
import { ASCENSION_LEVELS, STARTING_BAGS } from "@/lib/runReplay";
import { bagUnlockFor, companionUnlockFor, RUN_BAG_ORDER, RUN_COMPANION_ORDER } from "@/lib/unlocks";
import { ascensionArt, bagArt } from "@/lib/art";
import EntityIcon from "@/components/EntityIcon";
import { artify } from "@/components/ArtText";
import { TodaysGardenButton } from "@/components/RunModeUI";
import { normalizeSeedCode } from "@/lib/seedCode";

/** Each companion's rule in a Garden Run, in plain words */
export const COMPANION_RULES: Record<HeroClassId, string> = {
  KNIGHT: "+2 🧤 each bed · keeps half its spare Gloves",
  ROGUE: "Each line may cross itself once · Thorns 2 softer from a diagonal",
  VAMPIRE: "🌰 heal +1 · cut Thorns heal +2 · 🧤 turn into ✂️",
  MAGE: "Each line may hop over one tile · 🍓 heal +2 more",
};

/** Starting stats line (a Run's Shears rule counts one starting cut) */
export function companionStartText(classId: HeroClassId): string {
  const def = HERO_CLASS_REGISTRY[classId];
  const parts = [`❤️ ${def.startingHp}`];
  if (def.startingShield > 0) parts.push(`🧤 ${def.startingShield}`);
  if (def.startingWeapon > 0) parts.push(`✂️ ${Math.min(1, def.startingWeapon)}`);
  return parts.join(" · ");
}

/** Choose the companion and difficulty of a new Garden Run */
export default function AscensionPicker({
  isOpen,
  unlocked,
  initial,
  companions,
  initialCompanion,
  bags = [],
  initialBag = null,
  onStart,
  onClose,
  onPlayDaily,
  dailyToday,
  initialCode,
  runInProgress = false,
}: {
  /** A shared garden code to fill in (from a ?seed= link) */
  initialCode?: string | null;
  /** Starting here ends the Run in progress */
  runInProgress?: boolean;
  isOpen: boolean;
  /** Start today's Daily Garden instead */
  onPlayDaily?: () => void;
  dailyToday?: { played: boolean; streak: number };
  /** Highest Ascension level unlocked on this device */
  unlocked: number;
  initial: number;
  /** Companions earned on this device */
  companions: HeroClassId[];
  initialCompanion: HeroClassId;
  /** Starting bags earned on this device (rules v24+), and the last one picked */
  bags?: BagId[];
  initialBag?: BagId | null;
  /** `code`: a friend's garden code to plant instead of a fresh garden; `bag`: null = the usual Garden bag */
  onStart: (level: number, companion: HeroClassId, code: string | null, bag: BagId | null) => void;
  onClose: () => void;
}) {
  const [level, setLevel] = useState(initial);
  const [companion, setCompanion] = useState<HeroClassId>(initialCompanion);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeText, setCodeText] = useState("");
  const [bag, setBag] = useState<BagId | null>(initialBag);
  /** A locked bag tapped to see what earns it */
  const [bagPeek, setBagPeek] = useState<BagId | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    setCodeText(initialCode ?? "");
    setCodeOpen(Boolean(initialCode));
    setLevel(Math.min(initial, unlocked));
    setCompanion(companions.includes(initialCompanion) ? initialCompanion : "KNIGHT");
    setBag(initialBag && bags.includes(initialBag) ? initialBag : null);
    setBagPeek(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial, unlocked, initialCompanion, companions, initialCode]);
  useBackClose(isOpen, onClose);
  if (!isOpen) return null;
  const pickedDef = HERO_CLASS_REGISTRY[companion];
  const code = codeOpen ? normalizeSeedCode(codeText) : null;
  const codeTyped = codeOpen && codeText.trim().length > 0;

  return artify(
    <div className="ui-zoom fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label="New Garden Run"
        onClick={(e) => e.stopPropagation()}
        {...sheetDrag(onClose)}
        className="w-full max-w-[430px] max-h-[calc(88dvh/var(--ui-zoom,1))] overflow-y-auto rounded-2xl bg-[#1B281F] border border-white/[0.08] px-3 pt-2 pb-3 space-y-3 text-white"
      >
        <GrabBar />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold">New Garden Run</div>
            <div className="text-[12px] text-white/55">Pick a companion. Each one plays differently.</div>
          </div>
        </div>

        {onPlayDaily && dailyToday && (
          <TodaysGardenButton played={dailyToday.played} streak={dailyToday.streak} onClick={onPlayDaily} />
        )}

        {codeOpen ? (
          <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 space-y-1.5">
            <label htmlFor="garden-code" className="block text-[12px] font-semibold text-white/70">
              A friend&apos;s garden code
            </label>
            <input
              id="garden-code"
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              placeholder="MOSS-4821"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-2.5 py-2 tabular-nums text-[16px] tracking-wider text-white placeholder:text-white/25 outline-none focus:border-teal-300/70"
            />
            <div className="text-[12px] leading-snug text-white/55">
              {code
                ? "Same beds, Shops and Bosses as theirs. Code gardens stay off the leaderboard."
                : codeTyped
                  ? "That isn't a garden code yet: a garden word and 4 digits, like MOSS-4821."
                  : "Type the code from a friend's end screen."}
            </div>
            <button
              type="button"
              onClick={() => {
                setCodeOpen(false);
                setCodeText("");
              }}
              className="text-[12px] font-semibold text-white/50 underline underline-offset-2"
            >
              Grow a fresh garden instead
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCodeOpen(true)}
            className="w-full text-left text-[12px] font-semibold text-teal-200/85 px-1"
          >
            🌱 Play a friend&apos;s garden code
          </button>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          {RUN_COMPANION_ORDER.map((id) => {
            const def = HERO_CLASS_REGISTRY[id];
            const locked = !companions.includes(id);
            const selected = id === companion;
            return artify(
              <button
                key={id}
                type="button"
                disabled={locked}
                aria-pressed={selected}
                onClick={() => setCompanion(id)}
                className={`flex flex-col justify-start text-left rounded-xl border px-2.5 py-2 transition active:scale-[0.98] ${
                  selected
                    ? "border-amber-300 bg-amber-400/15"
                    : locked
                    ? "border-white/[0.06] bg-black/20 opacity-55"
                    : "border-white/15 bg-white/[0.04]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <EntityIcon type="HERO" companionId={id} size={30} />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold leading-tight">{def.sanctuaryShortName ?? def.shortName}</span>
                    <span className="block text-[10px] text-white/55 tabular-nums">{companionStartText(id)}</span>
                  </span>
                </span>
                <span className="block mt-1 text-[12px] leading-snug text-white/70">{COMPANION_RULES[id]}</span>
                {locked && (
                  <span className="block mt-0.5 text-[12px] font-semibold text-white/60">
                    <Badge id="lock" /> {companionUnlockFor(id).needText}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Starting bag (rules v24+): the usual Garden bag, or one earned by playing */}
        <div className="space-y-1.5">
          <div className="text-[12px] font-semibold text-white/60">Starting bag</div>
          <div className="grid grid-cols-5 gap-1.5">
            {([null, ...RUN_BAG_ORDER] as Array<BagId | null>).map((id) => {
              const locked = id !== null && !bags.includes(id);
              const selected = id === bag && !bagPeek;
              const peeked = id !== null && id === bagPeek;
              const name = id ? STARTING_BAGS[id].name.replace(" bag", "") : "Garden";
              return (
                <button
                  key={id ?? "GARDEN"}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${id ? STARTING_BAGS[id].name : "Garden bag"}${locked ? " (locked)" : ""}`}
                  onClick={() => {
                    if (locked) setBagPeek(peeked ? null : id);
                    else {
                      setBag(id);
                      setBagPeek(null);
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border min-h-[64px] px-1 py-1.5 transition active:scale-[0.96] ${
                    selected
                      ? "border-amber-300 bg-amber-400/15"
                      : peeked
                      ? "border-white/40 bg-white/[0.06]"
                      : locked
                      ? "border-white/[0.06] bg-black/20"
                      : "border-white/15 bg-white/[0.04]"
                  }`}
                >
                  {id ? (
                    <img src={bagArt(id)} alt="" aria-hidden="true" draggable={false} className={`h-8 w-8 object-contain ${locked ? "opacity-40 grayscale" : ""}`} />
                  ) : (
                    <Backpack className="h-8 w-8 p-1 text-white/75" aria-hidden="true" />
                  )}
                  <span className={`text-[12px] font-semibold leading-none ${locked ? "text-white/45" : "text-white/85"}`}>{name}</span>
                  {locked && (
                    <span className="absolute top-0.5 right-0.5">
                      <Badge id="lock" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="text-[12px] leading-snug text-white/65 min-h-[2.4em]">
            {bagPeek ? (
              <>
                <b className="text-white/85">{STARTING_BAGS[bagPeek].name}:</b> {STARTING_BAGS[bagPeek].text}{" "}
                <span className="text-white/50">
                  <Badge id="lock" /> {bagUnlockFor(bagPeek).needText}
                </span>
              </>
            ) : bag ? (
              <>
                <b className="text-white/85">{STARTING_BAGS[bag].name}:</b> {STARTING_BAGS[bag].text}
              </>
            ) : (
              <>
                <b className="text-white/85">Garden bag:</b> the usual mix of 40 tiles.
              </>
            )}
          </div>
        </div>

        {unlocked === 0 ? (
          <div className="text-[12px] text-white/45"><Badge id="lock" /> Harder Ascension levels: clear the Season 3 Boss.</div>
        ) : (
        <div className="space-y-1.5">
          <div className="text-[12px] font-semibold text-white/60">Difficulty · each level keeps the ones below it</div>
          {ASCENSION_LEVELS.map((l) => {
            const locked = l.level > unlocked;
            const selected = l.level === level;
            return artify(
              <button
                key={l.level}
                type="button"
                disabled={locked}
                aria-pressed={selected}
                onClick={() => setLevel(l.level)}
                className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-3 transition active:scale-[0.98] ${
                  selected
                    ? "border-amber-300 bg-amber-400/15"
                    : locked
                    ? "border-white/[0.06] bg-black/20 opacity-55"
                    : "border-white/15 bg-white/[0.04]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ascensionArt(l.level)} alt="" aria-hidden="true" draggable={false} className={`h-9 w-9 shrink-0 object-contain ${locked ? "opacity-50 grayscale" : ""}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold">
                    {l.level === 0 ? "Normal" : `Ascension ${l.level}`}
                  </span>
                  <span className="block text-[12px] text-white/60 leading-snug">
                    {locked ? <><Badge id="lock" /> Clear the Season 3 Boss on Ascension {l.level - 1}</> : l.adds}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        )}

        {/* Pinned, so Start stays in reach while the code field or the levels are open */}
        <div className="card-footer space-y-2 bg-[#1B281F]" style={{ bottom: "-0.75rem", marginBottom: "-0.75rem", paddingBottom: "0.75rem" }}>
          {runInProgress && <div className="text-center text-[12px] text-amber-200/80">Starting ends the Run in progress.</div>}
          <button
            type="button"
            disabled={codeTyped && !code}
            onClick={() => onStart(level, companion, code, bag)}
            className="w-full rounded-xl py-3 font-bold text-[14px] bg-teal-300 text-slate-950 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {code ? `Plant ${code} with ` : "Start with "}
            {pickedDef.sanctuaryShortName ?? pickedDef.shortName}
            {bag ? ` · ${STARTING_BAGS[bag].name}` : ""}
            {level > 0 ? ` · Ascension ${level}` : ""}
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
          <DoneButton onClick={onClose} label="Not now" />
        </div>
      </motion.div>
    </div>
  );
}
