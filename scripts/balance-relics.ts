// Balance check for Run relics: plays Season 3–5 gardens with the par
// solver (best line each of the 4 strokes, board refills between) under a
// few relic sets, and compares each garden's total with its target.
// Run with: node scripts/run-ts.cjs scripts/balance-relics.ts
import {
  createRunGarden,
  generateRunSeedBag,
  getInitialHeroStatsForClass,
  getNextFloorHeroStats,
  getRunGardenPosition,
  refillRunGarden,
  RUN_STROKES_PER_GARDEN,
  searchBestFloorLine,
} from "@/lib/engine";
import { RUN_MODIFIER, scoreRunStroke } from "@/lib/runReplay";
import type { RelicCounters, RelicId } from "@/types/game";

const BUDGET = Number(process.env.BUDGET ?? 15000);
const SEEDS = ["bal-a", "bal-b", "bal-c"];
const SEASONS = [3, 4, 5];

// Growth a relic bought after Season 1's Big Garden would have by the start
// of this Season: one bloom per garden since, ~2 spare Weed-outs and ~10
// Briars cleared per garden
const grown = (season: number): RelicCounters => {
  const blooms = Math.max(0, (season - 1) * 3 - 2);
  return { OAK_SAPLING: blooms, ELDER_TREE: blooms, RAIN_BARREL: blooms * 2, COMPOST_HEAP: blooms * 10 };
};

const SETS: Array<{ name: string; relics: RelicId[] }> = [
  { name: "no relics", relics: [] },
  { name: "flat starter", relics: ["MOSSY_STONE", "LADYBUG", "BERRY_BASKET"] },
  {
    name: "long-line ×Mult",
    relics: ["HARVEST_MOON", "STARLIGHT_COMPASS", "ZIGZAG_KITE", "OAK_SAPLING", "MOSSY_STONE"],
  },
  {
    name: "Briar build",
    relics: ["BRIAR_PRESS", "COMPOST_HEAP", "SUNFLOWER", "EVENING_LANTERN", "LADYBUG"],
  },
  {
    name: "growing",
    relics: ["ELDER_TREE", "OAK_SAPLING", "COMPOST_HEAP", "RAIN_BARREL", "STARLIGHT_COMPASS"],
  },
  {
    name: "long-line + 2 Legendaries",
    relics: ["HARVEST_MOON", "STARLIGHT_COMPASS", "ZIGZAG_KITE", "OAK_SAPLING", "MOSSY_STONE", "RAINBOW_HEART", "THORN_CROWN"],
  },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

for (const set of SETS) {
  const rows: string[] = [];
  let reached = 0;
  let total = 0;
  for (const season of SEASONS) {
    for (let k = 0; k < 3; k++) {
      const gardenIndex = (season - 1) * 3 + k;
      for (const seed of SEEDS) {
        const counters = grown(season);
        const bag = generateRunSeedBag(seed);
        // A Companion arriving with a little extra Max Magic from the Shop
        const base = getInitialHeroStatsForClass("KNIGHT");
        let hero = getNextFloorHeroStats({ ...base, maxHp: base.maxHp + 2, hp: base.hp + 2 }, "KNIGHT", set.relics, {
          bonusMaxMagic: 2,
          bonusStartDew: 0,
        });
        let { floor, state } = createRunGarden({
          runSeed: seed,
          bag,
          gardenIndex,
          modifierId: RUN_MODIFIER,
          hero,
          heroClassId: "KNIGHT",
          activeRelics: set.relics,
        });
        let grid = floor.grid;
        let score = 0;
        let c = counters;
        for (let st = 0; st < RUN_STROKES_PER_GARDEN; st++) {
          const best = searchBestFloorLine(grid, hero, RUN_MODIFIER, "KNIGHT", set.relics, BUDGET, {
            counters: c,
            strokesLeft: state.strokesLeft,
          });
          if (!best) break;
          const r = scoreRunStroke(best.sim, hero, best.path, set.relics, c, state.strokesLeft, false);
          score += r.breakdown.total;
          c = r.countersAfter;
          state = { ...state, strokesLeft: state.strokesLeft - 1 };
          if (score >= state.target) break;
          const refill = refillRunGarden(grid, best.path, state, seed);
          grid = refill.grid;
          state = refill.state;
          hero = r.afterStroke;
        }
        total++;
        if (score >= state.target) reached++;
        const { kind } = getRunGardenPosition(gardenIndex);
        rows.push(`S${season} ${kind.padEnd(5)} ${seed}: ${fmt(score).padStart(9)} / ${fmt(state.target).padStart(7)} ${score >= state.target ? "✓" : "✗"}`);
      }
    }
  }
  console.log(`\n== ${set.name}: ${reached}/${total} gardens reach target`);
  console.log(rows.join("\n"));
}
