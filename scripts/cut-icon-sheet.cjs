// Cuts the Gemini icon sheet (5×5 grid on a flat dark background) into
// transparent 256 px PNGs in public/art/icons. The background is flood-filled
// from each cell's edges and faded out softly so glows and outlines survive.
// Run with: node scripts/cut-icon-sheet.cjs design/gemini-icon-sheet.webp
const sharp = require("sharp");
const path = require("path");

const NAMES = [
  "tile-thorn", "tile-thorn-bloomed", "tile-spike", "tile-shears", "tile-gloves",
  "tile-berry", "tile-acorn", "tile-exit", "companion-keeper", "companion-otter",
  "companion-fox", "companion-sprite", "stat-life", "stat-gloves", "stat-shears",
  "stat-seeds", "theme-thorns", "theme-acorns", "theme-berries-gloves", "theme-shears",
  "theme-long-lines", "theme-careful", "theme-growing", "theme-seeds", "theme-any",
];
const SOLID = 14; // closer than this to the background: fully transparent
const SOFT = 46; // up to this (and reachable from the edge): partly transparent
const OUT = 256;

(async () => {
  const src = process.argv[2];
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: W, channels: C } = info;
  const bg = [data[2 * C], data[2 * C + 1], data[2 * C + 2]];
  const cell = W / 5;
  for (let n = 0; n < 25; n++) {
    const x0 = Math.round((n % 5) * cell), y0 = Math.round(Math.floor(n / 5) * cell);
    const w = Math.round(((n % 5) + 1) * cell) - x0, h = Math.round((Math.floor(n / 5) + 1) * cell) - y0;
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
    while (stack.length) {
      const j = stack.pop();
      if (seen[j] || dist[j] > SOFT) continue;
      seen[j] = 1;
      const a = dist[j] <= SOLID ? 0 : (dist[j] - SOLID) / (SOFT - SOLID);
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
    // Crop to the icon, square it up with a little room, scale to OUT
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let j = 0; j < w * h; j++)
      if (rgba[j * 4 + 3] > 20) {
        const x = j % w, y = (j - x) / w;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
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
      .then((b) => sharp(b).resize(OUT, OUT).png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toFile(path.join("public/art/icons", `${NAMES[n]}.png`)));
    console.log(NAMES[n], `${maxX - minX}×${maxY - minY}`);
  }
})();
