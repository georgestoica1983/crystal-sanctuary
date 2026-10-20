// Replay checks for the Run leaderboard: recorded Runs must replay to the
// exact score the game showed, and tampered logs must be refused.
// Run with: npm run check:replay
import { readdirSync, readFileSync } from "fs";
import path from "path";
import {
  countCommonRelics,
  findEntityCoord,
  findSurvivableHintPath,
  getRelicSellValue,
  MAX_COMMON_RELICS,
  RELIC_REGISTRY,
  searchBestFloorLine,
} from "@/lib/engine";
import {
  createRunReplayer,
  packCoords,
  replayRun,
  RUN_LOG_VERSION,
  RUN_MODIFIER,
  RunActionLog,
  RunLogAction,
} from "@/lib/runReplay";
import { verifyRunSubmission } from "@/lib/server/runLeaderboard";
import { PRACTICE_GARDEN_SEED } from "@/lib/runLessons";
import type { HeroClassId } from "@/types/game";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

/**
 * A simple bot that plays a seeded Run through the replayer: best searched
 * line each stroke (scored with its relics' growth and stroke number), a
 * Weed-out near the Companion when stuck, buys the cheapest offer it can
 * afford, and with full slots sells its oldest relic for a relic on offer.
 * Returns its log and the score it expects from the searched lines' scores.
 */
function playBotRun(seed: string, hero: HeroClassId, maxGardens: number) {
  const run = createRunReplayer(seed, hero);
  const log: RunActionLog = { v: RUN_LOG_VERSION, seed, hero, a: [] };
  let expected = 0;
  const act = (a: RunLogAction) => {
    const err = run.apply(a);
    if (err) throw new Error(`bot made an illegal move: ${err}`);
    log.a.push(a);
  };
  for (let guard = 0; guard < 500 && run.state.phase !== "OVER"; guard++) {
    const s = run.state;
    if (s.phase === "SHOP") {
      if (s.gardensBloomed >= maxGardens) break;
      if (s.shop.rerolls === 0 && s.shop.stats.gold >= 20) act({ k: "r" });
      const relicOffer = run.state.shop.offers.find(
        (o) => o.kind === "RELIC" && !run.state.shop.soldIds.includes(o.id)
      );
      const oldest = run.state.relics.find((id) => RELIC_REGISTRY[id].rarity !== "LEGENDARY");
      if (
        relicOffer &&
        oldest &&
        countCommonRelics(run.state.relics) >= MAX_COMMON_RELICS &&
        run.state.shop.stats.gold + (getRelicSellValue(oldest) ?? 0) >= relicOffer.cost
      ) {
        act({ k: "x", r: oldest });
        act({ k: "b", o: relicOffer.id });
        continue;
      }
      const offer = [...run.state.shop.offers]
        .filter((o) => !run.state.shop.soldIds.includes(o.id))
        .sort((a, b) => a.cost - b.cost)
        .find((o) => run.apply({ k: "b", o: o.id }) === null);
      if (offer) {
        log.a.push({ k: "b", o: offer.id });
        continue;
      }
      act({ k: "l", h: s.classId });
      continue;
    }
    const best = searchBestFloorLine(s.grid, s.startHero, RUN_MODIFIER, s.classId, s.relics, 20000, {
      counters: s.counters,
      strokesLeft: s.garden.strokesLeft,
    });
    if (best && best.score > 0) {
      expected += best.score;
      act({ k: "s", p: packCoords(best.path) });
    } else if (s.garden.weedOutsLeft > 0) {
      const home = findEntityCoord(s.grid, "HERO")!;
      const near = [-1, 0, 1]
        .flatMap((dc) => [{ row: home.row - 1, col: home.col + dc }])
        .filter((c) => c.col >= 0 && c.col < 5);
      act({ k: "w", c: packCoords(near) });
    } else {
      break;
    }
  }
  return { log, expected, state: run.state };
}

// 1. Recorded Runs (played in the real game) replay to the score it showed
const fixturesDir = path.join(__dirname, "fixtures");
const fixtures = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
check("at least one recorded Run fixture", fixtures.length > 0);
for (const file of fixtures) {
  const rec = JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8")) as {
    score: number;
    gardenIndex: number;
    log: RunActionLog;
  };
  const replay = replayRun(rec.log);
  check(
    `${file}: replays to the game's score`,
    replay.ok && replay.score === rec.score,
    replay.ok ? `${replay.score} vs ${rec.score}, ${replay.gardenIndex} gardens` : replay.error
  );
  const verified = verifyRunSubmission(rec);
  check(`${file}: server accepts it`, verified.ok, verified.ok ? "" : verified.error);
}

// 2. Bot Runs: the replay agrees with the searched lines' own scores
const bots: Array<{ seed: string; hero: HeroClassId }> = [
  { seed: "run-1700000000000-123456", hero: "KNIGHT" },
  { seed: "run-1700000000001-42", hero: "ROGUE" },
  { seed: "run-1700000000002-7", hero: "MAGE" },
  { seed: "run-1700000000003-99", hero: "VAMPIRE" },
];
const botLogs: Array<{ log: RunActionLog; score: number }> = [];
for (const b of bots) {
  const t0 = Date.now();
  const { log, expected, state } = playBotRun(b.seed, b.hero, 9);
  const t1 = Date.now();
  const replay = replayRun(JSON.parse(JSON.stringify(log)));
  const ms = Date.now() - t1;
  check(
    `bot ${b.hero}: replay matches (${state.gardensBloomed} gardens, ${log.a.length} actions, ${
      log.a.filter((a) => a.k === "x").length
    } sold, relics ${state.relics.join(",") || "none"}, replay ${ms}ms, bot ${t1 - t0}ms)`,
    replay.ok && replay.score === expected && replay.score === state.score,
    replay.ok ? `${replay.score} vs ${expected}` : replay.error
  );
  botLogs.push({ log, score: expected });
}

// 3. Tampering is refused
const base = botLogs.find((b) => b.log.a.some((a) => a.k === "b")) ?? botLogs[0];
const clone = (): RunActionLog => JSON.parse(JSON.stringify(base.log));
const submit = (log: unknown, score = base.score) => {
  const result = verifyRunSubmission({ score, gardenIndex: 1, log });
  const replay = replayRun(log);
  return { ...result, why: replay.ok ? "" : ` (${replay.error})` };
};
const refused = (label: string, result: ReturnType<typeof submit>) =>
  check(`refused: ${label}`, !result.ok, result.ok ? "accepted!" : result.error + result.why);

check("untampered bot Run is accepted", submit(clone()).ok);
refused("inflated score", submit(clone(), base.score + 1));
refused("lower score than replay", submit(clone(), base.score - 1));
{
  const log = clone();
  const stroke = log.a.find((a) => a.k === "s") as { k: "s"; p: number[] };
  stroke.p = [stroke.p[0], 0, 24]; // jumps across the board
  refused("illegal step in a stroke", submit(log));
}
{
  const log = clone();
  const stroke = log.a.find((a) => a.k === "s") as { k: "s"; p: number[] };
  stroke.p = stroke.p.slice(0, -1); // stops short of the Archway
  refused("line that doesn't reach the Archway", submit(log));
}
{
  const log = clone();
  const i = log.a.findIndex((a) => a.k === "s");
  log.a.splice(i, 0, ...Array.from({ length: 4 }, () => ({ k: "w", c: [0] }) as RunLogAction));
  refused("more weed-outs than allowed", submit(log));
}
{
  // Short safe lines never bloom the garden, so the 4 strokes run out.
  // This seed was picked for the v2 boards, so the scenario runs on v2 rules
  // (older logs must keep replaying with their own rules anyway).
  const seed = "run-1700000000004-5";
  const run = createRunReplayer(seed, "KNIGHT", 2);
  const log: RunActionLog = { v: 2, seed, hero: "KNIGHT", a: [] };
  for (let i = 0; i < 5; i++) {
    const s = run.state;
    const line = findSurvivableHintPath(s.grid, s.startHero, RUN_MODIFIER, s.classId, s.relics, false);
    const p = packCoords(line ?? [findEntityCoord(s.grid, "HERO")!]);
    log.a.push({ k: "s", p });
    if (i < 4) run.apply({ k: "s", p });
  }
  check("4 short strokes leave the garden unbloomed", run.state.phase === "OVER" && run.state.gardensBloomed === 0);
  refused("a 5th stroke in one garden", submit(log, run.state.score));
}
{
  const log = clone();
  const i = log.a.findIndex((a) => a.k === "b");
  log.a.splice(i, 0, ...Array.from({ length: 30 }, () => ({ k: "r" }) as RunLogAction));
  refused("unaffordable rerolls", submit(log));
}
{
  const log = clone();
  const i = log.a.findIndex((a) => a.k === "b");
  log.a.splice(i + 1, 0, log.a[i]);
  refused("buying a sold offer twice", submit(log));
}
{
  const log = clone();
  const i = log.a.findIndex((a) => a.k === "b");
  log.a[i] = { k: "b", o: "f1-r0-relic9" };
  refused("buying an offer that isn't in the Shop", submit(log));
}
{
  const log = clone();
  const i = log.a.findIndex((a) => a.k === "l");
  log.a[i] = { k: "l", h: "MAGE" };
  refused("switching Companion mid-run", submit(log));
}
{
  const log = clone();
  log.seed = "run-1700000000000-999999";
  refused("same actions on another seed", submit(log));
}
{
  // A bot only sells once its 5 slots are full, so look across a few more seeds
  let withSale = botLogs.find((b) => b.log.a.some((a) => a.k === "x"));
  for (let i = 0; !withSale && i < 12; i++) {
    const extra = playBotRun(`run-1700000000100-${i}`, "KNIGHT", 14);
    const replay = replayRun(JSON.parse(JSON.stringify(extra.log)));
    if (extra.log.a.some((a) => a.k === "x") && replay.ok && replay.score === extra.expected) {
      withSale = { log: extra.log, score: extra.expected };
    }
  }
  check("a bot Run sold a relic", Boolean(withSale));
  if (withSale) {
    const cloneSale = (): RunActionLog => JSON.parse(JSON.stringify(withSale.log));
    const submitSale = (log: unknown) => {
      const result = verifyRunSubmission({ score: withSale.score, gardenIndex: 1, log });
      const replay = replayRun(log);
      return { ...result, why: replay.ok ? "" : ` (${replay.error})` };
    };
    check("untampered Run with a sale is accepted", submitSale(cloneSale()).ok);
    {
      const log = cloneSale();
      const i = log.a.findIndex((a) => a.k === "x");
      log.a.splice(i + 1, 0, log.a[i]);
      refused("selling the same relic twice", submitSale(log));
    }
    {
      const log = cloneSale();
      const i = log.a.findIndex((a) => a.k === "x");
      log.a.splice(i, 1);
      refused("buying a relic into full slots without selling", submitSale(log));
    }
    {
      const log = cloneSale();
      const i = log.a.findIndex((a) => a.k === "s");
      log.a.splice(i, 0, { k: "x", r: "MOSSY_STONE" });
      refused("selling during a garden", submitSale(log));
    }
  }
  const legendaryRun = botLogs.find((b) => replayRun(b.log).ok && b.log.a.length > 0);
  if (legendaryRun) {
    const log: RunActionLog = JSON.parse(JSON.stringify(legendaryRun.log));
    const i = log.a.findIndex((a) => a.k === "l");
    log.a.splice(i, 0, { k: "x", r: "RAINBOW_HEART" });
    refused("selling a relic you don't own / a Legendary", submit(log, legendaryRun.score));
  }
  refused("selling an unknown relic", submit({ ...clone(), a: [{ k: "x", r: "NOT_A_RELIC" }] }));
}
refused("practice garden seed", submit({ ...clone(), seed: PRACTICE_GARDEN_SEED }));
refused("missing log", submit(undefined));
refused("malformed action", submit({ ...clone(), a: [{ k: "s", p: [99] }] }));

console.log(failures ? `\n${failures} check(s) failed` : "\nAll replay checks passed");
process.exit(failures ? 1 : 0);
