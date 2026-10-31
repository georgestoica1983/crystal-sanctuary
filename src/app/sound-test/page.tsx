"use client";

import React, { useEffect, useState } from "react";
import { soundEngine } from "@/lib/audio";

/**
 * Hidden page (/sound-test) to listen to every sound and the music without
 * playing a Run. Not linked from the game.
 */
const SOUNDS: Array<{ group: string; name: string; play: () => void }> = [
  { group: "Drawing", name: "Line step 1", play: () => soundEngine.playSwipeTick(0) },
  { group: "Drawing", name: "Line step 6", play: () => soundEngine.playSwipeTick(5) },
  { group: "Drawing", name: "Line step 12", play: () => soundEngine.playSwipeTick(11) },
  { group: "Drawing", name: "Line step 20", play: () => soundEngine.playSwipeTick(19) },
  { group: "Drawing", name: "Would lose all Life", play: () => soundEngine.playSwipeTick(3, true) },
  { group: "Drawing", name: "Step back", play: () => soundEngine.playUndoTick() },
  { group: "Drawing", name: "Clear line", play: () => soundEngine.playRetractPath() },
  { group: "Drawing", name: "Release line", play: () => soundEngine.playCommitPath() },
  { group: "Line plays out", name: "Step pulse", play: () => soundEngine.playStepPulse(4) },
  { group: "Line plays out", name: "Thorn hit", play: () => soundEngine.playSwordHit(false) },
  { group: "Line plays out", name: "Thorn cut with Shears", play: () => soundEngine.playSwordHit(true) },
  { group: "Line plays out", name: "Gloves", play: () => soundEngine.playShieldClink() },
  { group: "Line plays out", name: "Gloves break", play: () => soundEngine.playGlassShatter() },
  { group: "Line plays out", name: "Shears pickup", play: () => soundEngine.playWeaponPickup() },
  { group: "Line plays out", name: "Berry", play: () => soundEngine.playPotionEffect(false) },
  { group: "Line plays out", name: "Acorn ×1", play: () => soundEngine.playGoldPickup(1) },
  { group: "Line plays out", name: "Acorn ×4", play: () => soundEngine.playGoldPickup(4) },
  { group: "Line plays out", name: "Spike (hurt)", play: () => soundEngine.playTrapEffect(false) },
  { group: "Line plays out", name: "Spike (diagonal, safe)", play: () => soundEngine.playTrapEffect(true) },
  { group: "Line plays out", name: "Reach the Exit", play: () => soundEngine.playPortalBurst() },
  { group: "Rewards", name: "Bloom chime 1", play: () => soundEngine.playSanctuaryHarpChime(1) },
  { group: "Rewards", name: "Bloom chime 4", play: () => soundEngine.playSanctuaryHarpChime(4) },
  { group: "Rewards", name: "Hint", play: () => soundEngine.playHintReveal() },
  { group: "Rewards", name: "Bed cleared", play: () => soundEngine.playFloorClear() },
  { group: "Rewards", name: "Victory chord", play: () => soundEngine.playVictoryChord() },
  { group: "Rewards", name: "Run over", play: () => soundEngine.playDefeatSound() },
  { group: "Score tally", name: "Value counts up", play: () => soundEngine.playCountRun(0, 6, 700) },
  { group: "Score tally", name: "Length counts up", play: () => soundEngine.playCountRun(5, 5, 600) },
  { group: "Score tally", name: "Multiplier 1", play: () => soundEngine.playMultiplierSparkle(0) },
  { group: "Score tally", name: "Multiplier 3", play: () => soundEngine.playMultiplierSparkle(2) },
  { group: "Score tally", name: "Small line total", play: () => soundEngine.playTallyTotal(0.1) },
  { group: "Score tally", name: "Big line total", play: () => soundEngine.playTallyTotal(0.7) },
  { group: "Score tally", name: "Huge line total", play: () => soundEngine.playTallyTotal(1.2) },
  {
    group: "Score tally",
    name: "Full tally",
    play: () => {
      soundEngine.playCountRun(0, 6, 700);
      window.setTimeout(() => soundEngine.playCountRun(5, 5, 600), 800);
      window.setTimeout(() => soundEngine.playMultiplierSparkle(0), 1500);
      window.setTimeout(() => soundEngine.playMultiplierSparkle(1), 1680);
      window.setTimeout(() => soundEngine.playTallyTotal(0.7), 2150);
    },
  },
  { group: "Bed cleared", name: "Star 1", play: () => soundEngine.playStarLand(1) },
  { group: "Bed cleared", name: "Star 2", play: () => soundEngine.playStarLand(2) },
  { group: "Bed cleared", name: "Star 3", play: () => soundEngine.playStarLand(3) },
  {
    group: "Bed cleared",
    name: "Three stars",
    play: () => [1, 2, 3].forEach((n) => window.setTimeout(() => soundEngine.playStarLand(n), n * 220)),
  },
  { group: "Shop", name: "Buy", play: () => soundEngine.playShopBuy() },
  { group: "Shop", name: "Set complete", play: () => soundEngine.playSetComplete() },
];

export default function SoundTestPage() {
  const [sound, setSound] = useState(false);
  const [music, setMusic] = useState(false);
  useEffect(() => {
    setSound(soundEngine.soundEnabled);
    setMusic(soundEngine.musicEnabled);
  }, []);
  const groups = [...new Set(SOUNDS.map((s) => s.group))];
  const toggle = "h-11 px-4 rounded-xl border font-semibold text-[14px] transition active:scale-95";

  return (
    <main className="min-h-dvh max-w-[430px] mx-auto px-4 py-6 space-y-5 text-white">
      <div>
        <h1 className="text-[24px] font-display font-semibold">Sound test</h1>
        <p className="text-[13px] text-white/60">Every sound in Bloomline. Turn Sound on, then tap to listen.</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${toggle} ${sound ? "bg-lime-300 text-slate-950 border-lime-200" : "bg-white/[0.04] border-white/15"}`}
          onClick={() => {
            soundEngine.setSoundEnabled(!sound);
            setSound(!sound);
          }}
        >
          Sound {sound ? "on" : "off"}
        </button>
        <button
          type="button"
          className={`${toggle} ${music ? "bg-lime-300 text-slate-950 border-lime-200" : "bg-white/[0.04] border-white/15"}`}
          onClick={() => {
            soundEngine.setMusicEnabled(!music);
            setMusic(!music);
          }}
        >
          Music {music ? "on" : "off"}
        </button>
      </div>
      {groups.map((g) => (
        <section key={g} className="space-y-2">
          <h2 className="text-[13px] font-semibold text-white/55">{g}</h2>
          <div className="grid grid-cols-2 gap-2">
            {SOUNDS.filter((s) => s.group === g).map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={s.play}
                className="h-12 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] font-semibold active:bg-white/[0.1] active:scale-95 transition"
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
