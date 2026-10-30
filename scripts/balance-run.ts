// Difficulty check for whole Runs: bots play Seasons 1–3 from the start
// (best line each stroke, cheapest Shop buys) under each rules version and
// report how far they get and how close each garden came to its target.
// Run with: node scripts/run-ts.cjs scripts/balance-run.ts
// Env: VERSIONS=3,4  SEEDS=16  BUDGET=20000 (strong player) / 600 (casual)
import { findEntityCoord, searchBestFloorLine } from "@/lib/engine";
import { createRunReplayer, packCoords, runModifierFor } from "@/lib/runReplay";

const VERSIONS = (process.env.VERSIONS ?? "3,4").split(",").map(Number);
const SEEDS = Number(process.env.SEEDS ?? 16);
const BUDGETS = (process.env.BUDGET ?? "20000,600").split(",").map(Number);
const MAX_GARDENS = Number(process.env.GARDENS ?? 9);
/** Ascension level to test (rules v8+) */
const ASC = Number(process.env.ASC ?? 0);

for (const budget of BUDGETS) {
  for (const v of VERSIONS) {
    const modifier = runModifierFor(v);
    const reachedCounts: number[] = [];
    // ratio of score / target per garden index, and Life at the garden's start
    const ratios: number[][] = Array.from({ length: MAX_GARDENS }, () => []);
    const lifeAtStart: number[][] = Array.from({ length: MAX_GARDENS }, () => []);
    const lifeLost: number[][] = Array.from({ length: MAX_GARDENS }, () => []);
    const linesUsed: number[][] = Array.from({ length: MAX_GARDENS }, () => []);
    // Why Runs ended before MAX_GARDENS: out of lines (short of target) or no safe line left
    const endings = { shortOfTarget: 0, noSafeLine: 0 };
    for (let i = 0; i < SEEDS; i++) {
      const run = createRunReplayer(`bal-run-${i}`, "KNIGHT", v, ASC);
      let lastGarden = -1;
      for (let guard = 0; guard < 400 && run.state.phase !== "OVER"; guard++) {
        const s = run.state;
        if (s.phase === "SHOP") {
          if (s.gardensBloomed >= MAX_GARDENS) break;
          const offer = [...s.shop.offers]
            .filter((o) => !s.shop.soldIds.includes(o.id))
            .sort((a, b) => a.cost - b.cost)
            .find((o) => run.apply({ k: "b", o: o.id }) === null);
          if (offer) continue;
          run.apply({ k: "l", h: s.classId });
          continue;
        }
        const g = s.garden.gardenIndex;
        if (g !== lastGarden && g < MAX_GARDENS) {
          lifeAtStart[g].push(s.startHero.hp);
          lastGarden = g;
        }
        const best = searchBestFloorLine(s.grid, s.startHero, modifier, s.classId, s.relics, budget, {
          counters: s.counters,
          strokesLeft: s.garden.strokesLeft,
        });
        const before = s.garden;
        const hpBefore = s.startHero.hp;
        if (best && best.score > 0) {
          run.apply({ k: "s", p: packCoords(best.path) });
          if (g < MAX_GARDENS) lifeLost[g].push(Math.max(0, hpBefore - best.sim.finalStats.hp));
          const after = run.state;
          const finished = after.phase !== "PLAY" || after.garden.gardenIndex !== g;
          if (finished && g < MAX_GARDENS) {
            ratios[g].push((before.score + best.score) / before.target);
            linesUsed[g].push(4 - before.strokesLeft + 1);
          }
        } else if (s.garden.weedOutsLeft > 0) {
          const home = findEntityCoord(s.grid, "HERO")!;
          const near = [-1, 0, 1]
            .map((dc) => ({ row: home.row - 1, col: home.col + dc }))
            .filter((c) => c.col >= 0 && c.col < 5 && c.row >= 0);
          if (run.apply({ k: "w", c: packCoords(near) })) break;
        } else {
          if (g < MAX_GARDENS) ratios[g].push(before.score / before.target);
          endings.noSafeLine++;
          break;
        }
      }
      reachedCounts.push(run.state.gardensBloomed);
      if (run.state.phase === "OVER" && run.state.gardensBloomed < MAX_GARDENS) endings.shortOfTarget++;
    }
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
    const median = (a: number[]) => {
      if (!a.length) return NaN;
      const b = [...a].sort((x, y) => x - y);
      return b[Math.floor(b.length / 2)];
    };
    console.log(`\n== rules v${v} (${modifier}) A${ASC}, budget ${budget}, ${SEEDS} seeds`);
    console.log(
      `gardens cleared: median ${median(reachedCounts)}, avg ${avg(reachedCounts).toFixed(1)}, ` +
        `cleared all ${MAX_GARDENS}: ${reachedCounts.filter((n) => n >= MAX_GARDENS).length}`
    );
    console.log(`ended early: ${endings.shortOfTarget} out of lines or Life (Run over), ${endings.noSafeLine} stuck with no scoring line`);
    for (let g = 0; g < MAX_GARDENS; g++) {
      if (!ratios[g].length) continue;
      const cleared = ratios[g].filter((r) => r >= 1).length;
      console.log(
        `  garden ${g + 1}: played ${ratios[g].length}, cleared ${cleared}, ` +
          `score/target median ${median(ratios[g]).toFixed(2)}, Life at start ${avg(lifeAtStart[g]).toFixed(1)}, ` +
          `Life lost per line ${avg(lifeLost[g]).toFixed(1)}, lines used ${avg(linesUsed[g]).toFixed(1)}`
      );
    }
  }
}
