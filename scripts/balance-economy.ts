// Save vs buy: bots play Seasons 1–3 with the same lines but different Shop
// habits, to see whether saving Seeds for interest can compete with buying.
// Run with: node scripts/run-ts.cjs scripts/balance-economy.ts  (SEEDS=24 BUDGET=600)
import { RELIC_REGISTRY, searchBestFloorLine } from "@/lib/engine";
import { createRunReplayer, packCoords, RUN_MODIFIER } from "@/lib/runReplay";
import type { RunReplayState } from "@/lib/runReplay";

const SEEDS = Number(process.env.SEEDS ?? 24);
const BUDGET = Number(process.env.BUDGET ?? 600);
const GARDENS = Number(process.env.GARDENS ?? 9);

type Strategy = { name: string; shop: (s: RunReplayState) => string | null };

const scoreRelic = (id?: string) => {
  const c = id ? RELIC_REGISTRY[id as keyof typeof RELIC_REGISTRY]?.category : undefined;
  return c === "CHIPS" || c === "MULT" || c === "XMULT";
};
const open = (s: RunReplayState) => s.shop.offers.filter((o) => !s.shop.soldIds.includes(o.id));

const STRATEGIES: Strategy[] = [
  { name: "never buy (save all)", shop: () => null },
  {
    name: "buy cheapest anything",
    shop: (s) => [...open(s)].sort((a, b) => a.cost - b.cost).find((o) => o.cost <= s.shop.stats.gold)?.id ?? null,
  },
  {
    name: "buy score relics only",
    shop: (s) =>
      [...open(s)]
        .filter((o) => o.kind === "RELIC" && scoreRelic(o.relicId))
        .sort((a, b) => a.cost - b.cost)
        .find((o) => o.cost <= s.shop.stats.gold)?.id ?? null,
  },
  {
    name: "keep 10 for interest, buy score relics with the rest",
    shop: (s) =>
      [...open(s)]
        .filter((o) => o.kind === "RELIC" && scoreRelic(o.relicId))
        .sort((a, b) => a.cost - b.cost)
        .find((o) => s.shop.stats.gold - o.cost >= 10)?.id ?? null,
  },
];

for (const strat of STRATEGIES) {
  let cleared = 0;
  let finalScore = 0;
  for (let i = 0; i < SEEDS; i++) {
    const run = createRunReplayer(`econ-${i}`, "KNIGHT");
    for (let guard = 0; guard < 400 && run.state.phase !== "OVER"; guard++) {
      const s = run.state;
      if (s.phase === "SHOP") {
        if (s.gardensBloomed >= GARDENS) break;
        const pick = strat.shop(s);
        if (pick && run.apply({ k: "b", o: pick }) === null) continue;
        run.apply({ k: "l", h: s.classId });
        continue;
      }
      const best = searchBestFloorLine(s.grid, s.startHero, RUN_MODIFIER, s.classId, s.relics, BUDGET, {
        counters: s.counters,
        strokesLeft: s.garden.strokesLeft,
      });
      if (best && best.score > 0) run.apply({ k: "s", p: packCoords(best.path) });
      else break;
    }
    cleared += run.state.gardensBloomed;
    finalScore += run.state.score;
  }
  console.log(
    `${strat.name.padEnd(52)} beds cleared avg ${(cleared / SEEDS).toFixed(2)} · run score avg ${Math.round(finalScore / SEEDS).toLocaleString("en-US")}`
  );
}
