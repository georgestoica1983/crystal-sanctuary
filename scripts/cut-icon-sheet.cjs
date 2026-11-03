// Cuts a Gemini icon sheet (a grid on a flat dark background) into
// transparent 256 px PNGs in public/art/icons. The background is flood-filled
// from each cell's edges and faded out softly so glows and outlines survive.
// Run with: node scripts/cut-icon-sheet.cjs design/gemini-icon-sheet.webp
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-relic-sheet.webp relics
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-relic-sheet-2.webp relics2   (4 × 2, rules v16 relics)
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-garden-plants.webp garden   (5 × 5 My Garden plants)
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-garden-decor.webp decor     (4 × 2 garden decorations)
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-visitors.webp visitors      (2 × 2 garden visitors)
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-bosses.webp bosses          (4 × 3 Boss portraits)
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-supplies.webp supplies      (5 × 3 tools, upgrades, Tags)
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-moments.webp moments        (4 × 2 Gardener, Swap, Journal…)
//      or:  node scripts/cut-icon-sheet.cjs design/gemini-weather-daily.webp weatherdaily  (4 × 2 weather, Daily flowers)
const sharp = require("sharp");
const path = require("path");

const ICON_NAMES = [
  "tile-thorn", "tile-thorn-bloomed", "tile-spike", "tile-shears", "tile-gloves",
  "tile-berry", "tile-acorn", "tile-exit", "companion-keeper", "companion-otter",
  "companion-fox", "companion-sprite", "stat-life", "stat-gloves", "stat-shears",
  "stat-seeds", "theme-thorns", "theme-acorns", "theme-berries-gloves", "theme-shears",
  "theme-long-lines", "theme-careful", "theme-growing", "theme-seeds", "theme-any",
];
// Relic sheet: 6×6, in the order of the Gemini relic prompt
const RELIC_NAMES = [
  "GILDED_AEGIS", "VORPAL_EDGE", "ALCHEMIST_FLASK", "SPIKED_BOOTS", "LONG_STRIDE", "GREED_CROWN",
  "GLASS_WATERING_CAN", "GOLDEN_BEE", "STARLIGHT_COMPASS", "MOSSY_STONE", "BRIAR_PRESS", "BRAMBLE_HEART",
  "MAGPIE_NEST", "COMPOST_HEAP", "LADYBUG", "THISTLE_WALTZ", "DEW_LENS", "BERRY_BASKET",
  "ZIGZAG_KITE", "DAWN_CHORUS", "OAK_SAPLING", "RAIN_BARREL", "SUN_PRISM", "QUIET_SNAIL",
  "EVENING_LANTERN", "HARVEST_MOON", "ELDER_TREE", "SQUIRREL_STASH", "SEED_PURSE", "SUN_HAT",
  "WISHING_WELL", "DEEP_TAPROOT", "SUNFLOWER", "THORN_CROWN", "RAINBOW_HEART", "ETERNAL_SPRING",
].map((id) => `relic-${id.toLowerCase().replace(/_/g, "-")}`);
// Second relic sheet (rules v16): 4 columns × 2 rows
const RELIC_NAMES_2 = [
  "FIRST_BLOOM", "THORN_CHORUS", "BELL_TOWER", "ACORN_GATE",
  "LONG_SHADOW", "BRAMBLE_BERRIES", "SOFT_MOSS", "SUNBEAM_LENS",
].map((id) => `relic-${id.toLowerCase().replace(/_/g, "-")}`);
// My Garden sheets: plants (5 × 5) and decorations (4 × 2), in the order of their Gemini prompts
const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const GARDEN_NAMES = [
  "Daisy", "Clover", "Buttercup", "Violet", "Tulip",
  "Iris", "Foxglove", "Lily", "Young Oak", "Lilac Bush",
  "Rowan", "Cherry Tree", "Silver Thistle", "Queen Rose", "Desert Bloom",
  "Moonflower", "Snowdrop", "Hazel Bloom", "Cactus Flower", "Twin Lily",
  "Path Poppy", "Wayfarer Aster", "Mist Orchid", "Coin Marigold", "Set Bloom",
].map((n) => `garden-${slug(n)}`);
const DECOR_NAMES = [
  "bench", "pond", "lantern", "arch", "stepping-stones", "bird-bath", "wind-chime", "gate",
].map((n) => `decor-${n}`);
const VISITOR_NAMES = ["ladybug", "bee", "butterfly", "snail"].map((n) => `visitor-${n}`);
// Boss portraits: 4 × 3, in the order of the Boss prompt (boss-<rule id in kebab case>)
const BOSS_NAMES = [
  "thistle-king", "briar-queen", "drought", "eclipse",
  "frost", "acorn-thief", "spike-bloom", "even-garden",
  "narrow-path", "long-road", "fog", "toll",
].map((n) => `boss-${n}`);
// Shop supplies: 5 × 3 (garden tools, garden upgrades, skip Tags), in the order of the supplies prompt
const SUPPLY_NAMES = [
  "tool-rich-soil", "tool-long-root", "tool-sunlit", "tool-dew", "tool-echo",
  "upgrade-root-cellar", "upgrade-old-oak", "upgrade-market-day", "upgrade-harvest-fair", "upgrade-almanac",
  "upgrade-observatory", "tag-fertile", "tag-golden", "tag-purse", "tag-relic",
];
// Rules v20 relics: 3 × 2, each cell with its own background shade
const RELIC_NAMES_3 = ["seven-stones", "short-cut", "straight-furrow", "light-step", "thornless-path", "even-rows"].map((n) => `relic-${n}`);
// Garden moments: 4 × 2, each cell with its own background shade (design/missing-art-audit-and-prompts.md, sheet A)
const MOMENT_NAMES = ["gardener", "swap", "no-safe-line", "journal", "daily", "music", "hint", "rotate-phone"].map((n) => `misc-${n}`);
// Weather and Daily flowers: 4 × 2 (sheet B of the missing-art prompts)
const WEATHER_DAILY_NAMES = [
  "weather-golden-hour", "weather-thick-brambles", "weather-spring-rain", "weather-firefly-night",
  "daily-bloom-3", "daily-bloom-2", "daily-bloom-1", "daily-stopped",
];
// Small badges: 4 × 2, in the order of the badges prompt
const BADGE_NAMES = ["star", "crown", "flame", "lock", "golden", "iridescent", "radiant", "seed"].map((n) => `badge-${n}`);
// Lawn board pieces: 4 × 2. Each cell has its own background shade, and pieces keep their own shape
const LAWN_NAMES = ["fringe-a", "fringe-b", "fringe-c", "trodden", "soil", "hedge", "texture", "tuft"].map((n) => `lawn-${n}`);
const FADE_EDGES = new Set(["garden-mist-orchid", "garden-moonflower", "garden-set-bloom"]);
// Row lines (as a share of the height) for sheets whose rows are not evenly spaced
const ROW_EDGES = { supplies: [0.273, 0.552] };
const SOLID = 14; // closer than this to the background: fully transparent
const SOFT = 46; // up to this (and reachable from the edge): partly transparent
// Icons with a soft painted halo (a glow on the dark background): a much wider
// see-through range, so the halo fades instead of staying a dark disc
const WIDE_GLOW = new Set([
  "relic-long-shadow", "boss-eclipse", "boss-frost", "boss-long-road", "boss-fog",
  "tool-sunlit", "upgrade-observatory", "tag-golden", "badge-radiant", "relic-seven-stones",
  "misc-daily", "misc-hint",
]);
const GLOW_SOFT = 120;
const OUT = 256;

(async () => {
  const src = process.argv[2];
  const mode = process.argv[3];
  const NAMES =
    mode === "relics" ? RELIC_NAMES
    : mode === "relics2" ? RELIC_NAMES_2
    : mode === "garden" ? GARDEN_NAMES
    : mode === "decor" ? DECOR_NAMES
    : mode === "visitors" ? VISITOR_NAMES
    : mode === "bosses" ? BOSS_NAMES
    : mode === "supplies" ? SUPPLY_NAMES
    : mode === "badges" ? BADGE_NAMES
    : mode === "lawn" ? LAWN_NAMES
    : mode === "relics3" ? RELIC_NAMES_3
    : mode === "moments" ? MOMENT_NAMES
    : mode === "weatherdaily" ? WEATHER_DAILY_NAMES
    : ICON_NAMES;
  const COLS = mode === "relics2" || mode === "decor" || mode === "bosses" || mode === "badges" || mode === "lawn" || mode === "moments" || mode === "weatherdaily" ? 4 : mode === "relics3" ? 3 : mode === "supplies" ? 5 : Math.round(Math.sqrt(NAMES.length));
  const ROWS = Math.ceil(NAMES.length / COLS);
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const sheetBg = [data[2 * C], data[2 * C + 1], data[2 * C + 2]];
  const cellW = W / COLS, cellH = H / ROWS;
  for (let n = 0; n < NAMES.length; n++) {
    const col = n % COLS, row = Math.floor(n / COLS);
    // The garden sheet has faint grid lines: step a few pixels inside each cell
    const inset = mode === "garden" ? 6 : mode === "relics3" || mode === "moments" || mode === "weatherdaily" ? 10 : 0;
    // Some sheets have unevenly spaced rows: cut them at the empty gaps instead
    const edges = ROW_EDGES[mode] ? [...ROW_EDGES[mode].map((f) => Math.round(f * H)), H] : null;
    const x0 = Math.round(col * cellW) + inset;
    const y0 = (edges ? (row === 0 ? 0 : edges[row - 1]) : Math.round(row * cellH)) + inset;
    const w = Math.round((col + 1) * cellW) - inset - x0;
    const h = (edges ? edges[row] : Math.round((row + 1) * cellH)) - inset - y0;
    // The lawn sheet's cells each have their own shade: read it from the cell's corner
    const perCell = mode === "lawn" || mode === "relics3" || mode === "moments" || mode === "weatherdaily";
    const at = (perCell ? (y0 + 4) * W + x0 + 4 : 2) * C;
    const bg = perCell ? [data[at], data[at + 1], data[at + 2]] : sheetBg;
    const rgba = Buffer.alloc(w * h * 4);
    const dist = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = ((y0 + y) * W + x0 + x) * C, j = y * w + x;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        dist[j] = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
        rgba[j * 4] = r; rgba[j * 4 + 1] = g; rgba[j * 4 + 2] = b; rgba[j * 4 + 3] = 255;
      }
    // Flood the background in from the cell's edges
    const seen = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    const soft = WIDE_GLOW.has(NAMES[n]) ? GLOW_SOFT : SOFT;
    while (stack.length) {
      const j = stack.pop();
      if (seen[j] || dist[j] > soft) continue;
      seen[j] = 1;
      const a = dist[j] <= SOLID ? 0 : (dist[j] - SOLID) / (soft - SOLID);
      for (let k = 0; k < 3; k++) {
        const c = a > 0 ? (rgba[j * 4 + k] - (1 - a) * bg[k]) / a : 0;
        rgba[j * 4 + k] = Math.max(0, Math.min(255, Math.round(c)));
      }
      rgba[j * 4 + 3] = Math.round(a * 255);
      const x = j % w, y = (j - x) / w;
      if (x > 0) stack.push(j - 1);
      if (x < w - 1) stack.push(j + 1);
      if (y > 0) stack.push(j - w);
      if (y < h - 1) stack.push(j + w);
    }
    // Mist and glows were painted as a square: fade them out softly towards the edges
    if (FADE_EDGES.has(NAMES[n])) {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
          const d = Math.hypot(dx, dy);
          const f = d <= 0.62 ? 1 : d >= 0.95 ? 0 : 1 - (d - 0.62) / 0.33;
          const j = y * w + x;
          rgba[j * 4 + 3] = Math.round(rgba[j * 4 + 3] * f);
        }
    }
    // Crop to the icon, square it up with a little room, scale to OUT
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let j = 0; j < w * h; j++)
      if (rgba[j * 4 + 3] > 20) {
        const x = j % w, y = (j - x) / w;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    // The lawn texture fills tiles edge to edge: keep only its even middle
    if (NAMES[n] === "lawn-texture") {
      const ix = Math.round((maxX - minX) * 0.1), iy = Math.round((maxY - minY) * 0.1);
      minX += ix; maxX -= ix; minY += iy; maxY -= iy;
    }
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    if (mode === "lawn") {
      await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
        .extract({ left: minX, top: minY, width: cw, height: ch })
        .resize(OUT, OUT, { fit: "inside" })
        .webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true })
        .toFile(path.join("public/art/icons", `${NAMES[n]}.webp`));
      console.log(NAMES[n], `${cw}×${ch}`);
      continue;
    }
    const side = Math.ceil(Math.max(cw, ch) * 1.08) + 2;
    const left = Math.round((side - cw) / 2), top = Math.round((side - ch) / 2);
    const icon = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: minX, top: minY, width: cw, height: ch })
      .png()
      .toBuffer();
    await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: icon, left, top }])
      .png()
      .toBuffer()
      .then((b) => sharp(b).resize(OUT, OUT).webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(path.join("public/art/icons", `${NAMES[n]}.webp`)));
    console.log(NAMES[n], `${maxX - minX}×${maxY - minY}`);
  }
})();
