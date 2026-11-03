import type { BossRuleId } from "@/types/game";

/**
 * One line of advice for the Boss bed ahead, shown on the Big bed before it.
 * `v20` follows the rules v20 Spike King, Drought and Toll.
 */
export function bossAdvice(id: BossRuleId, v20: boolean): string {
  switch (id) {
    case "THISTLE_KING":
      return v20 ? "Look for the open way to the gate before you draw." : "Bring 🧤 Gloves in case a Spike catches you.";
    case "BRIAR_QUEEN":
      return "Bring 🧤 Gloves and ✂️ Shears: Thorns hit harder.";
    case "DROUGHT":
      return v20 ? "Arrive with ❤️ Life to spare: Berries won't heal you there." : "Gloves give half: keep some Shears for the Thorns.";
    case "ECLIPSE":
      return "Lean on Acorns and Thorns for your score.";
    case "FROST":
      return "Steer clear of the biggest Thorns: healing is slow there.";
    case "ACORN_THIEF":
      return "Let Thorns and Shears carry your score.";
    case "SPIKE_BLOOM":
      return "Fewer Acorns to score with: let Thorns and Shears carry your line.";
    case "EVEN_GARDEN":
      return "Every tile is worth the same, so go as long as you can.";
    case "NARROW_PATH":
      return "Draw in straight rows and columns to keep your Length.";
    case "LONG_ROAD":
      return "Find a route of 10 tiles or more before you start drawing.";
    case "FOG":
      return "Draw one step at a time and read each new number.";
    case "TOLL":
      return v20 ? "Long lines cost 🌱 Seeds there: shop before you go." : "Every line costs 2 🌱 Seeds: shop before you go.";
  }
}
