// Replay checks for the Run leaderboard: recorded Runs must replay to the
// exact score the game showed, and tampered logs must be refused.
// Run with: npm run check:replay
import { readdirSync, readFileSync } from "fs";
import path from "path";
import {
  calculateFloorScoreBreakdown,
  bakeBossTile,
  openSpikeWalls,
  runBedWeather,
  generateRunSeedBag,
  NO_RUN_UPGRADES,
  previewSeasonBoss,
  countCommonRelics,
  findEntityCoord,
  generateShopOffers,
  getRunGardenTarget,
  findSurvivableHintPath,
  getRelicSellValue,
  MAX_COMMON_RELICS,
  RELIC_REGISTRY,
  searchBestFloorLine,
  simulatePath,
} from "@/lib/engine";
import {
  applyGardenerGift,
  createNextRunGarden,
  applyGardenTool,
  applyRunShopPrune,
  createRunReplayer,
  dryDewAfterStroke,
  RUN_BAG_MIN_SIZE,
  RUN_PRUNE_COST,
  packCoords,
  parseRunLog,
  replayRun,
  RUN_LOG_VERSION,
  RUN_MODIFIER,
  runFertilizerCost,
  runToolExtraCost,
  runEditionTileCost,
  getSkipTag,
  addTagRelicOffer,
  RUN_SKIP_TARGET_MULT,
  finishShopOffers,
  upgradeInterestBonus,
  runModifierFor,
  scoreRunStroke,
  RunActionLog,
  RunLogAction,
} from "@/lib/runReplay";
import { verifyRunSubmission } from "@/lib/server/runLeaderboard";
import { completedRelicSets, RELIC_SET_X } from "@/lib/relicTags";
import { setChaserShopMove } from "./botSets";
import { PRACTICE_GARDEN_SEED } from "@/lib/runLessons";
import type { GridCell, HeroClassId } from "@/types/game";

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
 * With `chaseSets` it first buys a relic that shares a tag with its own.
 * Returns its log and the score it expects from the searched lines' scores.
 */
function playBotRun(seed: string, hero: HeroClassId, maxGardens: number, asc = 0, chaseSets = false, v = RUN_LOG_VERSION, fertFirst = false) {
  const run = createRunReplayer(seed, hero, v, asc);
  const log: RunActionLog = asc ? { v, seed, hero, asc, a: [] } : { v, seed, hero, a: [] };
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
      if (!chaseSets && s.shop.rerolls === 0 && s.shop.stats.gold >= 20) act({ k: "r" });
      // Prune a Spike (or the weakest Thorn) when Seeds are plentiful
      if (!run.state.shop.pruned && run.state.shop.stats.gold >= 6 && run.state.bag.length > RUN_BAG_MIN_SIZE) {
        const bag = run.state.bag;
        let i = bag.findIndex((t) => t.type === "TRAP");
        if (i < 0) i = bag.findIndex((t) => t.type === "ENEMY");
        if (i >= 0) act({ k: "p", i });
      }
      if (fertFirst) {
        const fert = run.state.shop.offers.find(
          (o) => o.kind === "FERT" && !run.state.shop.soldIds.includes(o.id) && run.state.shop.stats.gold >= o.cost
        );
        if (fert) {
          act({ k: "b", o: fert.id });
          continue;
        }
      }
      if (chaseSets) {
        const move = setChaserShopMove(run.state);
        if (move) {
          for (const a of move) act(a);
          continue;
        }
      }
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
    if (s.garden.gift) {
      act({ k: "g", i: 0 });
      continue;
    }
    const best = searchBestFloorLine(s.grid, s.startHero, RUN_MODIFIER, s.classId, s.relics, 20000, {
      counters: s.counters,
      strokesLeft: s.garden.strokesLeft,
      relicSets: true,
      bossRuleId: s.garden.bossRuleId,
      weather: s.garden.weather,
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
    const line = findSurvivableHintPath(s.grid, s.startHero, runModifierFor(2), s.classId, s.relics, false);
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
    // Pinned to v15: the cheapest-first bot fills its relic slots there (v16 Shops tempt it elsewhere)
    const extra = playBotRun(`run-1700000000100-${i}`, "KNIGHT", 14, 0, false, 15);
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

// 5. Ascension: the level is part of the log and changes the rules
{
  const a6 = playBotRun("run-1700000000009-asc", "KNIGHT", 4, 6);
  const replay = replayRun(JSON.parse(JSON.stringify(a6.log)));
  check(
    `Ascension 6 bot Run replays (${a6.state.gardensBloomed} gardens)`,
    replay.ok && replay.score === a6.state.score,
    replay.ok ? `${replay.score} vs ${a6.state.score}` : replay.error
  );
  const asA0 = replayRun({ ...JSON.parse(JSON.stringify(a6.log)), asc: 0 });
  check(
    "refused or different: the same actions at Ascension 0",
    !asA0.ok || asA0.score !== a6.state.score,
    asA0.ok ? `${asA0.score}` : asA0.error
  );
  check("refused: Ascension on an old rules version", !parseRunLog({ v: 7, seed: "x", hero: "KNIGHT", asc: 2, a: [] }));
  check("refused: Ascension above the top level", !parseRunLog({ v: RUN_LOG_VERSION, seed: "x", hero: "KNIGHT", asc: 9, a: [] }));
}

// 6. Pruning Shears (rules v9+): once per Shop, never below the bag minimum
{
  const bot = playBotRun("run-1700000000010-prune", "KNIGHT", 6);
  const prunes = bot.log.a.filter((a) => a.k === "p").length;
  const replay = replayRun(JSON.parse(JSON.stringify(bot.log)));
  check(
    `bot Run with ${prunes} prune(s) replays (${bot.state.gardensBloomed} gardens, bag ${bot.state.bag.length})`,
    prunes > 0 && replay.ok && replay.score === bot.state.score,
    replay.ok ? `${replay.score} vs ${bot.state.score}` : replay.error
  );
  const firstPrune = bot.log.a.findIndex((a) => a.k === "p");
  if (firstPrune >= 0) {
    const twice: RunActionLog = JSON.parse(JSON.stringify(bot.log));
    twice.a.splice(firstPrune + 1, 0, { k: "p", i: 0 });
    const r = replayRun(twice);
    check("refused: a second prune in the same Shop", !r.ok, r.ok ? "accepted" : r.error);
    const old: RunActionLog = { ...JSON.parse(JSON.stringify(bot.log)), v: 8 };
    check("refused: pruning on rules v8", !replayRun(old).ok);
  }
  const midGarden = replayRun({ v: RUN_LOG_VERSION, seed: "x-prune", hero: "KNIGHT", a: [{ k: "p", i: 0 }] });
  check("refused: pruning outside the Shop", !midGarden.ok);
  check("refused: malformed prune index", !parseRunLog({ v: RUN_LOG_VERSION, seed: "x", hero: "KNIGHT", a: [{ k: "p", i: -1 }] }));
  const minBag = Array.from({ length: RUN_BAG_MIN_SIZE }, () => ({ type: "ENEMY" as const, value: 3 }));
  const stats = { hp: 10, maxHp: 10, shield: 0, weapon: 0, gold: 50 };
  check("refused: pruning a bag already at the minimum", applyRunShopPrune({ stats, bag: minBag, index: 0, prunedThisShop: false }) === null);
  const ok = applyRunShopPrune({ stats, bag: [...minBag, { type: "TRAP", value: 2 }], index: RUN_BAG_MIN_SIZE, prunedThisShop: false });
  check("prune removes that tile and costs its price", !!ok && ok.bag.length === RUN_BAG_MIN_SIZE && ok.stats.gold === 50 - RUN_PRUNE_COST && ok.tile.type === "TRAP");
}

// 7. Relic sets (rules v10+): 3 relics with one theme tag score every line ×1.25
{
  check(
    "sets: 3 Thorns relics make a Thorns set, Any-build relics never do",
    completedRelicSets(["BRIAR_PRESS", "BRAMBLE_HEART", "MOSSY_STONE"]).length === 0 &&
      completedRelicSets(["BRIAR_PRESS", "BRAMBLE_HEART", "COMPOST_HEAP"]).join() === "THORNS" &&
      completedRelicSets(["MOSSY_STONE", "LADYBUG", "DAWN_CHORUS"]).length === 0
  );
  check(
    "sets: Compost Heap counts for two sets",
    completedRelicSets(["BRIAR_PRESS", "BRAMBLE_HEART", "COMPOST_HEAP", "OAK_SAPLING", "ELDER_TREE"]).sort().join() ===
      "GROWING,THORNS"
  );
  // One real line, scored with and without the set rule
  const run = createRunReplayer("run-sets-check", "KNIGHT", RUN_LOG_VERSION);
  const s = run.state;
  const relics = ["BRIAR_PRESS", "BRAMBLE_HEART", "COMPOST_HEAP"] as const;
  const best = searchBestFloorLine(s.grid, s.startHero, RUN_MODIFIER, s.classId, [...relics], 20000, {});
  if (best) {
    const off = scoreRunStroke(best.sim, s.startHero, best.path, [...relics], {}, 4, false).breakdown;
    const on = scoreRunStroke(best.sim, s.startHero, best.path, [...relics], {}, 4, true).breakdown;
    check(
      `sets: a Thorns set scores the line ×${RELIC_SET_X} (${off.total} → ${on.total})`,
      off.total > 0 && Math.abs(on.xMult / off.xMult - RELIC_SET_X) < 1e-9 && on.xMultSources.some((x) => x.label.includes("Thorns set"))
    );
  } else check("sets: found a line to score", false);
  // A bot that chases sets: its v10 log replays, and the same moves as v9 score less
  let found = false;
  for (let i = 0; i < 12 && !found; i++) {
    const bot = playBotRun(`run-sets-${i}`, "KNIGHT", 9, 0, true, 10);
    if (completedRelicSets(bot.state.relics).length === 0) continue;
    found = true;
    const v10 = replayRun(JSON.parse(JSON.stringify(bot.log)));
    check(
      `set-chasing bot Run replays (${completedRelicSets(bot.state.relics).join(", ")} set, ${bot.state.gardensBloomed} gardens)`,
      v10.ok && v10.score === bot.state.score && v10.score === bot.expected,
      v10.ok ? `${v10.score} vs ${bot.state.score}, expected ${bot.expected}` : v10.error
    );
    const v9 = replayRun({ ...JSON.parse(JSON.stringify(bot.log)), v: 9 });
    check(
      "the same moves under rules v9 get no set bonus",
      v9.ok && v10.ok && v9.score < v10.score,
      v9.ok && v10.ok ? `${v9.score} < ${v10.score}` : v9.ok ? "" : v9.error
    );
  }
  check("a set-chasing bot completes a set", found);
}

// 8. Gentle first Season (rules v11+): Season 1 targets 800 / 1,500 / 2,500; later Seasons unchanged
{
  const v11 = createRunReplayer("run-gentle-check", "KNIGHT", 11);
  const v10 = createRunReplayer("run-gentle-check", "KNIGHT", 10);
  check(
    `v11 first bed target is 800 (v10: ${v10.state.garden.target})`,
    v11.state.garden.target === 800 && v10.state.garden.target === 1500
  );
  check(
    "Season 2 targets don't change",
    getRunGardenTarget(2, "SMALL", true) === getRunGardenTarget(2, "SMALL", false) &&
      getRunGardenTarget(2, "BOSS", true) === getRunGardenTarget(2, "BOSS", false)
  );
  const asc6 = createRunReplayer("run-gentle-check", "KNIGHT", 11, 6);
  check(`Ascension still raises the gentle targets (A6 first bed ${asc6.state.garden.target})`, asc6.state.garden.target > 800);
  const bot = playBotRun("run-1700000000020-gentle", "ROGUE", 6, 0, false, 11);
  const replay = replayRun(JSON.parse(JSON.stringify(bot.log)));
  check(
    `v11 bot Run replays (${bot.state.gardensBloomed} gardens)`,
    replay.ok && replay.score === bot.state.score && replay.score === bot.expected,
    replay.ok ? `${replay.score} vs ${bot.state.score}` : replay.error
  );
}

// 9. Fertilizer (rules v12+): a 4th Shop offer that levels a tile type for the Run
{
  const offersV11 = generateShopOffers("fert-check", 1, 0, [], runFertilizerCost(11));
  const offersV12 = generateShopOffers("fert-check", 1, 0, [], runFertilizerCost(12));
  check(
    "v11 Shop has no Fertilizer; v12 adds one as a 4th offer",
    !offersV11.some((o) => o.kind === "FERT") &&
      offersV12.filter((o) => o.kind === "FERT").length === 1 &&
      offersV12.length === offersV11.length + 1
  );
  const sameThree = offersV11.every((o) => offersV12.some((p) => p.id === o.id && p.cost === o.cost));
  check("v12 keeps the same three usual offers", sameThree);
  check(
    `Fertilizer costs ${runFertilizerCost(12)}, and ${runFertilizerCost(12, 2)} from Ascension 2`,
    runFertilizerCost(12) === 6 && runFertilizerCost(12, 1) === 6 && runFertilizerCost(12, 2) === 8 && runFertilizerCost(12, 6) === 8
  );
  const bot = playBotRun("run-1700000000030-fert", "KNIGHT", 6, 0, false, 12, true);
  const levels = Object.entries(bot.state.counters).filter(([k]) => k.startsWith("FERT_"));
  const replay = replayRun(JSON.parse(JSON.stringify(bot.log)));
  check(
    `v12 bot buying Fertilizer replays (${levels.map(([k, n]) => `${k.slice(5)} ${n}`).join(", ") || "none"})`,
    levels.length > 0 && replay.ok && replay.score === bot.state.score && replay.score === bot.expected,
    replay.ok ? `${replay.score} vs ${bot.state.score} vs ${bot.expected}` : replay.error
  );
  // Fertilized tiles add Value: same line, with and without a Thorn level
  const run = createRunReplayer("run-1700000000030-fert", "KNIGHT", 12);
  const best = searchBestFloorLine(run.state.grid, run.state.startHero, RUN_MODIFIER, "KNIGHT", [], 20000, {});
  if (best) {
    const plain = calculateFloorScoreBreakdown(best.sim, run.state.startHero, best.path.length, [], {});
    const fed = calculateFloorScoreBreakdown(best.sim, run.state.startHero, best.path.length, [], {
      counters: { FERT_ENEMY: 2 },
    });
    const thorns = best.sim.steps.filter((st, i) => i > 0 && !st.isShadowStepCross && st.cell.type === "ENEMY").length;
    check(
      `Thorns Lv 3 add +6 Value per Thorn (${thorns} on the line: ${plain.chips} → ${fed.chips})`,
      fed.chips - plain.chips === thorns * 6
    );
  }
}

// 10. Garden tools (rules v13+): a tool upgrade stays on the tile in the bag
{
  check(
    "tools: none before v13, +2 Seeds from Ascension 2",
    runToolExtraCost(12) === null && runToolExtraCost(13) === 0 && runToolExtraCost(13, 2) === 2
  );
  const v13 = generateShopOffers("tool-check", 1, 0, [], runFertilizerCost(13), runToolExtraCost(13));
  check("v13 Shop adds one garden tool", v13.filter((o) => o.kind === "TOOL").length === 1);

  // A bot that buys tools and puts them on its best line, recorded and replayed
  const run = createRunReplayer("run-1700000000040-tools", "KNIGHT", 13);
  const log: RunActionLog = { v: 13, seed: "run-1700000000040-tools", hero: "KNIGHT", a: [] };
  const act = (a: RunLogAction) => {
    const err = run.apply(a);
    if (err) throw new Error(`tool bot made an illegal move: ${err}`);
    log.a.push(a);
  };
  let used = 0;
  for (let guard = 0; guard < 400 && run.state.phase !== "OVER" && run.state.gardensBloomed < 6; guard++) {
    const s = run.state;
    if (s.phase === "SHOP") {
      const tool = s.shop.offers.find((o) => o.kind === "TOOL" && !s.shop.soldIds.includes(o.id));
      if (tool && s.tools.length < 2 && s.shop.stats.gold >= tool.cost) {
        act({ k: "b", o: tool.id });
        continue;
      }
      act({ k: "l", h: s.classId });
      continue;
    }
    const best = searchBestFloorLine(s.grid, s.startHero, RUN_MODIFIER, s.classId, s.relics, 20000, {
      counters: s.counters,
      strokesLeft: s.garden.strokesLeft,
      relicSets: true,
    });
    if (!best) break;
    if (s.tools.length > 0) {
      const spot = best.path.map((c) => s.grid[c.row][c.col]).find(
        (cell) => cell.type !== "HERO" && cell.type !== "EXIT" && !cell.bagTile?.enh
      );
      if (spot) {
        act({ k: "u", i: 0, c: spot.row * 5 + spot.col });
        used++;
        continue;
      }
    }
    act({ k: "s", p: packCoords(best.path) });
  }
  const upgradedInBag = run.state.bag.filter((t) => t.enh).length;
  const replay = replayRun(JSON.parse(JSON.stringify(log)));
  check(
    `v13 tool Run replays (${used} tools used, ${upgradedInBag} upgraded tiles in the bag)`,
    used > 0 && upgradedInBag > 0 && replay.ok && replay.score === run.state.score,
    replay.ok ? `${replay.score} vs ${run.state.score}` : replay.error
  );
  const v12log = { ...log, v: 12 };
  check("a tool use is refused under rules v12", !replayRun(JSON.parse(JSON.stringify(v12log))).ok);

  // The upgrade sits on the bag tile; Dew dries after 3 lines
  const fresh = createRunReplayer("run-1700000000040-tools", "KNIGHT", 13);
  const spot = fresh.state.grid.flat().find((c) => c.type === "ENEMY")!;
  const sunny = applyGardenTool({ grid: fresh.state.grid, bag: fresh.state.bag, coord: spot, tool: "SUNLIT" })!;
  check(
    "Sunlit goes onto the tile's bag entry",
    sunny.bag.filter((t) => t.enh === "SUNLIT").length === 1 && sunny.grid[spot.row][spot.col].bagTile?.enh === "SUNLIT"
  );
  check("a tile can't take a second tool", applyGardenTool({ grid: sunny.grid, bag: sunny.bag, coord: spot, tool: "DEW" }) === null);
  let dew = applyGardenTool({ grid: fresh.state.grid, bag: fresh.state.bag, coord: spot, tool: "DEW" })!;
  const counts: number[] = [];
  for (let i = 0; i < 3; i++) {
    dew = dryDewAfterStroke(dew.grid, dew.bag, [spot]);
    counts.push(dew.grid[spot.row][spot.col].bagTile?.dew ?? 0);
  }
  check(
    `Dew dries after 3 lines (${counts.join(" → ")})`,
    counts.join(",") === "2,1,0" && !dew.bag.some((t) => t.enh) && !dew.grid[spot.row][spot.col].bagTile?.enh
  );
}

// 11. Special tiles (rules v14+): one shimmering tile in a new bag, more for sale, scoring on any line
{
  const v13 = createRunReplayer("edition-check", "KNIGHT", 13);
  const v14 = createRunReplayer("edition-check", "KNIGHT", 14);
  check(
    `v14 bag starts with 1 special tile (v13: ${v13.state.bag.filter((t) => t.ed).length})`,
    v14.state.bag.filter((t) => t.ed).length === 1 && !v13.state.bag.some((t) => t.ed) && v14.state.bag.length === v13.state.bag.length
  );
  check(
    "special tile price: none before v14, 8 Seeds, 10 from Ascension 2",
    runEditionTileCost(13) === null && runEditionTileCost(14) === 8 && runEditionTileCost(14, 2) === 10
  );
  // Find a Shop that sells one, then a bot buys it and the Run replays
  let shopFloor = 0;
  for (let f = 1; f < 40 && !shopFloor; f++) {
    if (generateShopOffers("edition-check", f, 0, [], runFertilizerCost(14), runToolExtraCost(14), runEditionTileCost(14)).some((o) => o.kind === "TILE")) shopFloor = f;
  }
  check(`some Shops sell a special tile (first at bed ${shopFloor})`, shopFloor > 0);
  const run = createRunReplayer("run-1700000000050-ed", "KNIGHT", 14);
  const log: RunActionLog = { v: 14, seed: "run-1700000000050-ed", hero: "KNIGHT", a: [] };
  const act = (a: RunLogAction) => {
    const err = run.apply(a);
    if (err) throw new Error(`edition bot made an illegal move: ${err}`);
    log.a.push(a);
  };
  let bought = 0;
  for (let guard = 0; guard < 400 && run.state.phase !== "OVER" && run.state.gardensBloomed < 7; guard++) {
    const s = run.state;
    if (s.phase === "SHOP") {
      const tile = s.shop.offers.find((o) => o.kind === "TILE" && !s.shop.soldIds.includes(o.id));
      if (tile && s.shop.stats.gold >= tile.cost) {
        act({ k: "b", o: tile.id });
        bought++;
        continue;
      }
      act({ k: "l", h: s.classId });
      continue;
    }
    const best = searchBestFloorLine(s.grid, s.startHero, RUN_MODIFIER, s.classId, s.relics, 20000, {
      counters: s.counters,
      strokesLeft: s.garden.strokesLeft,
      relicSets: true,
    });
    if (!best) break;
    act({ k: "s", p: packCoords(best.path) });
  }
  const replay = replayRun(JSON.parse(JSON.stringify(log)));
  check(
    `v14 Run with special tiles replays (${bought} bought, bag ${run.state.bag.length})`,
    replay.ok && replay.score === run.state.score && run.state.bag.filter((t) => t.ed).length === 1 + bought,
    replay.ok ? `${replay.score} vs ${run.state.score}` : replay.error
  );
  // A Golden tile adds +30 Value to a line through it
  const g = createRunReplayer("edition-check", "KNIGHT", 14);
  const best = searchBestFloorLine(g.state.grid, g.state.startHero, RUN_MODIFIER, "KNIGHT", [], 20000, {});
  if (best) {
    const base = calculateFloorScoreBreakdown(best.sim, g.state.startHero, best.path.length, [], {});
    const cell = best.path.map((c) => g.state.grid[c.row][c.col]).find((c) => c.type !== "HERO" && c.type !== "EXIT" && !c.bagTile?.ed)!;
    const gold = { ...cell, bagTile: { ...cell.bagTile!, ed: "GOLDEN" as const } };
    const sim = { ...best.sim, steps: best.sim.steps.map((st) => (st.cell.id === cell.id ? { ...st, cell: gold } : st)) };
    const golden = calculateFloorScoreBreakdown(sim, g.state.startHero, best.path.length, [], {});
    check(`a Golden tile adds +30 Value (${base.chips} → ${golden.chips})`, golden.chips - base.chips === 30);
  }
}

// 12. Echo (rules v15+): a tool that makes a tile score twice, on its own layer
{
  const before = generateShopOffers("echo-check", 1, 0, [], runFertilizerCost(14), runToolExtraCost(14), runEditionTileCost(14), false);
  const after = generateShopOffers("echo-check", 1, 0, [], runFertilizerCost(15), runToolExtraCost(15), runEditionTileCost(15), true);
  check("v15 keeps the v14 relic offers", before.filter((o) => o.kind === "RELIC").every((o) => after.some((p) => p.id === o.id)));
  let echoShop = 0;
  for (let f = 1; f < 60 && !echoShop; f++) {
    if (generateShopOffers("echo-check", f, 0, [], 6, 0, 8, true).some((o) => o.tool === "ECHO")) echoShop = f;
  }
  check(`Echo shows up as a tool in v15 Shops (first at bed ${echoShop})`, echoShop > 0);

  const r = createRunReplayer("echo-check", "KNIGHT", 15);
  const best = searchBestFloorLine(r.state.grid, r.state.startHero, RUN_MODIFIER, "KNIGHT", [], 20000, {});
  if (best) {
    const cell = best.path.map((c) => r.state.grid[c.row][c.col]).find((c) => c.type === "ENEMY" || c.type === "GOLD")!;
    const coord = { row: cell.row, col: cell.col };
    const sun = applyGardenTool({ grid: r.state.grid, bag: r.state.bag, coord, tool: "RICH_SOIL" })!;
    const both = applyGardenTool({ grid: sun.grid, bag: sun.bag, coord, tool: "ECHO" });
    check("Echo can join a tile that already has a tool", Boolean(both) && both!.grid[coord.row][coord.col].bagTile?.echo === true);
    check("a tile takes only one Echo", applyGardenTool({ grid: both!.grid, bag: both!.bag, coord, tool: "ECHO" }) === null);
    const sim = (grid: typeof r.state.grid) =>
      ({ ...best.sim, steps: best.sim.steps.map((st) => (st.cell.id === cell.id ? { ...st, cell: grid[coord.row][coord.col] } : st)) });
    const plain = calculateFloorScoreBreakdown(sim(sun.grid), r.state.startHero, best.path.length, [], {});
    const echoed = calculateFloorScoreBreakdown(sim(both!.grid), r.state.startHero, best.path.length, [], {});
    check(
      `Echo counts the tile's number and its Rich Soil again (+${cell.value} +20: ${plain.chips} → ${echoed.chips})`,
      echoed.chips - plain.chips === cell.value + 20
    );
  }
  const v14log = { v: 14, seed: "echo-check", hero: "KNIGHT" as const, a: [] as RunLogAction[] };
  check("v14 logs still replay under the v15 code", replayRun(JSON.parse(JSON.stringify(v14log))).ok);
}

// 13. Rules v16 relics: only in v16 Shops; each one's effect
{
  const NEW = ["FIRST_BLOOM", "THORN_CHORUS", "BELL_TOWER", "ACORN_GATE", "LONG_SHADOW", "BRAMBLE_BERRIES", "SOFT_MOSS", "SUNBEAM_LENS"];
  let inOld = 0;
  let inNew = 0;
  for (let f = 1; f <= 60; f++) {
    for (const v of [15, 16]) {
      const offers = generateShopOffers(`relics16-${f}`, 1, 0, [], 6, 0, 8, true, v >= 16);
      const n = offers.filter((o) => o.relicId && NEW.includes(o.relicId)).length;
      if (v === 15) inOld += n;
      else inNew += n;
    }
  }
  check(`new relics only in v16 Shops (v15: ${inOld}, v16: ${inNew} in 60 Shops)`, inOld === 0 && inNew > 0);
}

{
  // Rules v20: the exact and careful relics only ever show up in v20 Shops
  const NEW = ["SEVEN_STONES", "SHORT_CUT", "STRAIGHT_FURROW", "LIGHT_STEP", "THORNLESS_PATH", "EVEN_ROWS"];
  let inOld = 0;
  let inNew = 0;
  for (let f = 1; f <= 80; f++) {
    for (const v of [19, 20]) {
      const offers = generateShopOffers(`relics20-${f}`, 1, 0, [], 6, 0, 8, true, true, v >= 20);
      const n = offers.filter((o) => o.relicId && NEW.includes(o.relicId)).length;
      if (v === 19) inOld += n;
      else inNew += n;
    }
  }
  check(`v20 relics only in v20 Shops (v19: ${inOld}, v20: ${inNew} in 80 Shops)`, inOld === 0 && inNew > 0);

  const r = createRunReplayer("relics16-effects", "KNIGHT", 16);
  const best = searchBestFloorLine(r.state.grid, r.state.startHero, RUN_MODIFIER, "KNIGHT", [], 20000, {});
  if (best) {
    const start = r.state.startHero;
    const len = best.path.length;
    const base = calculateFloorScoreBreakdown(best.sim, start, len, [], {});
    const withRelic = (id: string) => calculateFloorScoreBreakdown(best.sim, start, len, [id as never], {});
    const visited = best.sim.steps.filter((st, i) => i > 0 && !st.isShadowStepCross);
    const num = (st: (typeof visited)[number]) =>
      ["ENEMY", "SHIELD", "WEAPON", "POTION", "TRAP", "GOLD"].includes(st.cell.type) ? Math.max(0, st.cell.value) : 0;
    check("First Bloom: the first tile counts twice", withRelic("FIRST_BLOOM").chips - base.chips === num(visited[0]));
    const thorns = visited.filter((st) => st.cell.type === "ENEMY").reduce((n, st) => n + num(st), 0);
    check(`Thorn Chorus: every Thorn counts twice (+${thorns})`, withRelic("THORN_CHORUS").chips - base.chips === thorns);
    const fifth = visited.filter((_, i) => (i + 1) % 5 === 0).reduce((n, st) => n + num(st), 0);
    check(`Long Shadow: every 5th tile counts twice (+${fifth})`, withRelic("LONG_SHADOW").chips - base.chips === fifth);
    check("Acorn Gate: the Exit adds +8 Value", withRelic("ACORN_GATE").chips - base.chips === 8);
    const bee = calculateFloorScoreBreakdown(best.sim, start, len, ["GOLDEN_BEE"], {});
    const beeGate = calculateFloorScoreBreakdown(best.sim, start, len, ["GOLDEN_BEE", "ACORN_GATE"], {});
    check("Acorn Gate: the Exit counts as an Acorn for Golden Bee (+1 Length)", beeGate.mult - bee.mult === 1);
  }
  // Soft Moss: a straight step onto a Spike costs no Life
  {
    const grid = createRunReplayer("relics16-effects", "KNIGHT", 16).state.grid.map((row) => row.map((c) => ({ ...c })));
    const hero = grid.flat().find((c) => c.type === "HERO")!;
    grid[hero.row - 1][hero.col] = { ...grid[hero.row - 1][hero.col], type: "TRAP", value: 3 };
    const path = [{ row: hero.row, col: hero.col }, { row: hero.row - 1, col: hero.col }];
    const heroStats = { hp: 10, maxHp: 10, shield: 0, weapon: 0, gold: 0 };
    const hurt = simulatePath(grid, path, heroStats, RUN_MODIFIER, "KNIGHT", []);
    const soft = simulatePath(grid, path, heroStats, RUN_MODIFIER, "KNIGHT", ["SOFT_MOSS"]);
    check(
      `Soft Moss: a straight step onto a Spike costs no Life (${hurt.finalStats.hp} → ${soft.finalStats.hp})`,
      hurt.finalStats.hp < 10 && soft.finalStats.hp === 10
    );
  }
}

// 14. Skipping a Small bed (rules v17+)
{
  const seed = "skip-check";
  const run = createRunReplayer(seed, "KNIGHT", 17);
  const before = run.state.garden;
  const tag = getSkipTag(seed, before.gardenIndex);
  const bigNormally = createRunReplayer(seed, "KNIGHT", 16);
  check("skipping is refused under rules v16", bigNormally.apply({ k: "k" }) !== null);
  check("a Small bed can be skipped before its first line", run.apply({ k: "k" }) === null);
  const big = run.state.garden;
  check(
    `the next bed is the Big bed, ${RUN_SKIP_TARGET_MULT}× harder (${big.target})`,
    big.gardenIndex === before.gardenIndex + 1 && big.kind === "BIG" && big.target > 1500
  );
  check(`the ${tag} Tag was taken`, run.state.tags.length === 1 && run.state.tags[0] === tag);
  check("a Big bed can't be skipped", run.apply({ k: "k" }) !== null);
  // After a line, the Small bed can't be skipped
  const r2 = createRunReplayer("skip-check-2", "KNIGHT", 17);
  const best = searchBestFloorLine(r2.state.grid, r2.state.startHero, RUN_MODIFIER, "KNIGHT", [], 4000, {});
  if (best && best.score < r2.state.garden.target) {
    r2.apply({ k: "s", p: packCoords(best.path) });
    check("a bed can't be skipped after its first line", r2.apply({ k: "k" }) !== null);
  }
  // A Run with skips replays to the same score, and a Relic Tag adds a free relic to the next Shop
  let relicSeed = "";
  for (let i = 0; i < 40 && !relicSeed; i++) if (getSkipTag(`skip-relic-${i}`, 0) === "RELIC") relicSeed = `skip-relic-${i}`;
  const rr = createRunReplayer(relicSeed, "KNIGHT", 17);
  const log: RunActionLog = { v: 17, seed: relicSeed, hero: "KNIGHT", a: [{ k: "k" }] };
  rr.apply({ k: "k" });
  for (let g = 0; g < 30 && rr.state.phase === "PLAY"; g++) {
    const s = rr.state;
    const b = searchBestFloorLine(s.grid, s.startHero, RUN_MODIFIER, s.classId, s.relics, 20000, {
      counters: s.counters,
      strokesLeft: s.garden.strokesLeft,
      relicSets: true,
    });
    if (!b) break;
    const a: RunLogAction = { k: "s", p: packCoords(b.path) };
    if (rr.apply(a)) break;
    log.a.push(a);
  }
  const gifted = addTagRelicOffer([], relicSeed, 1, []);
  check(
    `Relic Tag: the next Shop gets a free Rare relic (${gifted[0]?.relicId ?? "none"})`,
    gifted.length === 1 && gifted[0].cost === 0 && RELIC_REGISTRY[gifted[0].relicId!].rarity === "RARE"
  );
  const shopGift = rr.state.phase === "SHOP" ? rr.state.shop.offers.find((o) => o.id.endsWith("-tag-relic")) : undefined;
  check(
    "after a Relic Tag, the free relic waits until the next bloom",
    rr.state.phase === "SHOP" ? Boolean(shopGift) && !rr.state.freeRelicNext : rr.state.freeRelicNext || rr.state.phase === "OVER"
  );
  const replay = replayRun(JSON.parse(JSON.stringify(log)));
  check("a Run with a skip replays", replay.ok && replay.score === rr.state.score, replay.ok ? `${replay.score} vs ${rr.state.score}` : replay.error);
}

// 15. Garden upgrades (rules v18+): one per Season, two tiers, for the whole Run
{
  const base = generateShopOffers("upgrade-check", 1, 0, [], 6, 0, 8, true, true);
  const first = finishShopOffers(base, { runSeed: "upgrade-check", gardenIndex: 0, owned: [], boughtThisSeason: false });
  const up = first.find((o) => o.kind === "UPGRADE");
  check(
    `a Shop offers this Season's upgrade (${up?.upgrade}), never a second tier first`,
    Boolean(up) && ["ROOT_CELLAR", "MARKET_DAY", "ALMANAC"].includes(up!.upgrade!)
  );
  check(
    "no upgrade once one was bought this Season",
    !finishShopOffers(base, { runSeed: "upgrade-check", gardenIndex: 1, owned: ["MARKET_DAY"], boughtThisSeason: true }).some(
      (o) => o.kind === "UPGRADE"
    )
  );
  const market = finishShopOffers(base, { runSeed: "upgrade-check", gardenIndex: 3, owned: ["MARKET_DAY"], boughtThisSeason: true });
  check(
    "Market Day: everything costs 25% less",
    base.every((o, i) => market[i].cost === (o.cost > 0 ? Math.max(1, Math.floor(o.cost * 0.75)) : 0))
  );
  check("Old Oak raises the interest cap by 15", upgradeInterestBonus(["ROOT_CELLAR", "OLD_OAK"]) === 15);

  // A bot that buys every upgrade it sees, recorded and replayed
  const run = createRunReplayer("up-ui-1", "KNIGHT", 18);
  const log: RunActionLog = { v: 18, seed: "up-ui-1", hero: "KNIGHT", a: [] };
  const act = (a: RunLogAction) => {
    const err = run.apply(a);
    if (err) throw new Error(`upgrade bot made an illegal move: ${err}`);
    log.a.push(a);
  };
  for (let guard = 0; guard < 400 && run.state.phase !== "OVER" && run.state.gardensBloomed < 7; guard++) {
    const s = run.state;
    if (s.phase === "SHOP") {
      const o = s.shop.offers.find((x) => x.kind === "UPGRADE" && !s.shop.soldIds.includes(x.id) && s.shop.stats.gold >= x.cost);
      if (o) {
        act({ k: "b", o: o.id });
        continue;
      }
      act({ k: "l", h: s.classId });
      continue;
    }
    const b = searchBestFloorLine(s.grid, s.startHero, RUN_MODIFIER, s.classId, s.relics, 20000, {
      counters: s.counters,
      strokesLeft: s.garden.strokesLeft,
      relicSets: true,
    });
    if (!b) break;
    act({ k: "s", p: packCoords(b.path) });
  }
  const replay = replayRun(JSON.parse(JSON.stringify(log)));
  check(
    `v18 Run buying upgrades replays (${run.state.gardenUpgrades.join(", ") || "none"})`,
    run.state.gardenUpgrades.length > 0 && replay.ok && replay.score === run.state.score,
    replay.ok ? `${replay.score} vs ${run.state.score}` : replay.error
  );
}

// 16. New Bosses (rules v19+): only in v19 Runs; Narrow Path, Long Road and Toll
{
  let oldHas = 0;
  let newHas = 0;
  for (let i = 0; i < 80; i++) {
    const NEW = ["NARROW_PATH", "LONG_ROAD", "FOG", "TOLL"];
    if (NEW.includes(previewSeasonBoss(`boss19-${i}`, 1, true, false))) oldHas++;
    if (NEW.includes(previewSeasonBoss(`boss19-${i}`, 1, true, true))) newHas++;
  }
  check(`new Bosses only in v19 Runs (v18: ${oldHas}, v19: ${newHas} of 80 Seasons)`, oldHas === 0 && newHas > 0);
  const r = createRunReplayer("boss19-effects", "KNIGHT", 19);
  const best = searchBestFloorLine(r.state.grid, r.state.startHero, RUN_MODIFIER, "KNIGHT", [], 20000, {});
  if (best) {
    const start = r.state.startHero;
    const len = best.path.length;
    const plain = calculateFloorScoreBreakdown(best.sim, start, len, [], {});
    const narrow = calculateFloorScoreBreakdown(best.sim, start, len, [], { bossRuleId: "NARROW_PATH" });
    const diag = best.sim.steps.filter(
      (st, i) => i > 0 && !st.isShadowStepCross && st.direction && Math.abs(st.direction.dr) === 1 && Math.abs(st.direction.dc) === 1
    ).length;
    check(`Narrow Path: diagonal steps add no Length (−${diag})`, plain.mult - narrow.mult === diag);
    const shortSim = best.path.length < 10;
    const road = calculateFloorScoreBreakdown(best.sim, start, len, [], { bossRuleId: "LONG_ROAD" });
    check(
      `Long Road: a ${len}-tile line ${shortSim ? "scores half" : "scores in full"}`,
      shortSim ? road.total === Math.round(plain.total * 0.5) || Math.abs(road.total - plain.total / 2) <= 1 : road.total === plain.total
    );
    const toll = scoreRunStroke(best.sim, { ...start, gold: 7 }, best.path, [], {}, 4, true, "TOLL");
    check(`The Toll: a line costs 2 Seeds (7 → ${toll.afterStroke.gold})`, toll.afterStroke.gold === 5);
  }
}

// 17. Rules v20 Bosses: Spike walls, dry Berries, the Toll per tile (v19 beds unchanged)
{
  const spike = { id: "t", row: 1, col: 1, type: "TRAP" as const, value: 3, bagTile: { type: "TRAP" as const, value: 3 } };
  check("v19 Spike King: Spikes hit 2× (3 → 6)", bakeBossTile(spike, "THISTLE_KING").value === 6);
  check("v20 Spike King: Spikes become walls", bakeBossTile(spike, "THISTLE_KING", true).type === "VOID");
  // A row of walls across the board must open again so the gate stays reachable
  const cell = (row: number, col: number, type: GridCell["type"], value = 1): GridCell => ({
    id: `c${row}${col}`, row, col, type, value, bagTile: type === "VOID" ? { type: "TRAP", value: 2 } : undefined,
  });
  const walled: GridCell[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) =>
      r === 4 && c === 2 ? cell(r, c, "HERO", 10) : r === 0 && c === 2 ? cell(r, c, "EXIT", 0) : r === 2 ? cell(r, c, "VOID", 2) : cell(r, c, "GOLD")
    )
  );
  const opened = openSpikeWalls(walled);
  const stillWalls = opened.flat().filter((x) => x.type === "VOID").length;
  check(`Spike walls never shut the gate off (5 walls → ${stillWalls})`, stillWalls === 4);
  // Dry Berries: they score but heal nothing
  const berryGrid = (dry: boolean): GridCell[][] =>
    Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 5 }, (__, c) =>
        r === 4 && c === 0
          ? cell(r, c, "HERO", 10)
          : r === 2 && c === 0
          ? cell(r, c, "EXIT", 0)
          : r === 3 && c === 0
          ? { ...cell(r, c, "POTION", 3), ...(dry ? { dry: true } : {}) }
          : cell(r, c, "GOLD")
      )
    );
  const hurt = { hp: 5, maxHp: 10, shield: 0, weapon: 0, gold: 0 };
  const berryPath = [{ row: 4, col: 0 }, { row: 3, col: 0 }, { row: 2, col: 0 }];
  const wet = simulatePath(berryGrid(false), berryPath, hurt, RUN_MODIFIER, "KNIGHT", []);
  const dried = simulatePath(berryGrid(true), berryPath, hurt, RUN_MODIFIER, "KNIGHT", []);
  check(`v20 Drought: dry Berries heal nothing (${wet.finalStats.hp} vs ${dried.finalStats.hp} Life)`, wet.finalStats.hp === 8 && dried.finalStats.hp === 5);
  const wetScore = calculateFloorScoreBreakdown(wet, hurt, 3, [], {}).total;
  const dryScore = calculateFloorScoreBreakdown(dried, hurt, 3, [], {}).total;
  check(`v20 Drought: dry Berries still score (${wetScore} vs ${dryScore})`, wetScore === dryScore && dryScore > 0);
  // The Toll per tile: free up to Length 10, then 1 Seed a tile
  const r20 = createRunReplayer("boss20-toll", "KNIGHT", 20);
  const best = searchBestFloorLine(r20.state.grid, r20.state.startHero, RUN_MODIFIER, "KNIGHT", [], 20000, {});
  if (best) {
    const start = { ...r20.state.startHero, gold: 30 };
    const toll20 = scoreRunStroke(best.sim, start, best.path, [], {}, 4, true, "TOLL", true);
    const want = 30 - Math.max(0, best.path.length - 10);
    check(`v20 Toll: a Length ${best.path.length} line costs ${30 - want} Seeds (30 → ${toll20.afterStroke.gold})`, toll20.afterStroke.gold === want);
    const toll19 = scoreRunStroke(best.sim, start, best.path, [], {}, 4, true, "TOLL", false);
    check(`v19 Toll still costs 2 Seeds a line (30 → ${toll19.afterStroke.gold})`, toll19.afterStroke.gold === 28);
  }
}

// 18. Garden weather (rules v20): only on v20 Small and Big beds from Season 2
{
  let small = 0;
  let boss = 0;
  let early = 0;
  for (let i = 0; i < 300; i++) {
    if (runBedWeather(`weather-${i}`, 3, 2, "SMALL")) small++;
    if (runBedWeather(`weather-${i}`, 5, 2, "BOSS")) boss++;
    if (runBedWeather(`weather-${i}`, 0, 1, "SMALL")) early++;
  }
  check(`weather on about 1 in 3 beds from Season 2 (${small} of 300), never on Boss beds or Season 1`, small > 70 && small < 130 && boss === 0 && early === 0);
  const cell = (row: number, col: number, type: GridCell["type"], value = 1, extra: Partial<GridCell> = {}): GridCell => ({
    id: `w${row}${col}`, row, col, type, value, ...extra,
  });
  const thornGrid = (harm: number): GridCell[][] =>
    Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 5 }, (__, c) =>
        r === 4 && c === 0
          ? cell(r, c, "HERO", 10)
          : r === 2 && c === 0
          ? cell(r, c, "EXIT", 0)
          : r === 3 && c === 0
          ? cell(r, c, "ENEMY", 3, harm ? { harm } : {})
          : cell(r, c, "GOLD")
      )
    );
  const hero = { hp: 10, maxHp: 10, shield: 0, weapon: 0, gold: 0 };
  const way = [{ row: 4, col: 0 }, { row: 3, col: 0 }, { row: 2, col: 0 }];
  const plain = simulatePath(thornGrid(0), way, hero, RUN_MODIFIER, "KNIGHT", []);
  const brambles = simulatePath(thornGrid(2), way, hero, RUN_MODIFIER, "KNIGHT", []);
  check(`Thick Brambles: a Thorn costs 2 more Life (${plain.finalStats.hp} vs ${brambles.finalStats.hp})`, plain.finalStats.hp - brambles.finalStats.hp === 2);
  const s0 = calculateFloorScoreBreakdown(plain, hero, 3, [], {}).total;
  const s1 = calculateFloorScoreBreakdown(brambles, hero, 3, [], {}).total;
  check(`Thick Brambles: Thorn points stay the same (${s0} vs ${s1})`, s0 === s1);
  const golden = calculateFloorScoreBreakdown(plain, hero, 3, [], { weather: "GOLDEN_HOUR" }).total;
  check(`Golden Hour: half Life or more at the gate scores ×2 (${s0} → ${golden})`, golden === s0 * 2);
  const low = { ...hero, hp: 6 };
  const lowSim = simulatePath(thornGrid(2), way, low, RUN_MODIFIER, "KNIGHT", []);
  const lowPlain = calculateFloorScoreBreakdown(lowSim, low, 3, [], {}).total;
  const lowGolden = calculateFloorScoreBreakdown(lowSim, low, 3, [], { weather: "GOLDEN_HOUR" }).total;
  check(`Golden Hour: under half Life scores normally (${lowSim.finalStats.hp} Life left)`, lowSim.finalStats.hp * 2 < 10 && lowGolden === lowPlain);
}

// 19. The middle game (rules v20): the Wandering Gardener, Rare Shops, late weather
{
  // The Gardener waits at the first bed of Seasons 4 and 6, only in v20 Runs
  const base = { stats: { hp: 10, maxHp: 10, shield: 0, weapon: 0, gold: 12 }, classId: "KNIGHT" as const, relics: [], upgrades: NO_RUN_UPGRADES, runSeed: "gardener-check", bag: generateRunSeedBag("gardener-check") };
  const at = (gardenIndex: number, v: number) => createNextRunGarden({ ...base, gardenIndex, logVersion: v }).state.gift;
  check(
    `the Gardener visits Seasons 4 and 6 in v20 only (bed 9: ${at(9, 20)?.join("/")}, bed 15: ${at(15, 20)?.length} gifts)`,
    at(9, 20)?.length === 3 && at(15, 20)?.length === 3 && !at(9, 19) && !at(10, 20) && !at(3, 20)
  );
  const hero = { hp: 8, maxHp: 10, shield: 0, weapon: 0, gold: 5 };
  const bag = generateRunSeedBag("gardener-check");
  const g = (gift: Parameters<typeof applyGardenerGift>[0]["gift"]) =>
    applyGardenerGift({ gift, runSeed: "gardener-check", gardenIndex: 9, relics: [], bag, hero });
  check("Gardener: Seeds gift adds 15", g("SEEDS").hero.gold === 20);
  check("Gardener: Stronger roots adds 2 max Life", g("MAX_LIFE").hero.maxHp === 12 && g("MAX_LIFE").hero.hp === 10);
  const golden = g("GOLDEN_TILES").bag.filter((t) => t.ed === "GOLDEN").length - bag.filter((t) => t.ed === "GOLDEN").length;
  check(`Gardener: Golden tiles turns 3 bag tiles Golden (+${golden})`, golden === 3);
  const rare = g("RARE_RELIC");
  check(`Gardener: a free Rare relic (${rare.relic})`, Boolean(rare.relic) && RELIC_REGISTRY[rare.relic!].rarity === "RARE");
  // Rare Shops from Season 4 (v20): every Shop with a relic has a Rare one; v19 Shops unchanged
  let withRare = 0;
  let same = 0;
  for (let f = 1; f <= 60; f++) {
    const on = generateShopOffers(`rare-${f}`, 10, 0, [], 6, 0, 8, true, true, true, true);
    const off = generateShopOffers(`rare-${f}`, 10, 0, [], 6, 0, 8, true, true, true, false);
    const relicsOn = on.filter((o) => o.relicId);
    if (relicsOn.length === 0 || relicsOn.some((o) => RELIC_REGISTRY[o.relicId!].rarity === "RARE")) withRare++;
    if (JSON.stringify(off.filter((o) => !o.relicId)) === JSON.stringify(on.filter((o) => !o.relicId))) same++;
  }
  check(`Rare Shops: every Shop offers a Rare relic (${withRare} of 60), the rest of the Shop is unchanged (${same} of 60)`, withRare === 60 && same === 60);
  // Late weather: Spring Rain and Firefly Night only from Season 4
  let late = 0;
  let early = 0;
  for (let i = 0; i < 300; i++) {
    const a = runBedWeather(`late-${i}`, 10, 4, "SMALL");
    const b = runBedWeather(`late-${i}`, 4, 2, "BIG");
    if (a === "SPRING_RAIN" || a === "FIREFLY_NIGHT") late++;
    if (b === "SPRING_RAIN" || b === "FIREFLY_NIGHT") early++;
  }
  check(`Spring Rain and Firefly Night only from Season 4 (${late} of 300 late beds, ${early} early)`, late > 0 && early === 0);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll replay checks passed");
process.exit(failures ? 1 : 0);
