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
      className="relative shrink-0 rounded-xl bg-[#1B1F3A] border border-white/10 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <EntityIcon type={type} size={size * 0.62} glow />
      {value !== undefined && (
        <span
          className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-black flex items-center justify-center bg-[#0B0E1C] border"
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

function buildPages(): GuidePage[] {
  const growth2 = getRunSeasonGrowth(2);
  const growth5 = getRunSeasonGrowth(5);
  const commonRelics = RELIC_LIST.filter((r) => r.rarity !== "LEGENDARY").map((r) =>
    getRelicDisplay(r, true)
  );
  const relicGroups: Array<{ category: RelicCategory; title: string }> = [
    { category: "CHIPS", title: "Value" },
    { category: "MULT", title: "+Length bonus" },
    { category: "XMULT", title: "× Multipliers" },
    { category: "ECONOMY", title: "Gems" },
    { category: "MAGIC", title: "Life and defence" },
  ];
  const rarityLabel = { COMMON: "Common", UNCOMMON: "Uncommon", RARE: "Rare", LEGENDARY: "Legendary" };
  const legendaryRelics = RELIC_LIST.filter((r) => r.rarity === "LEGENDARY").map((r) =>
    getRelicDisplay(r, true)
  );

  return [
    {
      title: "Welcome to the Run",
      icon: "🌸",
      body: (
        <>
          <P>
            Crystal Sanctuary is a puzzle of <B>one continuous line</B>. On each board you draw a
            single path for your cat, from the YOU tile to the glowing Exit. Every tile the
            path crosses does something — some help, some hurt — and the whole line is then
            <B> scored</B>.
          </P>
          <P>
            A <B>Run</B> is a chain of gardens that get harder and harder. Each garden has a{" "}
            <B>score target</B>. Reach it within <B>{RUN_STROKES_PER_GARDEN} lines</B> and the garden is cleared: you earn Gems, visit the Shop, and move on. Miss
            it, and the Run is over.
          </P>
          <P>
            There is no final victory: the gardens keep growing until your Run ends. Your record is
            the furthest garden you reached.
          </P>
          <Example title="How to use this guide">
            <div>
              Read it page by page with Next, or jump to any chapter with the ☰ button at the top
              left. It covers the board, your stats, every tile, scoring, gardens, Seasons, the
              Shop, every relic and how a Run ends.
            </div>
          </Example>
          <P>You can reopen this guide, or the hands-on lessons, any time with the ❓ Help button at the top.</P>
        </>
      ),
    },
    {
      title: "The board and drawing a line",
      icon: "✍️",
      body: (
        <>
          <div className="flex gap-3 items-center">
            <Tile type="HERO" label="YOU" size={52} />
            <P>
              <B>The YOU tile — your cat 🐱.</B> Every line starts here. Put your finger on it and
              drag.
            </P>
          </div>
          <div className="flex gap-3 items-center">
            <Tile type="EXIT" label="EXIT" size={52} />
            <P>
              <B>The Exit.</B> Every line must end here. Let go on the Exit and your
              cat walks the line, tile by tile.
            </P>
          </div>
          <Row icon={<span className="text-xl">🧭</span>} title="How a line may move">
            <div>
              • One step at a time to a <B>neighbouring</B> tile — up, down, left, right or any of
              the 4 diagonals (8 directions).
            </div>
            <div>• A line can&apos;t visit the same tile twice and can&apos;t jump over tiles.</div>
            <div>• It may be as long as you like — longer lines score far more (see Scoring).</div>
          </Row>
          <Row icon={<span className="text-xl">👀</span>} title="Live preview">
            <div>
              While you drag, the numbers at the top (Life, Shield, Power, Gems) show exactly what they
              will be after the line. The score bar shows <B>(+N)</B> — what this line would add.
            </div>
            <div>
              Nothing happens until you let go, so explore freely. Drag back onto the previous tile
              to undo a step, or press <B>CLEAR LINE</B>.
            </div>
          </Row>
          <Row icon={<span className="text-xl">↩️</span>} title="When a line can't be walked">
            <div>
              If you let go anywhere except the Exit, or the line would run your Life down to 0,
              it simply pulls back and nothing is spent.
            </div>
          </Row>
          <Row icon={<span className="text-xl">👆</span>} title="Inspect a tile">
            <div>Tap a tile without dragging to see what it does.</div>
          </Row>
        </>
      ),
    },
    {
      title: "Your four stats",
      icon: "📊",
      body: (
        <>
          <P>These are shown in the row at the top while you play.</P>
          <Row icon={<span className="text-2xl">❤️</span>} title="Life — your life">
            <div>
              Shown as <B>now / maximum</B> (e.g. 10/10). Thorns and Spikes take Life away;
              Berries give it back, never above the maximum.
            </div>
            <div>
              <B>If Life would reach 0 the line can&apos;t be walked.</B> Life carries over from
              line to line and from garden to garden — it does <B>not</B> refill by itself.
            </div>
          </Row>
          <Row icon={<EntityIcon type="SHIELD" size={26} glow />} title="Shield — your shield">
            <div>
              Shield soaks up damage from Thorns, point for point, before it reaches your Life. Shield
              stacks and carries over between lines.
            </div>
            <div>Shield does not stop Spikes.</div>
          </Row>
          <Row icon={<EntityIcon type="WEAPON" size={26} glow />} title="Power — your power">
            <div>
              Power weakens the <B>next</B> Thorn you walk into by its amount. Power stacks until you hit
              a Thorn; then it fades to 0 (the Lingering Power tile relic keeps half).
            </div>
          </Row>
          <Row icon={<EntityIcon type="GOLD" size={26} glow />} title="Gems — your purse">
            <div>
              The Gems you can spend in the Shop. In a Run they only come from garden payouts and
              interest — <B>Gems you walk over on the board are score, not money</B>.
            </div>
          </Row>
        </>
      ),
    },
    {
      title: "Helpful tiles",
      icon: "🛡️",
      body: (
        <>
          <P>The number on a tile is its strength. Each of these also adds its number to your Value.</P>
          <Row icon={<Tile type="SHIELD" value={4} />} title="Shield tile — +Shield">
            <div>Gives Shield equal to its number. Shield 4 means the next 4 points of Thorn damage are absorbed.</div>
          </Row>
          <Row icon={<Tile type="WEAPON" value={5} />} title="Power tile — +Power">
            <div>
              Gives Power equal to its number. Collect Power tiles <B>right before</B> a big Thorn to
              clear it for free.
            </div>
          </Row>
          <Row icon={<Tile type="POTION" value={3} />} title="Berries — +Life">
            <div>
              Restore Life equal to the number, up to your maximum. Extra healing beyond the
              maximum is wasted, so save Berries for when you are hurt.
            </div>
          </Row>
          <Row icon={<Tile type="GOLD" value={4} />} title="Gem — Value">
            <div>
              Adds its number to your Value (score). It does not go into your purse in a Run.
            </div>
          </Row>
        </>
      ),
    },
    {
      title: "Dangerous tiles",
      icon: "🌺",
      body: (
        <>
          <Row icon={<Tile type="ENEMY" value={5} />} title="Thorn — costs Life">
            <div>Walking into a Thorn of strength N resolves in this order:</div>
            <div>
              <B>1.</B> Your Power lowers it: damage = N − Power (never below 0). Then your Power fades to
              0.
            </div>
            <div>
              <B>2.</B> Your Shield soaks up what is left, point for point.
            </div>
            <div>
              <B>3.</B> Anything still left comes off your Life.
            </div>
            <div>A cleared Thorn is cleared into a flower, and its number is added to your Value.</div>
          </Row>
          <Example title="Worked example">
            <div>You have Power 3, Shield 1, Life 10 and walk into a Thorn 5.</div>
            <div>• Power: 5 − 3 = 2 damage left. Power becomes 0.</div>
            <div>• Shield: absorbs 1 → 1 damage left. Shield becomes 0.</div>
            <div>• Life: 10 − 1 = 9. The Thorn adds 5 Value.</div>
          </Example>
          <Row icon={<Tile type="TRAP" value={3} />} title="Spike — cuts straight to Life">
            <div>
              Stepping onto a Spike <B>straight</B> (up, down, left or right) takes its full
              number from your Life. Shield and Power don&apos;t help.
            </div>
            <div>
              Stepping onto it <B>diagonally</B> dodges it completely: no damage. Either way its
              number counts as Value.
            </div>
          </Row>
          <div className="flex gap-3 items-center">
            <MiniLine
              cells={[
                { type: null },
                { type: null },
                { type: "EXIT", step: 2, label: "EXIT" },
                { type: null },
                { type: "TRAP", value: 3, step: 1 },
                { type: null },
                { type: "HERO", step: 0, label: "YOU" },
                { type: null },
                { type: null },
              ]}
            />
            <div className="text-[12px] text-indigo-100/85 leading-snug">
              The cat reaches the Spike <B>diagonally</B> (step 1), so it is dodged — 0
              damage, +3 Value — then goes on to the Exit.
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Scoring: Value × Length",
      icon: "🧮",
      body: (
        <>
          <P>Every line that reaches the Exit scores:</P>
          <div className="rounded-xl border-2 border-amber-300 bg-amber-400/10 p-2.5 text-center font-mono font-black text-amber-100">
            <span className="text-sky-300">Value</span> ×{" "}
            <span className="text-rose-300">Length</span> × relic bonuses
          </div>
          <Row icon={<span className="text-xl">🔵</span>} title="Value">
            <div>
              The numbers of every tile on the line added together — Gems, Thorns, Shield tiles,
              Power tiles, Berries and Spikes — plus Value from relics.
            </div>
          </Row>
          <Row icon={<span className="text-xl">🔴</span>} title="Length">
            <div>
              The length of the line in tiles (counting the home tile and the Exit), plus Length
              from relics.
            </div>
          </Row>
          <Row icon={<span className="text-xl">🟣</span>} title="×Length relics">
            <div>Some relics multiply the whole result, e.g. ×1.5.</div>
          </Row>
          <Example title="Worked example">
            <div>A line of 14 tiles that passes 8 worth of Gems and 45 worth of other tiles:</div>
            <div>Value = 8 + 45 = 53 · Length = 14 · Score = 53 × 14 = <B>742</B>.</div>
          </Example>
          <P>
            Because both Value and Length grow with every extra tile, <B>long lines are worth far
            more</B> — doubling a line roughly quadruples its score. The catch: a long line usually
            crosses more Thorns, so it costs Life you will need later.
          </P>
        </>
      ),
    },
    {
      title: "A garden: lines and the Tile Bag",
      icon: "🌱",
      body: (
        <>
          <Row icon={<span className="text-xl">🎯</span>} title="Target and lines">
            <div>
              Each garden gives you <B>{RUN_STROKES_PER_GARDEN} lines</B>. Each line&apos;s score
              is added to the garden total (the green bar). Reach the target and the garden is cleared
              at once — leftover lines become bonus Gems.
            </div>
          </Row>
          <Row icon={<span className="text-xl">🔁</span>} title="Between lines">
            <div>
              Every tile your line used is <B>replaced</B> with a new tile from your Tile Bag. The
              YOU tile and the Exit stay where they are and your cat starts again from
              home.
            </div>
            <div>
              Life, Shield and Power carry over to the next line — so a greedy line that leaves you
              at 1 Life can ruin the rest of the garden.
            </div>
          </Row>
          <Row icon={<span className="text-xl">👜</span>} title="The Tile Bag">
            <div>
              Your Run has a bag of {RUN_SEED_BAG_SIZE} tiles. Each garden starts by shuffling it and
              laying out 23 of them. Used tiles go to a discard pile; when the bag runs out, the
              discard pile is shuffled back in. It starts with:
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
              <span>🌺 15 Thorns (3–6)</span>
              <span>🛡️ 6 Shield tiles (2–5)</span>
              <span>☀️ 6 Power tiles (3–6)</span>
              <span>🍓 5 Berries (2–5)</span>
              <span>💎 5 Gems (2–6)</span>
              <span>⚙️ 3 Spikes (2–4)</span>
            </div>
          </Row>
          <Row icon={<span className="text-xl">🚪</span>} title="Between gardens">
            <div>
              Your Life and Power carry into the next garden (Life still doesn&apos;t refill). The
              Keeper starts each garden with +2 Shield plus half its leftover Shield.
            </div>
          </Row>
        </>
      ),
    },
    {
      title: "Swaps and Hints",
      icon: "🌿",
      body: (
        <>
          <Row icon={<span className="text-2xl">🌿</span>} title={`Swap (${RUN_WEEDOUTS_PER_GARDEN} per garden)`}>
            <div>
              Tap <B>Swap</B>, then tap up to {RUN_WEEDOUT_MAX_TILES} tiles and confirm. Those
              tiles are swapped for new ones from the Tile Bag. A Swap doesn&apos;t use a line.
            </div>
            <div>
              Use it to remove a Thorn that blocks your best route, or to fish for Power tiles, Shield and
              Berries. Unused Swaps don&apos;t carry over.
            </div>
          </Row>
          <Row icon={<span className="text-2xl">✨</span>} title="Hint (1 per garden)">
            <div>
              Lights up the next 3 steps of a strong, safe line for a few seconds. Great when you
              are stuck — but it&apos;s only a nudge, not always the best line.
            </div>
          </Row>
          <Row icon={<span className="text-2xl">🪨</span>} title="No safe line">
            <div>
              If no line at all can reach the Exit with your Life, the strip turns red and the
              Swap button pulses. Swap some Thorns to open a path — if no Swaps are
              left, the Run ends.
            </div>
          </Row>
        </>
      ),
    },
    {
      title: "Seasons and Boss Gardens",
      icon: "🗓️",
      body: (
        <>
          <P>
            The Run is split into <B>Seasons</B>. Each Season has three gardens: a{" "}
            <B>Small Garden</B>, a <B>Big Garden</B> (×1.5 target) and a <B>Boss Garden</B> (×2
            target).
          </P>
          <div className="rounded-xl border border-white/10 overflow-hidden text-[11px] font-mono">
            <div className="grid grid-cols-4 bg-white/10 font-black text-white">
              <span className="px-2 py-1">Season</span>
              <span className="px-2 py-1">Small</span>
              <span className="px-2 py-1">Big</span>
              <span className="px-2 py-1">Boss</span>
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <div key={s} className="grid grid-cols-4 odd:bg-white/[0.03] text-indigo-100">
                <span className="px-2 py-0.5">{s}</span>
                <span className="px-2 py-0.5">{fmt(getRunGardenTarget(s, "SMALL"))}</span>
                <span className="px-2 py-0.5">{fmt(getRunGardenTarget(s, "BIG"))}</span>
                <span className="px-2 py-0.5">{fmt(getRunGardenTarget(s, "BOSS"))}</span>
              </div>
            ))}
          </div>
          <P>
            After Season {RUN_FINAL_SEASON} the Run turns <B>Endless</B>: every new Season&apos;s
            targets are ×{RUN_ENDLESS_GROWTH}.
          </P>
          <Row icon={<span className="text-xl">⚙️</span>} title="The garden grows wilder">
            <div>
              Every Season, Thorns grow +1 stronger and Spikes +1 every two Seasons (Season 2:
              Thorns +{growth2.briar}; Season 5: Thorns +{growth5.briar}, Spikes +{growth5.thistle}).
              Shield, Power tiles and Berries don&apos;t grow — so long lines get more and more expensive.
              Stronger tiles do score more Value.
            </div>
          </Row>
          <Row icon={<span className="text-xl">👑</span>} title="Boss Gardens">
            <div>
              Each Boss Garden has a twist, shown in a red banner (the tile numbers already include
              it). Clear it to earn a <B>Legendary relic</B>.
            </div>
            {Object.values(BOSS_RULE_REGISTRY).map((b) => (
              <div key={b.id}>
                {b.icon} <B>{b.name}</B> — {b.description}
              </div>
            ))}
          </Row>
        </>
      ),
    },
    {
      title: "Gems and the Shop",
      icon: "💎",
      body: (
        <>
          <P>Gems are scarce on purpose — every one you spend is a choice.</P>
          <Row icon={<span className="text-xl">🌸</span>} title="Garden payout">
            <div>
              When a garden is cleared you get: Small {RUN_CLEAR_REWARD.SMALL} 💎 · Big{" "}
              {RUN_CLEAR_REWARD.BIG} 💎 · Boss {RUN_CLEAR_REWARD.BOSS} 💎, plus <B>+1 💎 per unused
              line</B>.
            </div>
          </Row>
          <Row icon={<span className="text-xl">🏦</span>} title="Interest">
            <div>
              You also earn +1 💎 for every {RUN_INTEREST_STEP} 💎 you are holding when the garden
              is cleared (up to +{RUN_INTEREST_MAX}). Saving {RUN_INTEREST_STEP * RUN_INTEREST_MAX} 💎
              earns the full +{RUN_INTEREST_MAX} every garden.
            </div>
          </Row>
          <Row icon={<span className="text-xl">🛍️</span>} title="The Sanctuary Shop">
            <div>
              Opens after every garden with 3 offers: relics and boosts. Buy what you can afford,
              or leave to save for interest. Common relics show up most often, Rare ones least.
            </div>
            <div>
              <B>Reroll</B> draws 3 new offers: {RUN_REROLL_BASE_COST} 💎, then 1 💎 more each time
              in the same Shop.
            </div>
            <div>
              You can hold {MAX_COMMON_RELICS} relics. Legendary relics from Bosses don&apos;t take a
              slot. Tap a relic in the Shop to <B>sell</B> it for half its price (at least 1 💎) and
              free its slot — a growing relic loses its growth when sold.
            </div>
          </Row>
          <Row icon={<span className="text-xl">⬆️</span>} title="Boosts (last the whole Run)">
            {Object.values(SHOP_STAT_BOOSTS).map((b) => (
              <div key={b.name}>
                {b.icon} <B>{b.name}</B> ({b.cost} 💎) — {b.description}
              </div>
            ))}
          </Row>
        </>
      ),
    },
    {
      title: "Relics",
      icon: "🧿",
      body: (
        <>
          <P>
            Relics are lasting powers for the rest of the Run. Score relics are what let you keep up
            with the growing targets — from Season 3 on you will need them.
          </P>
          <P>
            🌱 <B>Growing</B> relics get stronger every garden you keep them — buy them early. Mix
            Value, +Length and ×Length relics: they multiply each other.
          </P>
          {relicGroups.map((g) => (
            <React.Fragment key={g.category}>
              <div className="text-[11px] font-mono font-black uppercase text-cyan-200 pt-1">
                {g.title}
              </div>
              {commonRelics
                .filter((r) => (r.category ?? "MAGIC") === g.category)
                .map((r) => (
                  <Row
                    key={r.id}
                    icon={<span className="text-xl">{r.icon}</span>}
                    title={`${r.name} · ${r.cost ?? 10} 💎`}
                  >
                    <div>
                      {r.description}
                      {r.scaling && " 🌱"}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      {rarityLabel[r.rarity ?? "COMMON"]} · sells for {getRelicSellValue(r.id)} 💎
                    </div>
                  </Row>
                ))}
            </React.Fragment>
          ))}
          <div className="text-[11px] font-mono font-black uppercase text-fuchsia-200 pt-1">
            Legendary (Boss rewards)
          </div>
          {legendaryRelics.map((r) => (
            <Row key={r.id} icon={<span className="text-xl">{r.icon}</span>} title={r.name}>
              <div>{r.description}</div>
            </Row>
          ))}
        </>
      ),
    },
    {
      title: "How a Run ends",
      icon: "🥀",
      body: (
        <>
          <Row icon={<span className="text-xl">🥀</span>} title="Target missed">
            <div>Your last line of a garden is walked and the total is still below the target.</div>
          </Row>
          <Row icon={<span className="text-xl">🪨</span>} title="No safe line">
            <div>No line can reach the Exit with your Life and you have no Swaps left.</div>
          </Row>
          <Row icon={<span className="text-xl">🌙</span>} title="End Run">
            <div>You can end a Run yourself with END RUN, or start over with NEW RUN.</div>
          </Row>
          <P>
            The summary shows the garden you reached, your Run score and your <B>best Run</B> on
            this device.
          </P>
        </>
      ),
    },
    {
      title: "Companions and tips",
      icon: "🐱",
      body: (
        <>
          <P>Your Companion has a special trait. The Keeper is free; others come with the Expansion.</P>
          {HERO_CLASS_LIST.map((c) => (
            <Row
              key={c.id}
              icon={<span className="text-xl">{c.sanctuaryEmblem ?? c.emblem}</span>}
              title={`${c.sanctuaryName ?? c.name} · ${c.maxHp} Life`}
            >
              <div>
                <B>{c.sanctuaryPassiveName ?? c.passiveName}:</B>{" "}
                {c.sanctuaryPassiveSummary ?? c.passiveSummary}
              </div>
            </Row>
          ))}
          <Example title="Tips">
            <div>• Pick up Power right before the biggest Thorn on your line.</div>
            <div>• Enter Spikes diagonally — they then cost nothing and still score.</div>
            <div>• Don&apos;t spend all your Life on one line: you have {RUN_STROKES_PER_GARDEN} lines, and Life doesn&apos;t refill.</div>
            <div>• Finishing a garden early pays +1 💎 per unused line.</div>
            <div>• Hold 25 💎 when you can — interest adds up fast.</div>
            <div>• Swap the tile that blocks your best long line.</div>
          </Example>
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
      <div className="relative w-full max-w-[440px] sm:max-h-[92dvh] flex flex-col bg-gradient-to-b from-[#16203A] via-[#111831] to-[#0B1020] rounded-2xl border border-emerald-300/40 shadow-[0_0_40px_rgba(52,211,153,0.25)] text-white overflow-hidden">
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
            How to play
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
          <div className="mx-3 mt-2 rounded-xl border border-white/10 bg-[#0B1020] p-1.5 grid grid-cols-1 gap-0.5 max-h-[50dvh] overflow-y-auto">
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
