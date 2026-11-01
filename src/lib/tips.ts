// Tip cards between beds: one short game tip or gardening tip, with a picture.
// No tip repeats until every tip of its kind has been shown on this device.
import { decorArt, gardenArt, tileArt, visitorArt } from "@/lib/art";

export type TipKind = "GAME" | "GARDEN";
export interface Tip {
  kind: TipKind;
  text: string;
  /** Picture shown with the tip */
  art: string;
}

const tile = (t: Parameters<typeof tileArt>[0]) => tileArt(t) ?? "";
const bloom = tileArt("ENEMY", { bloomed: true }) ?? "";

export const GAME_TIPS: Tip[] = [
  ["Longer lines score far more: every tile adds to both Value and Length.", bloom],
  ["Twice the tiles scores about four times the points.", bloom],
  ["A Thorn's number is points for your line, and it costs that much Life.", tile("ENEMY")],
  ["Step onto a Spike diagonally and it can't hurt you.", tile("TRAP")],
  ["Gloves block Thorn damage. Gather them before a thorny stretch.", tile("SHIELD")],
  ["Shears cut the next Thorn completely: no Life lost, and you keep its points.", tile("WEAPON")],
  ["Berries give back Life, up to your maximum. Save them for when you're hurt.", tile("POTION")],
  ["Acorns add Value to your line. Grab them on the way.", tile("GOLD")],
  ["Every bed gives you 4 lines. Lines you don't use pay 1 🌱 each.", bloom],
  ["Swap changes up to 3 tiles. You get 3 Swaps in every bed.", bloom],
  ["Stuck? Hint lights up a good route once per bed.", bloom],
  ["Clearing a bed gives you 3 Life back for the next one.", tile("POTION")],
  ["A line with one to spare earns ⭐⭐. Score 1.5× the target for ⭐⭐⭐.", bloom],
  ["Seeds you keep earn interest: +1 for every 5 🌱, up to +5 after each bed.", tile("GOLD")],
  ["Three beds make a Season: Small, Big, then a Boss bed.", bloom],
  ["Beat a Boss bed to win a Legendary relic.", bloom],
  ["The Season dots show the coming Boss early. Tap its icon to read the rule.", bloom],
  ["Three relics with the same tag make a set: every line scores ×1.25.", bloom],
  ["You can hold 5 relics. Sell one in the Shop for half its price.", bloom],
  ["A reroll costs 5 🌱, and 1 more each time in the same Shop.", tile("GOLD")],
  ["Fertilizer makes one kind of tile worth more for the whole Run.", tile("GOLD")],
  ["Garden tools upgrade a single tile on the board. You can carry two.", tile("WEAPON")],
  ["Golden tiles add +30 Value. Iridescent ones add +2 Length.", bloom],
  ["Echo tiles score twice. Route your line through them.", bloom],
  ["Prune weak tiles from your bag in the Shop so better ones come up.", tile("WEAPON")],
  ["Skip a Small bed for a Tag. The Big bed's target grows by half.", bloom],
  ["Each companion plays differently. Try them all as they unlock.", bloom],
  ["If a line would run out of Life, it pulls back and shows you why.", tile("ENEMY")],
  ["Plan the long way first, then trim the risky bits.", bloom],
  ["Finish Season 8 and the garden goes on forever in Endless.", bloom],
].map(([text, art]) => ({ kind: "GAME" as const, text, art }));

export const GARDEN_TIPS: Tip[] = [
  ["Water in the morning, so leaves dry before night.", gardenArt("Daisy")],
  ["Water deeply and less often. Roots grow down to follow it.", gardenArt("Young Oak")],
  ["A layer of mulch keeps soil cool and moist on hot days.", gardenArt("Clover")],
  ["Deadhead spent flowers and many plants bloom again.", gardenArt("Tulip")],
  ["Plant tall flowers at the back so the small ones get sun too.", gardenArt("Foxglove")],
  ["Bees love blue, purple and yellow flowers.", visitorArt("bee")],
  ["Leave a few seed heads in autumn. Birds will thank you.", decorArt("bird-bath")],
  ["Ladybugs eat aphids. One ladybug can eat dozens a day.", visitorArt("ladybug")],
  ["Compost turns kitchen scraps into the best food for soil.", gardenArt("Clover")],
  ["Most vegetables want six hours of sun a day.", gardenArt("Buttercup")],
  ["Snowdrops push up through frost to flower in late winter.", gardenArt("Snowdrop")],
  ["Sunflowers follow the sun while they're young.", gardenArt("Coin Marigold")],
  ["Lavender likes poor, dry soil and lots of sun.", gardenArt("Lilac Bush")],
  ["Mint spreads fast. Give it a pot of its own.", gardenArt("Clover")],
  ["Plant bulbs about three times as deep as they are tall.", gardenArt("Tulip")],
  ["Cut flowers early in the morning so they last longer in a vase.", gardenArt("Lily")],
  ["Thorny roses smell sweetest in the warmth of the afternoon.", gardenArt("Queen Rose")],
  ["Foxglove takes two years to flower, then seeds itself.", gardenArt("Foxglove")],
  ["Clover feeds the soil by pulling nitrogen from the air.", gardenArt("Clover")],
  ["A small pond brings frogs, and frogs eat slugs.", decorArt("pond")],
  ["Moonflowers open at dusk and close at dawn.", gardenArt("Moonflower")],
  ["Rain barrels save water and plants prefer rainwater.", decorArt("pond")],
  ["Pinch the tips of young plants to make them bushier.", gardenArt("Violet")],
  ["Rotate vegetable beds each year to keep the soil healthy.", decorArt("stepping-stones")],
  ["Leave a corner a little wild. Wildlife loves an untidy patch.", visitorArt("butterfly")],
  ["Oak trees can live for hundreds of years.", gardenArt("Young Oak")],
  ["Seeds need warmth more than light to sprout.", gardenArt("Daisy")],
  ["Marigolds planted between vegetables help keep some pests away.", gardenArt("Coin Marigold")],
  ["Snails come out after rain. Check under leaves in the evening.", visitorArt("snail")],
  ["A garden is never finished. That's the best part.", decorArt("gate")],
].map(([text, art]) => ({ kind: "GARDEN" as const, text, art }));

const SEEN_KEY = "ost_tips_seen_v1";
const LAST_KIND_KEY = "ost_tips_last_kind_v1";
const TIPS_ON_KEY = "ost_tips_on_v1";

function loadSeen(): Record<TipKind, number[]> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "null");
    return { GAME: raw?.GAME ?? [], GARDEN: raw?.GARDEN ?? [] };
  } catch {
    return { GAME: [], GARDEN: [] };
  }
}

/** The next tip: game and gardening take turns; within a kind, none repeats until all were shown */
export function takeNextTip(): Tip {
  let lastKind: TipKind = "GARDEN";
  try {
    lastKind = (window.localStorage.getItem(LAST_KIND_KEY) as TipKind) ?? "GARDEN";
  } catch {
    // Ignore storage errors
  }
  const kind: TipKind = lastKind === "GAME" ? "GARDEN" : "GAME";
  const list = kind === "GAME" ? GAME_TIPS : GARDEN_TIPS;
  const seen = loadSeen();
  let unseen = list.map((_, i) => i).filter((i) => !seen[kind].includes(i));
  if (unseen.length === 0) {
    seen[kind] = [];
    unseen = list.map((_, i) => i);
  }
  const pick = unseen[Math.floor(Math.random() * unseen.length)];
  seen[kind] = [...seen[kind], pick];
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    window.localStorage.setItem(LAST_KIND_KEY, kind);
  } catch {
    // Ignore storage errors
  }
  return list[pick];
}

/** The "Tips between beds" setting (on by default) */
export function loadTipsOn(): boolean {
  try {
    return window.localStorage.getItem(TIPS_ON_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveTipsOn(on: boolean): void {
  try {
    window.localStorage.setItem(TIPS_ON_KEY, on ? "1" : "0");
  } catch {
    // Ignore storage errors
  }
}
