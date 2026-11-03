# Missing art: audit and Gemini prompts

This lists every place a player still sees an emoji where the game should show a painted illustration. There are **30 new icons across 3 Gemini sheets**, plus a few spots where art already exists and only the code needs to change.

## What's already covered (no new art needed)

These all have painted art in `public/art/icons`:
- all 50 relics and all 12 Bosses;
- tiles, companions and stats;
- the 9 relic themes;
- tools, upgrades and the 4 skip Tags;
- the 25 garden plants, 8 decorations and 4 visitors;
- badges (star, crown, flame, lock, seed, golden, iridescent, radiant).

The old Daily-mode screens (`Modals.tsx`, `TutorialView.tsx`) aren't reachable in Run-only mode, so their emoji don't matter.

**The Daily share text must keep its emoji** (🌸🌼🌱🥀⬛). It's pasted into chats, where pictures can't go. Only the grid shown inside the game gets art.

## The audit: emoji players still see

| # | Where players see it | Now | Problem | Fix |
|---|---|---|---|---|
| 1 | Top card on weather beds, weather tips | ☀️ 🌿 🌧️ ✨ | Plain emoji beside painted art | **New art:** 4 weather icons (sheet B) |
| 2 | Menu rank card, Companions & looks header, Next goal, unlock card | 🌱 🌿 🧑‍🌾 🏡 ✨ 👑 🌌 | 🌱 turns into the **seed bag** (the Seeds currency), so "Seedling" shows a money pouch. 👑 is the Legendary crown. The rest are emoji. | **New art:** 7 rank emblems (sheet C) |
| 3 | The Wandering Gardener card | 🧑‍🌾 | The only character in the game without a portrait | **New art:** Gardener portrait (sheet A) |
| 4 | Companions & looks → Board tab | 🌿 🍂 🌙 ❄️ 🌾 👑 📖 | Emoji next to painted mini boards | **New art:** 7 board-look medallions (sheet C) |
| 5 | Run over → Daily result grid (in game) | 🌸 🌼 🌱 🥀 | Emoji flowers in a painted game. If they were swapped automatically, 🌸 would become a Thorn and 🌱 the seed bag. | **New art:** 4 Daily flowers (sheet B). The share text stays emoji. |
| 6 | "No safe line" notices, Swap tips, the tile picked for Swap | 🌿 Swap, 🪨 | Swap's button uses a line icon while its text uses 🌿, so they don't match | **New art:** a Swap icon and a "No safe line" stone (sheet A) |
| 7 | Journal notice, Botanist title, Journal header | 📖 | Emoji | **New art:** a Garden Journal book (sheet A) and a Botanist rosette (sheet C) |
| 8 | Today's garden (New Run sheet, Run over, notices) | 🌞 (now a line-icon sun) | It's a headline feature with no picture of its own | **New art:** a Today's garden icon (sheet A) |
| 9 | "First Thorns set ever: … joins your music", Journal Sets page | 🎵 | Emoji | **New art:** a music icon (sheet A); each layer reuses its theme art (code) |
| 10 | Rules pages and tips mention "✨ Hint" | ✨ | Doesn't match the Hint button | **New art:** a Hint icon (sheet A) |
| 11 | "Turn your phone upright" screen | 📱 | A large emoji on an empty screen | **New art:** a rotate-the-phone picture (sheet A) |
| 12 | Leaderboard rows | 🐱 🦦 🦋 🦊 | Companion emblems are emoji | **Code only:** use the existing companion art |
| 13 | Unlock card "🎨 Sunset line colour" | 🌅 💜 🌟 … | Emoji stand in for a colour | **Code only:** show the line's colour swatch, as the Line colour tab does |
| 14 | "✨ A Golden tile joins your bag" notice | ✨ | Golden art already exists | **Code only:** use the Golden badge |
| 15 | "🪙 The Toll took N Seeds" notice | 🪙 | The Toll Boss has art | **Code only:** use the Toll Boss art |

## How to make the sheets

Use the same workflow as the earlier relic sheets:
1. Open Gemini (image generation) and attach `design/gemini-relic-sheet.webp` and `design/gemini-supplies.webp` as style references.
2. Paste one sheet prompt below and generate.
3. Save the image as the file name given, in `design/`.
4. Cut it with `node scripts/cut-icon-sheet.cjs design/<file> <set>`. Each new set needs its name list added to the script first, in the order given.

The style block is repeated at the start of every prompt, so each prompt can be pasted on its own.

---

## Sheet A: Garden moments (4 × 2, 8 icons) ✅ In the game

Cut with `node scripts/cut-icon-sheet.cjs design/gemini-moments.webp moments`. Where each icon now appears:
- **Gardener:** the Gardener card.
- **Swap:** the picked tile and every "🔄 Swap" in the text.
- **No safe line:** the "⛔ No safe line" notice.
- **Journal:** 📖 in notices and the Botanist chip (it also stands in for Herbarium until sheet C).
- **Today's garden:** the button, plus 🌞 in notices.
- **Music:** 🎵 in notices and the Journal Sets page.
- **Hint:** 💡 in the rules and the short-line tip.
- **Rotate phone:** the upright screen.

**File:** `design/gemini-moments.webp` · **set:** `moments`

```
Create 8 icons for my mobile garden game Bloomline, in exactly the same style as the attached relic and supply sheets. They must look like they belong to the same set: the same cosy, painterly-but-clean storybook illustration (soft gouache texture), the same soft moss-and-parchment palette, the same gentle warm-brown outline, the same soft lighting from the upper left and the same level of detail. Friendly and calm, never aggressive.

Layout (important, the image is cut by a script):
- One wide image, landscape 2:1, laid out as a grid of 4 columns × 2 rows: 8 equal square cells.
- Every cell has the same flat, plain, dark moss-green background (#151D18), with no texture, no gradient, no frame, no border, no grid lines and no shadow outside the object.
- One object per cell, centred, filling about 70% of the cell, with clear empty space around it.
- No text, no letters, no numbers and no labels anywhere.

The 8 icons, in this exact order (left to right, top row first):

1. The Wandering Gardener. A kind, older travelling gardener shown from the chest up: a wide straw hat with a small sprig tucked in the band, a soft moss-green scarf, rosy cheeks, a gentle smile and a small woven basket of seedlings over one arm. Warm straw, sage green and terracotta. Same portrait framing as the companion faces (head and shoulders, facing the viewer).
2. Swap. A small wooden-handled hand trowel lifting a tiny sprout out of the soil, with a second sprout waiting beside it, and a soft curved arrow of light looping between the two. Fresh leaf green and warm wood. It must read as "swap these tiles".
3. No safe line. A round, mossy grey garden stone blocking a little dirt path, with two short path ends stopping on either side of it. Calm, not scary. Stone grey, moss green, soft earth brown.
4. Garden Journal. A thick, closed field notebook with a soft green linen cover, a pressed flower on the front, a ribbon bookmark and a leather strap. Moss green, parchment and a touch of rose.
5. Today's garden. A small rising sun peeking over one tidy little garden bed with three sprouts, the sun's rays soft and golden. Warm sunrise gold, sky peach and leaf green. It must read as "today's daily garden".
6. Garden music. A curling green vine shaped into a musical note, with two tiny leaves and a little bell-shaped flower. Leaf green and warm gold.
7. Hint. A small glass garden lantern with a single firefly glowing inside it, casting a soft golden glow. Brass, glass and warm yellow light.
8. Turn your phone upright. A simple rounded phone in a soft cream case, shown turning from sideways to upright, with one gentle curved arrow and a small leaf on the screen. Cream, sage green and soft gold.

Constraints:
- Each icon must read clearly at 32 px: one strong silhouette, at most 3 main colours.
- Keep each object fully inside its cell; nothing may touch or cross the cell edges.
- The 8 icons must have the same scale and visual weight.
```

**Cut names, in order:** `misc-gardener`, `misc-swap`, `misc-no-safe-line`, `misc-journal`, `misc-daily`, `misc-music`, `misc-hint`, `misc-rotate-phone`

---

## Sheet B: Weather and Daily flowers (4 × 2, 8 icons) ✅ In the game

Cut with `node scripts/cut-icon-sheet.cjs design/gemini-weather-daily.webp weatherdaily`. Where they now appear:
- **Weather:** the top card on weather beds and the weather tip's picture.
- **Daily flowers:** the in-game Daily grid and its legend. The share text keeps its emoji.

**File:** `design/gemini-weather-daily.webp` · **set:** `weatherdaily`

```
Create 8 icons for my mobile garden game Bloomline, in exactly the same style as the attached relic and supply sheets. They must look like they belong to the same set: the same cosy, painterly-but-clean storybook illustration (soft gouache texture), the same soft moss-and-parchment palette, the same gentle warm-brown outline, the same soft lighting from the upper left and the same level of detail. Friendly and calm, never aggressive.

Layout (important, the image is cut by a script):
- One wide image, landscape 2:1, laid out as a grid of 4 columns × 2 rows: 8 equal square cells.
- Every cell has the same flat, plain, dark moss-green background (#151D18), with no texture, no gradient, no frame, no border, no grid lines and no shadow outside the object.
- One object per cell, centred, filling about 70% of the cell, with clear empty space around it.
- No text, no letters, no numbers and no labels anywhere.

Top row: four kinds of garden weather. Each one is a small weather scene over a single tuft of grass, so they read as a set:

1. Golden Hour. A low, warm evening sun, half behind a gentle hill, with long golden rays across the grass tuft. Amber, honey gold and soft peach.
2. Thick Brambles. A dense, curling tangle of thorny bramble stems with small dark leaves and a few red thorn tips, growing over the grass tuft. Deep green and muted red. Thorny but not menacing.
3. Spring Rain. A soft, rounded rain cloud with a few fat raindrops falling on the grass tuft, and one drop splashing. Soft blue-grey, pale sky blue and fresh green.
4. Firefly Night. A deep blue night with a thin crescent moon and four or five small glowing fireflies drifting over the grass tuft. Indigo, soft violet and glowing lime yellow.

Bottom row: four flowers that show how well a bed went. Each is one flower head with a short stem and one leaf, all drawn at the same size and angle, so they line up in a grid:

5. Full bloom (three stars). A rich pink, fully open cosmos-like flower with a golden centre, petals wide open. Pink and gold.
6. Half bloom (two stars). A bright yellow daisy-like flower, open but smaller and simpler than the pink one. Butter yellow and warm orange centre.
7. Sprout (one star). A small green seedling with two round leaves and a tiny closed bud on top, not flowering yet. Fresh leaf green. It must NOT look like a seed or a seed bag.
8. Stopped here. A drooping, gently wilted flower in faded rose-brown, head bowed. Sad but soft and dignified, never dead or scary.

Constraints:
- Each icon must read clearly at 24 px: one strong silhouette, at most 3 main colours.
- The four weather icons share the same grass tuft and scale. The four flowers share the same size, stem length and angle.
- Keep each object fully inside its cell; nothing may touch or cross the cell edges.
```

**Cut names, in order:** `weather-golden-hour`, `weather-thick-brambles`, `weather-spring-rain`, `weather-firefly-night`, `daily-bloom-3`, `daily-bloom-2`, `daily-bloom-1`, `daily-stopped`

---

## Sheet C: Ranks, board looks and the Botanist title (5 × 3, 15 icons)

**File:** `design/gemini-ranks-looks.webp` · **set:** `rankslooks`

```
Create 15 icons for my mobile garden game Bloomline, in exactly the same style as the attached relic and supply sheets. They must look like they belong to the same set: the same cosy, painterly-but-clean storybook illustration (soft gouache texture), the same soft moss-and-parchment palette, the same gentle warm-brown outline, the same soft lighting from the upper left and the same level of detail. Friendly and calm, never aggressive.

Layout (important, the image is cut by a script):
- One image, landscape 5:3, laid out as a grid of 5 columns × 3 rows: 15 equal square cells.
- Every cell has the same flat, plain, dark moss-green background (#151D18), with no texture, no gradient, no frame, no border, no grid lines and no shadow outside the object.
- One object per cell, centred, filling about 70% of the cell, with clear empty space around it.
- No text, no letters, no numbers and no labels anywhere.

Row 1 and the first two cells of row 2: seven gardener ranks, a growing path from beginner to master. Each is a round emblem medallion with the same soft parchment rim, so they read as one series that gets a little richer and more golden at each step:

1. Seedling. A single tiny seedling with two round leaves just breaking through dark soil. Plain parchment rim. It must NOT look like a seed bag or a coin purse.
2. Sprout. A taller young sprout with four leaves and a curling tendril. Plain parchment rim with a thin green line.
3. Gardener. A wooden-handled spade and a watering can crossed behind a small sprout. Rim with a thin bronze line.
4. Head Gardener. A tiny cottage with a moss roof and a round green door, a small garden in front. Rim with a bronze line and two small leaves.
5. Star Gardener. A blooming flower whose centre is a soft golden star, with a few sparkles. Rim with a silver line.
6. Master of Seasons. A small circle split into four quarters, each showing one season (a spring blossom, a summer sun, an autumn leaf and a winter snowflake). Rim with a gold line. It must not look like a crown.
7. Endless Gardener. A glowing flower made of soft starlight against a deep indigo sky full of tiny stars, like a small galaxy blooming. Rim in gold with a faint violet glow. The richest of the seven.

The last three cells of row 2 and all of row 3: seven board looks, plus a title. Each board look is a small round medallion showing a tiny 3 × 3 patch of garden tiles in that look's colours, with one symbol resting on top, so the seven read as a set:

8. Moss board. Soft green mossy tiles with one fern frond on top.
9. Autumn board. Warm orange and russet tiles with one fallen maple leaf on top.
10. Night Garden board. Deep blue tiles with a crescent moon and two stars on top.
11. Winter Frost board. Pale icy blue tiles with frost patterns and one snowflake on top.
12. Golden Hour board. Honey-gold tiles with a sheaf of wheat on top.
13. Royal Garden board. Deep green tiles with gold edging and a small gold leaf-crown on top (laurel leaves, not a king's crown).
14. Herbarium board. Parchment-coloured tiles with a pressed flower and a sprig, like pages from a plant book.

15. Botanist title. A small rosette ribbon in soft green and gold with a pressed flower in its centre, like an award for a botanist.

Constraints:
- Each icon must read clearly at 28 px: one strong silhouette, at most 3 main colours.
- The seven rank medallions are exactly the same size and rim shape. So are the seven board medallions.
- Keep each object fully inside its cell; nothing may touch or cross the cell edges.
```

**Cut names, in order:** `rank-seedling`, `rank-sprout`, `rank-gardener`, `rank-head-gardener`, `rank-star-gardener`, `rank-master-of-seasons`, `rank-endless-gardener`, `board-moss`, `board-autumn`, `board-night`, `board-winter`, `board-golden`, `board-royal`, `board-herbarium`, `title-botanist`

---

## After the art arrives

1. **Cutter:** add the three name lists and sets (`moments` 4 × 2, `weatherdaily` 4 × 2, `rankslooks` 5 × 3) to `scripts/cut-icon-sheet.cjs`.
2. **Art helpers:** add `miscArt`, `weatherArt`, `dailyArt`, `rankArt`, `boardLookArt` and `titleArt` to `src/lib/art.ts`.
3. **Swap them in:**
   - weather → `RunHudStrip` and the weather tip;
   - ranks → menu rank card, Looks header, Next goal, unlock card;
   - Gardener → `GardenerCard`;
   - board looks → Looks Board tab;
   - Daily flowers → `DailyResultCard`, in game only (the share text stays emoji);
   - Swap and "No safe line" → notices and rules;
   - Journal → notice and title;
   - Today's garden → `TodaysGardenButton`;
   - music → set notice and Journal Sets page;
   - Hint → rules;
   - rotate phone → the upright screen.
4. **Code-only fixes from the audit (rows 12–15):** companion art in leaderboard rows, a colour swatch on line-colour unlocks, the Golden badge in the Golden tile notice, the Toll Boss art in the Toll notice.
5. Check every swapped spot at 375 and 320 phone widths.
