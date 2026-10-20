"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Flower2,
  Layers,
  Play,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { MODIFIER_LIST } from "@/lib/engine";
import EntityIcon from "@/components/EntityIcon";
import { getThemeAwareModifierInfo } from "@/components/HUD";
import { EntityType } from "@/types/game";

interface TutorialViewProps {
  onStartPlaying: () => void;
  onLaunchGuidedPractice?: () => void;
  onLaunchInteractiveTutorial?: () => void;
}

type ManualSection = "BASICS" | "TILES" | "BRIARS" | "STARS" | "GARDENS";

const SECTIONS: ReadonlyArray<{ id: ManualSection; label: string }> = [
  { id: "BASICS", label: "Basics" },
  { id: "TILES", label: "Tiles" },
  { id: "BRIARS", label: "Briars" },
  { id: "STARS", label: "Stars" },
  { id: "GARDENS", label: "Gardens" },
];

const TILE_GUIDE: ReadonlyArray<{
  type: EntityType;
  name: string;
  shape: string;
  color: string;
  text: React.ReactNode;
}> = [
  {
    type: "HERO",
    name: "Companion",
    shape: "ringed circle",
    color: "text-amber-200",
    text: (
      <>
        Where every line begins. The Keeper starts the Daily with{" "}
        <strong className="text-white">10 Magic</strong> and 2 Dew, and keeps
        what&apos;s left for the next garden.
      </>
    ),
  },
  {
    type: "GOLD",
    name: "Gems",
    shape: "hexagon",
    color: "text-yellow-300",
    text: (
      <>
        Collect them for points and to restore the mosaic in your Gallery.
        Gathering most of a garden&apos;s Gems earns a star.
      </>
    ),
  },
  {
    type: "SHIELD",
    name: "Dew",
    shape: "rounded square",
    color: "text-sky-300",
    text: (
      <>
        Adds its number to your Dew. Dew soaks up a Briar&apos;s prickle before
        it touches your Magic, and stays with you until it&apos;s used.
      </>
    ),
  },
  {
    type: "WEAPON",
    name: "Sunbeam",
    shape: "diamond",
    color: "text-amber-300",
    text: (
      <>
        Adds warmth that calms the{" "}
        <strong className="text-white">next Briar only</strong>, then fades.
        Gather it just before the Briar you want to tame.
      </>
    ),
  },
  {
    type: "POTION",
    name: "Berries",
    shape: "plus",
    color: "text-emerald-300",
    text: (
      <>
        Restore Magic up to your maximum. Save them for after a Briar or
        Thistle, so none of their sweetness is wasted. On Honeyed Gems days
        they turn sour (dashed outline, −1) and take 1 Magic instead.
      </>
    ),
  },
  {
    type: "ENEMY",
    name: "Briars",
    shape: "triangle",
    color: "text-rose-300",
    text: (
      <>
        Prickle you by their number. Sunbeam calms them first, then Dew, and
        whatever is left comes out of your Magic.
      </>
    ),
  },
  {
    type: "TRAP",
    name: "Thistles",
    shape: "spiky star",
    color: "text-pink-300",
    text: (
      <>
        Take Magic directly, slipping past your Dew, when you step on them
        straight. <strong className="text-emerald-300">Hop on diagonally</strong>{" "}
        and they don&apos;t hurt at all.
      </>
    ),
  },
  {
    type: "EXIT",
    name: "Archway",
    shape: "swirling rings",
    color: "text-violet-300",
    text: (
      <>
        Where every line ends. Reach it with at least 1 Magic to finish the
        garden.
      </>
    ),
  },
];

function SectionCard({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#141418] border border-[#26262E] rounded-2xl p-4 space-y-3">
      <h3
        className={`text-xs font-mono font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${accent}`}
      >
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="pt-1 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-300/40 text-amber-100 font-mono text-xs font-bold hover:bg-amber-400/25 transition"
      >
        <span>{label}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function NumberedRule({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 flex gap-3 items-start">
      <span className="w-6 h-6 rounded-lg bg-amber-300 text-[#0A0A0C] font-mono font-black text-xs flex items-center justify-center shrink-0">
        {n}
      </span>
      <div>
        <div className="font-mono font-bold text-white">{title}</div>
        <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
          {children}
        </p>
      </div>
    </div>
  );
}

export default function TutorialView({
  onStartPlaying,
  onLaunchGuidedPractice,
  onLaunchInteractiveTutorial,
}: TutorialViewProps) {
  const [activeSection, setActiveSection] = useState<ManualSection>("BASICS");

  // Briar calculator in the Briars tab
  const [simBriar, setSimBriar] = useState<number>(8);
  const [simSun, setSimSun] = useState<number>(4);
  const [simDew, setSimDew] = useState<number>(3);
  const [simMagic, setSimMagic] = useState<number>(10);

  const afterSun = Math.max(0, simBriar - simSun);
  const dewUsed = Math.min(simDew, afterSun);
  const magicLost = Math.max(0, afterSun - simDew);
  const finalMagic = Math.max(0, simMagic - magicLost);

  return (
    <div className="w-full max-w-[430px] mx-auto flex flex-col gap-3 pb-4 select-none text-white">
      {/* Banner */}
      <div className="bg-[#141418] border border-[#26262E] rounded-2xl p-4 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-amber-400/15 border border-amber-300/45 text-amber-200">
            <BookOpen className="w-3 h-3" />
            Garden Guide
          </span>
          <div className="flex items-center gap-1.5">
            {onLaunchInteractiveTutorial && (
              <button
                type="button"
                onClick={onLaunchInteractiveTutorial}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-300/50 text-sky-100 font-mono text-[11px] font-bold hover:bg-sky-500/25 transition"
              >
                <Zap className="w-3 h-3 text-sky-300" />
                <span>Practice</span>
              </button>
            )}
            <button
              type="button"
              onClick={onStartPlaying}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white text-[#0A0A0C] font-mono text-xs font-black uppercase hover:bg-zinc-200 transition shadow"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Play</span>
            </button>
          </div>
        </div>

        <h2 className="text-lg font-sans font-black tracking-tight text-white">
          How to tend the Sanctuary
        </h2>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Each garden is a <strong className="text-white">5×5 board</strong>.
          Draw <strong className="text-amber-200">one unbroken line</strong> from
          your <strong className="text-white">Companion</strong> to the{" "}
          <strong className="text-violet-300">Archway</strong>, and arrive with
          at least <strong className="text-emerald-300">1 Magic</strong> left.
        </p>

        <div className="grid grid-cols-5 gap-1 bg-[#0A0A0C] p-1 rounded-xl border border-[#26262E]">
          {SECTIONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`py-1.5 px-1 rounded-lg font-mono text-[10px] font-bold transition ${
                activeSection === tab.id
                  ? "bg-amber-300 text-slate-950 shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. BASICS */}
      {activeSection === "BASICS" && (
        <SectionCard
          icon={<Compass className="w-4 h-4" />}
          title="Drawing your line"
          accent="text-amber-200"
        >
          <div className="space-y-2.5 text-xs">
            <NumberedRule n={1} title="Start on your Companion">
              Press on your Companion and drag to any neighbouring tile: up,
              down, sideways or diagonally (some gardens close the diagonals).
            </NumberedRule>
            <NumberedRule n={2} title="Each tile once">
              Your line can&apos;t visit a tile twice. Changed your mind? Drag
              back onto the previous tile to take that step back.
            </NumberedRule>
            <NumberedRule n={3} title="Watch the preview">
              While you draw, every tile shows what it will do to your Magic,
              Dew and Sunbeam. If you would run out of Magic, that tile glows
              so you can find another way.
            </NumberedRule>
            <NumberedRule n={4} title="Let go on the Archway">
              Lift your finger on the Archway to walk the line. Let go anywhere
              else and the line simply fades, so a slip never costs you.
            </NumberedRule>
          </div>
          <NextButton
            label="Next: the tiles"
            onClick={() => setActiveSection("TILES")}
          />
        </SectionCard>
      )}

      {/* 2. TILES */}
      {activeSection === "TILES" && (
        <SectionCard
          icon={<Layers className="w-4 h-4" />}
          title="What each tile does"
          accent="text-emerald-300"
        >
          <p className="text-[11px] text-zinc-400">
            Every tile has its own shape as well as its own colour, so you can
            tell them apart at a glance.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {TILE_GUIDE.map((tile) => (
              <div
                key={tile.type}
                className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-2.5 flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-lg bg-[#141418] border border-[#26262E] flex items-center justify-center shrink-0">
                  <EntityIcon type={tile.type} size={32} />
                </div>
                <div className="text-xs">
                  <div className={`font-mono font-bold ${tile.color}`}>
                    {tile.name}{" "}
                    <span className="text-zinc-500 font-normal">
                      · {tile.shape}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    {tile.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <NextButton
            label="Next: taming Briars"
            onClick={() => setActiveSection("BRIARS")}
          />
        </SectionCard>
      )}

      {/* 3. BRIARS */}
      {activeSection === "BRIARS" && (
        <SectionCard
          icon={<Flower2 className="w-4 h-4" />}
          title="Taming a Briar"
          accent="text-rose-300"
        >
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            When your line passes a Briar, its prickle is softened in order:
            Sunbeam first, then Dew, and only then Magic. Try it:
          </p>

          <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-2.5 font-mono text-xs">
            {(
              [
                ["Briar", simBriar, setSimBriar, 3, 9, "text-rose-300", "accent-rose-400"],
                ["Sunbeam", simSun, setSimSun, 0, 8, "text-amber-300", "accent-amber-400"],
                ["Dew", simDew, setSimDew, 0, 8, "text-sky-300", "accent-sky-400"],
                ["Magic", simMagic, setSimMagic, 1, 10, "text-emerald-300", "accent-emerald-400"],
              ] as const
            ).map(([label, value, setValue, min, max, text, accent]) => (
              <label key={label} className="flex items-center justify-between gap-3">
                <span className={`font-bold w-24 ${text}`}>
                  {label}: {value}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className={`flex-1 ${accent}`}
                />
              </label>
            ))}
          </div>

          <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between gap-2 text-zinc-300">
              <span>1. Sunbeam</span>
              <span className="text-amber-300 font-bold text-right">
                {simBriar} − {simSun} → {afterSun} left · Sunbeam fades
              </span>
            </div>
            <div className="flex justify-between gap-2 text-zinc-300">
              <span>2. Dew</span>
              <span className="text-sky-300 font-bold text-right">
                {dewUsed} used · {simDew - dewUsed} Dew left
              </span>
            </div>
            <div className="flex justify-between gap-2 text-zinc-300 border-t border-[#26262E] pt-1.5">
              <span>3. Magic</span>
              <span
                className={`font-black text-right ${
                  finalMagic > 0 ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {simMagic} − {magicLost} = {finalMagic}{" "}
                {finalMagic > 0 ? "· still blooming" : "· out of Magic"}
              </span>
            </div>
          </div>
          <NextButton
            label="Next: stars and par"
            onClick={() => setActiveSection("STARS")}
          />
        </SectionCard>
      )}

      {/* 4. STARS & PAR */}
      {activeSection === "STARS" && (
        <SectionCard
          icon={<Star className="w-4 h-4" />}
          title="Stars, par and ✦ Perfect gardens"
          accent="text-amber-300"
        >
          <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed">
            <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-1.5">
              <div className="font-mono font-bold text-white text-xs">
                Three stars per garden
              </div>
              <p>
                <strong className="text-amber-200">★ Keeper</strong>: reach the
                Archway with Magic left.
              </p>
              <p>
                <strong className="text-amber-200">★ Collector</strong>: gather
                at least 80% of the garden&apos;s Gems.
              </p>
              <p>
                <strong className="text-amber-200">★ Full Bloom</strong>: finish
                with most of your Magic (8 of 10 for the Keeper), or walk 14+
                tiles.
              </p>
              <p>Tap the stars above the board to see your progress live.</p>
            </div>

            <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-1.5">
              <div className="font-mono font-bold text-white text-xs">
                A garden&apos;s score
              </div>
              <p>
                Score = <strong className="text-sky-300">Chips</strong> ×{" "}
                <strong className="text-rose-300">Mult</strong>. Chips are the
                Gems you gather plus the numbers on every tile your line
                touches. Mult is how many tiles long your line is — so a 16-tile
                line multiplies your Chips by 16. Relics add more Chips, Mult or
                ×Mult on top.
              </p>
            </div>

            <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-1.5">
              <div className="font-mono font-bold text-white text-xs">
                Sanctuary Shop &amp; Boss Gardens
              </div>
              <p>
                After each garden you get a Gem payout (3 + 1 per star) and
                visit the Shop: spend Gems on relics (up to 3) or boosts like
                +2 Max Magic, reroll for 10 Gems, or skip. Every 3rd garden is
                a Boss Garden with a twist — clear it to earn a Legendary relic.
              </p>
            </div>

            <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-1.5">
              <div className="font-mono font-bold text-white text-xs">Par</div>
              <p>
                Par is the best line the Sanctuary found for that garden. In
                the Daily everyone shares the same par. Each garden gets a mark
                for how close you came:
              </p>
              <p className="font-mono text-zinc-300">
                ✦ par or better · 🟩 90%+ · 🟨 70%+ · 🟧 below
              </p>
              <p>
                A <strong className="text-amber-200">✦ Perfect garden</strong>{" "}
                matches or beats par. The search isn&apos;t exhaustive, so now
                and then you can find a line that beats it.
              </p>
              <p>
                Stuck? A hint makes one tile on a par line glow for a few
                seconds. Where it fits in is up to you.
              </p>
            </div>

            <div className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-1.5">
              <div className="font-mono font-bold text-white text-xs">
                The Daily
              </div>
              <p>
                One Sanctuary of three gardens, the same for everyone. You play
                it with the Keeper and receive the same Blessing after each
                garden. Your first finished visit is the one that counts, and
                you can resume where you left off.
              </p>
            </div>
          </div>
          <NextButton
            label="Next: garden rules"
            onClick={() => setActiveSection("GARDENS")}
          />
        </SectionCard>
      )}

      {/* 5. GARDEN RULES */}
      {activeSection === "GARDENS" && (
        <SectionCard
          icon={<Sparkles className="w-4 h-4" />}
          title="Garden rules"
          accent="text-violet-300"
        >
          <p className="text-[11px] text-zinc-400">
            Each Sanctuary has one gentle twist that applies to all of its
            gardens:
          </p>

          <div className="space-y-2">
            {MODIFIER_LIST.map((base) => {
              const mod = getThemeAwareModifierInfo(base.id, true);
              return (
                <div
                  key={base.id}
                  className="bg-[#0A0A0C] border border-[#26262E] rounded-xl p-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: mod.accentColor }}
                      />
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {mod.name}
                      </span>
                    </div>
                    <span
                      className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-[#141418] border border-white/10 text-right"
                      style={{ color: mod.accentColor }}
                    >
                      {mod.shortTag}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-snug">
                    {mod.description}
                  </p>
                  <p className="text-[10px] font-mono text-amber-200/90">
                    Tip: {mod.tacticalHint}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onStartPlaying}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white text-[#0A0A0C] font-mono text-xs font-black uppercase hover:bg-zinc-200 transition flex items-center justify-center gap-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Visit today&apos;s garden</span>
            </button>
            {onLaunchGuidedPractice && (
              <button
                type="button"
                onClick={onLaunchGuidedPractice}
                className="py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs font-bold uppercase transition"
              >
                Free Play
              </button>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
