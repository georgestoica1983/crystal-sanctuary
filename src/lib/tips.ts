// Tip cards between beds: one short game tip or gardening tip, with a picture.
// No tip repeats until every tip of its kind has been shown on this device.
import { badgeArt, bossArt, companionArt, decorArt, gardenArt, icon, relicArt, tagArt, tileArt, toolArt, visitorArt } from "@/lib/art";
import {
  EDITIONS,
  MAX_COMMON_RELICS,
  MAX_TOOLS,
  RUN_INTEREST_STEP,
  RUN_REROLL_BASE_COST,
  RUN_STROKES_PER_GARDEN,
  RUN_WEEDOUT_MAX_TILES,
  RUN_WEEDOUTS_PER_GARDEN,
} from "@/lib/engine";
import { RUN_SKIP_TARGET_MULT } from "@/lib/runReplay";
import { RELIC_SET_X } from "@/lib/relicTags";
import type { HeroClassId } from "@/types/game";

export type TipKind = "GAME" | "GARDEN";
export interface Tip {
  kind: TipKind;
  text: string;
  /** Picture shown with the tip */
  art: string;
  /** Heading instead of "Game tip" (e.g. the bed's weather) */
  label?: string;
  /** Game tips are remembered by id (their numbers can change); gardening tips by their text */
  id?: string;
}

const tile = (t: Parameters<typeof tileArt>[0]) => tileArt(t) ?? "";

/** Where the player is when a tip could show: tips only appear when they fit */
export interface TipContext {
  /** Garden Runs started on this device, this one included */
  runs: number;
  /** This bed's position in the Run (0 = Season 1 Small) */
  gardenIndex: number;
  /** Furthest bed ever reached on this device */
  highestBed: number;
  /** Companions earned on this device */
  companions: HeroClassId[];
  /** Most interest after a bed right now (relics and garden upgrades raise it) */
  interestCap: number;
  /** Life given back for clearing a bed (lower on some Ascension levels) */
  clearLife: number;
}

type When = (c: TipContext) => boolean;
type Text = string | ((c: TipContext) => string);
const always: When = () => true;
/** From this bed of a Run on (the Shop opens kinds gradually: tools from Season 2, special tiles from Season 3) */
const fromBed = (bed: number): When => (c) => c.gardenIndex >= bed;
const has = (id: HeroClassId): When => (c) => c.companions.includes(id);

/** Shown as one of the first three game tips a player sees */
const FIRST_TIP_ID = "plan-long";

// Numbers come from the game's own rules, so a rule change can't leave a tip wrong
const GAME_TIP_LIST: Array<{ id: string; text: Text; art: string; when?: When }> = [
  { id: "long-lines", text: "Longer lines score far more: twice the tiles scores about four times the points.", art: icon("theme-long-lines")},
  {
    id: "life-carries",
    text: (c) =>
      c.clearLife > 0
        ? `Reach the gate with Life to spare: it carries into the next bed, plus ${c.clearLife} ❤️ for clearing.`
        : "Reach the gate with Life to spare: it carries into the next bed.",
    art: icon("stat-life"),
  },
  { id: "thorn-number", text: "A Thorn's number is points for your line and Life off your companion. Big ones are worth it while you're healthy.", art: tile("ENEMY") },
  { id: "spike-diagonal", text: "Come at a Spike diagonally and it can't hurt you.", art: tile("TRAP") },
  { id: "gloves", text: "Gloves soak up Thorn damage. Pick them up before a thorny stretch.", art: tile("SHIELD") },
  { id: "shears", text: "Shears cut the next Thorn clean: no Life lost, and you still get its points.", art: tile("WEAPON") },
  { id: "berries", text: "Save Berries for when you're hurt. They heal up to your maximum, never past it.", art: tile("POTION") },
  { id: "acorns", text: "Acorns are free points. Bend your line to pick them up.", art: tile("GOLD") },
  { id: "spare-lines", text: `You get ${RUN_STROKES_PER_GARDEN} lines a bed. Clear it early and every spare line pays 1 🌱.`, art: icon("stat-seeds")},
  {
    id: "swap",
    text: `Don't like a corner of the board? Swap changes up to ${RUN_WEEDOUT_MAX_TILES} tiles, ${RUN_WEEDOUTS_PER_GARDEN} times a bed.`,
    art: icon("theme-growing"),
  },
  { id: "hint", text: "Stuck? Hint lights up a good route once per bed. No shame in it.", art: relicArt("STARLIGHT_COMPASS")},
  { id: "stars", text: "Clear with a line to spare for ⭐⭐. Reach 1.5× the target too for ⭐⭐⭐.", art: badgeArt("star")},
  {
    id: "interest",
    text: (c) => `Seeds you keep earn interest: +1 for every ${RUN_INTEREST_STEP} 🌱, up to +${c.interestCap} after each bed.`,
    art: badgeArt("seed"),
    when: fromBed(1),
  },
  { id: "big-shows-boss", text: "The Big bed shows which Boss comes next. Shop with that Boss in mind.", art: bossArt("BRIAR_QUEEN"), when: (c) => c.runs <= 2 },
  {
    id: "boss-legendary",
    text: `Beat a Boss bed to win a Legendary relic. It doesn't take one of your ${MAX_COMMON_RELICS} relic slots.`,
    art: badgeArt("crown"),
    when: (c) => c.gardenIndex < 9,
  },
  { id: "season-dots", text: "Tap the Boss icon in the Season dots to read its rule before you get there.", art: bossArt("ECLIPSE")},
  {
    id: "sets",
    text: `Three relics with the same tag make a set: every line scores ×${RELIC_SET_X}. Look for matching tags in the Shop.`,
    art: icon("theme-any"),
    when: fromBed(2),
  },
  {
    id: "relic-slots",
    text: `You can hold ${MAX_COMMON_RELICS} relics. Full? Sell your weakest in the Shop for half its price.`,
    art: relicArt("MAGPIE_NEST"),
    when: fromBed(3),
  },
  {
    id: "reroll",
    text: `Nothing good in the Shop? A reroll costs ${RUN_REROLL_BASE_COST} 🌱, then 1 more each time in the same Shop.`,
    art: relicArt("WISHING_WELL"),
    when: fromBed(1),
  },
  { id: "fertilizer", text: "Fertilizer makes one kind of tile worth more for the rest of the Run. Pick the kind your bag has most of.", art: tagArt("FERTILE"), when: fromBed(4) },
  {
    id: "tools",
    text: `Garden tools upgrade one tile on the board. You can carry ${MAX_TOOLS}, and they only score once you use them.`,
    art: toolArt("RICH_SOIL"),
    when: fromBed(4),
  },
  {
    id: "editions",
    text: `Golden tiles add ${EDITIONS.GOLDEN.tag} and Iridescent ones ${EDITIONS.IRIDESCENT.tag}. Route through them when you can.`,
    art: badgeArt("golden"),
    when: fromBed(7),
  },
  { id: "echo", text: "Echo tiles score twice. Bend your line to pass through them.", art: toolArt("ECHO"), when: fromBed(7) },
  { id: "prune", text: "Prune weak tiles from your bag in the Shop, and the good ones come up more often.", art: tile("WEAPON"), when: fromBed(2) },
  {
    id: "skip",
    text: `Skip a Small bed for a Tag, but the Big bed's target grows ×${RUN_SKIP_TARGET_MULT}. Skip when you feel strong.`,
    art: tagArt("GOLDEN"),
    when: (c) => c.gardenIndex >= 3 && c.gardenIndex % 3 === 0,
  },
  { id: "otter", text: "The Otter can cross its own line once. Try a loop around a Thorn cluster.", art: companionArt("ROGUE"), when: has("ROGUE") },
  { id: "fox", text: "The Fox can hop over one tile per line. Jump a big Thorn instead of walking around it.", art: companionArt("MAGE"), when: has("MAGE") },
  { id: "sprite", text: "The Sprite has no Gloves, but cut Thorns heal it. Shears are its best friend.", art: companionArt("VAMPIRE"), when: has("VAMPIRE") },
  { id: "pulls-back", text: "If a line would run out of Life, it pulls back and shows you why. Try it: you lose nothing.", art: icon("theme-careful"), when: (c) => c.runs <= 3 },
  { id: FIRST_TIP_ID, text: "Plan the long way first, then trim the risky bits.", art: relicArt("LONG_STRIDE")},
  { id: "endless", text: "Finish Season 8 and the garden goes on forever in Endless.", art: relicArt("ETERNAL_SPRING"), when: (c) => c.highestBed >= 15 },
];

export const GAME_TIPS = GAME_TIP_LIST.map((t) => ({ ...t, when: t.when ?? always }));

const tipText = (text: Text, ctx: TipContext): string => (typeof text === "string" ? text : text(ctx));

/** Next-bed tips: chosen from what's on this board or in your hands, before any random tip */
export const SPIKE_TIP: Tip = { kind: "GAME", id: "spike-diagonal", label: "Spikes on this bed", text: "Come at a Spike diagonally and it can't hurt you.", art: tile("TRAP") };
export const toolReminderTip = (name: string, art: string): Tip => ({
  kind: "GAME",
  label: "Still in your pocket",
  text: `You're carrying ${name}. Tap it below the board, then tap a tile to use it.`,
  art,
});

export const GARDEN_TIPS: Tip[] = [
  // Each tip is about what its picture shows
  ["Water in the morning, so leaves dry before night.", gardenArt("Daisy")],
  ["Water deeply and less often. Roots grow down to follow it.", gardenArt("Young Oak")],
  ["Compost turns kitchen scraps into rich, dark soil that plants love.", toolArt("RICH_SOIL")],
  ["Deadhead faded poppies and they keep flowering for weeks longer.", gardenArt("Path Poppy")],
  ["Plant tall flowers at the back so the small ones get sun too.", gardenArt("Foxglove")],
  ["Bees love blue, purple and yellow flowers.", visitorArt("bee")],
  ["Leave a few seed heads in autumn. Birds will thank you.", decorArt("bird-bath")],
  ["Ladybugs eat aphids. One ladybug can eat dozens a day.", visitorArt("ladybug")],
  ["Creeping buttercups love damp ground and spread fast along runners.", gardenArt("Buttercup")],
  ["Snowdrops push up through frost to flower in late winter.", gardenArt("Snowdrop")],
  ["Lilacs set next year's buds soon after flowering, so prune them right away or not at all.", gardenArt("Lilac Bush")],
  ["Plant bulbs about three times as deep as they are tall.", gardenArt("Tulip")],
  ["Cut flowers early in the morning so they last longer in a vase.", gardenArt("Lily")],
  ["Many roses smell strongest on a warm, still morning.", gardenArt("Queen Rose")],
  ["Foxglove takes two years to flower, then seeds itself.", gardenArt("Foxglove")],
  ["Clover feeds the soil: tiny helpers on its roots pull nitrogen from the air.", gardenArt("Clover")],
  ["A small pond brings frogs, and frogs eat slugs.", decorArt("pond")],
  ["Moonflowers open at dusk and close by morning.", gardenArt("Moonflower")],
  ["Stepping stones keep your feet off wet soil, so roots don't get packed down.", decorArt("stepping-stones")],
  ["Sweet violet flowers are edible. People candy them to decorate cakes.", gardenArt("Violet")],
  ["Leave a corner a little wild. Wildlife loves an untidy patch.", visitorArt("butterfly")],
  ["Oak trees can live for hundreds of years.", gardenArt("Young Oak")],
  ["Most seeds just need warmth and moisture to sprout, but a few, like lettuce, need light too.", badgeArt("seed")],
  ["Marigolds planted between vegetables help keep some pests away.", gardenArt("Coin Marigold")],
  ["Snails come out after rain. Check under leaves in the evening.", visitorArt("snail")],
  ["Cherry trees blossom for only a week or two each spring. Look up while it lasts.", gardenArt("Cherry Tree")],
  ["Rowan berries feed birds well into autumn.", gardenArt("Rowan")],
  ["Hazel flowers in late winter. The long yellow catkins are its flowers.", gardenArt("Hazel Bloom")],
  ["Bearded irises like their roots half above the soil, warming in the sun.", gardenArt("Iris")],
  ["Thistle seeds float away on silky down, carried by the wind.", gardenArt("Silver Thistle")],
  // Facts that echo the board
  ["Real rose thorns keep grazing animals away, the way Gloves keep Thorns off you.", tile("ENEMY")],
  ["Many oaks grow from acorns that squirrels buried and forgot to dig up.", tile("GOLD")],
  ["Birds eat berries and drop the seeds far away, planting new bushes.", tile("POTION")],
  ["Dew forms on cool, clear nights, and small plants sip it at dawn.", toolArt("DEW")],
  ["A garden is never finished. That's the best part.", decorArt("gate")],
].map(([text, art]) => ({ kind: "GARDEN" as const, text, art }));

// Seen tips are kept by id (game) or text (gardening)
const SEEN_KEY = "ost_tips_seen_v2";
const seenKey = (t: { id?: string; text: string }) => t.id ?? t.text;
const LAST_KIND_KEY = "ost_tips_last_kind_v1";
const TIPS_ON_KEY = "ost_tips_on_v1";

function loadSeen(): Record<TipKind, string[]> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "null");
    return { GAME: raw?.GAME ?? [], GARDEN: raw?.GARDEN ?? [] };
  } catch {
    return { GAME: [], GARDEN: [] };
  }
}

function saveSeen(seen: Record<TipKind, string[]>, kind?: TipKind): void {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    if (kind) window.localStorage.setItem(LAST_KIND_KEY, kind);
  } catch {
    // Ignore storage errors
  }
}

/** A next-bed tip counts as seen too, so the same words don't come back at random soon after */
export function markTipSeen(tip: Tip): void {
  const seen = loadSeen();
  if (!seen[tip.kind].includes(seenKey(tip))) saveSeen({ ...seen, [tip.kind]: [...seen[tip.kind], seenKey(tip)] });
}

/**
 * How often a random tip shows: every bed in the first Run, every other bed
 * for the next few, then only when a new Season starts (from the 6th Run).
 */
export function tipDueThisBed(runs: number, gardenIndex: number): boolean {
  if (runs <= 1) return true;
  if (runs <= 5) return gardenIndex % 2 === 1;
  return gardenIndex % 3 === 0;
}

/**
 * The next tip: game and gardening take turns; a game tip must fit where the
 * player is. Within a kind, none repeats until all that fit were shown.
 */
export function takeNextTip(ctx: TipContext): Tip {
  let lastKind: TipKind = "GARDEN";
  try {
    lastKind = (window.localStorage.getItem(LAST_KIND_KEY) as TipKind) ?? "GARDEN";
  } catch {
    // Ignore storage errors
  }
  const kind: TipKind = lastKind === "GAME" ? "GARDEN" : "GAME";
  const list: Array<{ id?: string; text: Text; art: string; label?: string }> =
    kind === "GAME" ? GAME_TIPS.filter((t) => t.when(ctx)) : GARDEN_TIPS;
  const key = (t: { id?: string; text: Text }) => t.id ?? (t.text as string);
  const seen = loadSeen();
  let unseen = list.filter((t) => !seen[kind].includes(key(t)));
  if (unseen.length === 0) {
    // All shown: start the round again (keeping tips that don't fit yet unseen)
    seen[kind] = seen[kind].filter((k) => !list.some((t) => key(t) === k));
    unseen = list;
  }
  // The best strategy tip is one of the first three game tips anyone sees
  const early = kind === "GAME" && seen.GAME.length < 3 && !seen.GAME.includes(FIRST_TIP_ID);
  const pick =
    (early && seen.GAME.length >= 1 && unseen.find((t) => t.id === FIRST_TIP_ID)) ||
    unseen[Math.floor(Math.random() * unseen.length)];
  seen[kind] = [...seen[kind], key(pick)];
  saveSeen(seen, kind);
  return { kind, id: pick.id, text: tipText(pick.text, ctx), art: pick.art, label: pick.label };
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
