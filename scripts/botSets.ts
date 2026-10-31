// Shared bot strategy for relic sets (rules v10+), used by check-run-replay
// and balance-run.
import { countCommonRelics, getRelicSellValue, MAX_COMMON_RELICS, RELIC_REGISTRY } from "@/lib/engine";
import { getRelicTags, sharedBuildTags } from "@/lib/relicTags";
import type { createRunReplayer, RunLogAction } from "@/lib/runReplay";
import type { RelicId } from "@/types/game";

/**
 * Set chaser's Shop move (or null to fall back to the plain bot): buy a relic
 * that grows its biggest theme, swapping out an off-theme relic when slots are
 * full; the first themed relic it sees starts a build; reroll once for a fit.
 */
export function setChaserShopMove(state: ReturnType<typeof createRunReplayer>["state"]): RunLogAction[] | null {
  const { shop, relics } = state;
  const gold = shop.stats.gold;
  const open = shop.offers.filter((o) => o.kind === "RELIC" && o.relicId && !shop.soldIds.includes(o.id));
  const themed = (id: RelicId) => getRelicTags(id).some((t) => t !== "ANY");
  const fitScore = (id: RelicId) =>
    Math.max(0, ...sharedBuildTags(id, relics).map((t) => relics.filter((r) => getRelicTags(r).includes(t)).length));
  const full = countCommonRelics(relics) >= MAX_COMMON_RELICS;
  const offFit = relics
    .filter((r) => RELIC_REGISTRY[r].rarity !== "LEGENDARY" && sharedBuildTags(r, relics).length === 0)
    .map((r) => ({ r, sell: getRelicSellValue(r) ?? 0 }))
    .sort((a, b) => b.sell - a.sell)[0];
  const best = open
    .filter((o) => fitScore(o.relicId!) > 0)
    .sort((a, b) => fitScore(b.relicId!) - fitScore(a.relicId!) || a.cost - b.cost)[0];
  if (best) {
    if (!full && best.cost <= gold) return [{ k: "b", o: best.id }];
    if (full && offFit && best.cost <= gold + offFit.sell) return [{ k: "x", r: offFit.r }, { k: "b", o: best.id }];
  }
  const starter = open.filter((o) => themed(o.relicId!) && o.cost <= gold).sort((a, b) => a.cost - b.cost)[0];
  if (!full && starter && relics.filter(themed).length === 0) return [{ k: "b", o: starter.id }];
  if (!best && shop.rerolls === 0 && relics.some(themed) && gold >= 12) return [{ k: "r" }];
  return null;
}
