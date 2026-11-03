# Bloomline backlog

Things that are ready in code but wait on a setup step, plus work planned for later.

## Now: calmer screen and a more human voice (2026-11-01)

Everything below this section is parked until this is done.

- [x] Run screen: remove the empty space at the top and cut the five bands of info down to three (top bar, board, bottom bar).
- [x] Fonts: replace the Fraunces + JetBrains Mono + Nunito set with fonts that feel hand-picked, and use tabular figures instead of a mono font for numbers.
- [x] Wording: no em dashes in anything a player reads; rewrite each sentence by hand so it sounds like a person wrote it.

## Next: the reviewers' top 25 (2026-11-02, in this order, ask before each step)

**Before testers**
- [x] 1. Tester round (my part): tracking for Run start, bed start, first Shop and Boss beds, a one-time feedback card after the first Run, and the tester note (TESTER-NOTE.md). Your part is in "Waiting on setup" below.
- [x] 2. Saves are never lost: resuming a Run after closing the app is bulletproof.
- [x] 3. Name and link match (my part: /move page): a Bloomline address instead of crystal-sanctuary-tan.vercel.app.
- [x] 4. Back during auto-closing screens (tip cards, Boss intro) closes only that screen.
- [x] 5. Forgiving drawing: no wrong tile when a finger drifts at a corner, no half-finished line when a finger lifts by accident.
- [x] 6. Fast first load: art as WebP, relic and Boss art loaded only when needed; test on a budget Android over 4G.
- [x] 7. Colour-blind safe numbers: a small thorn or leaf mark, not only red and green.

**Core game depth**
- [x] 8. More ways to win than "longer": relics for exact or careful lines (e.g. exactly 7 tiles scores ×2).
- [x] 9. Bosses change where you draw (Toll, Drought, Thistle King), not only the target.
- [x] 10. Beds where the longest line is a trap.
- [x] 11. A livelier middle game (Seasons 4–6): new Boss rules, rarer relics, a mid-Run event.
- [x] 12. Interest isn't the only right answer: checked with the economy bots (2026-11-03), no rule change needed. Strong bots, 18 beds: save everything 52k, buy score relics only 86k, keep 10 and buy the rest 90k, so a mix wins and pure saving is worst. Not measured: Root Cellar / Old Oak builds; watch them in tester data.
- [x] 13. Softer first Boss: preview it in the Big bed before ("Next: Thistle King. Bring Gloves.").

**Feel**
- [x] 14. Long lines feel huge: burst, sound and pause grow with length.
- [x] 15. Haptics while drawing: a tick per tile, stronger on Thorns and at the gate.
- [x] 16. Readable score versus target: bigger bar, a notch at the target, short numbers.

**Teaching**
- [x] 17. Teach Spikes when they first appear (ghost arrow crossing diagonally).
- [x] 18. Show Fertilizer on the board (level badge on the tile).
- [x] 19. The Shop shows how a relic works with yours ("about +X on your best line", "2 of 3 Thorns set").
- [x] 20. The Life-out explanation stays until read.
- [x] 21. Bring in upgrade types gradually across the first Seasons.

**Coming back and sharing**
- [x] 22. The end screen points forward: one next goal first.
- [x] 23. A good place to stop: "Stop here, resume later" after each Boss. (Quick mode, a shorter Run, not built yet: it would need new rules.)
- [x] 24. Daily Garden (same seed for everyone, Seasons 1 to 3, first try counts) with a shareable flower grid, a day streak, and a Today's garden button on the New Run sheet and the end screen.
- [ ] 25. Shareable seeded Runs (a code like MOSS-4821) using the replay system.

## Waiting on setup (your part, parked for now: do this before the tester round)

- [ ] **Feedback form** — create a Google Form ("Bloomline feedback": how do you score points · what do Shears, Gloves and Acorns do · when were you confused · what felt satisfying · play again tomorrow? · how far did you get · phone model), copy its forms.gle link.
- [ ] **PostHog** — free account (EU region), project "Bloomline", copy the `phc_…` Project API key.
- [ ] **Vercel** — Settings → Environment Variables: `NEXT_PUBLIC_FEEDBACK_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`, then Redeploy. Check one line shows up in PostHog → Activity.
- [ ] **New address** (step 3, in this order):
  1. Vercel → project → Settings → Domains → Add `bloomline-game.vercel.app`, make it the production domain. Keep the old one working for now.
  2. On your phone, open `crystal-sanctuary-tan.vercel.app/move` and tap **Move my progress**, then **Bring it here** on the new address.
  3. Back in Domains, set `crystal-sanctuary-tan.vercel.app` to redirect to the new address.
  4. Optional: Settings → General → Project Name → `bloomline`.
- [ ] **Real tester round** — send the link to 10–15 new players with the text in TESTER-NOTE.md.
- [ ] **Rename the GitHub repo** to `bloomline` (optional).

## Phase 3 — online and habit (needs a free Supabase account)

- [ ] Online leaderboard with player names, and a share-your-score image.
  - When setting up Supabase, run **all** migrations in `supabase/migrations/` in date order (20261030 adds the Ascension level, 20261031 the companion).
- [ ] Progress tied to an account (stars and unlocks survive a new phone).
- [ ] Daily board (same seed for everyone) + streak.

## Phase 4 — depth for players who get hooked

- [x] More Boss rules (now 8) and a reward for Endless (after Season 8).
- [x] Harder start for veterans: Ascension levels 0–6.
- [x] Build depth:
  - [x] ✂️ Pruning Shears in the Shop: remove one tile from the bag (rules v9).
  - [x] Relic theme tags (Thorns, Acorns, Berries & Gloves, Shears, Long lines, Careful, Growing, Seeds, Any build) + "Fits your build" mark.
  - [x] Relic sets: 3 relics with one tag score every line ×1.25 (rules v10), with Shop progress, a HUD set chip and help text.
  - [x] Companions with their own rule: pick Keeper / Otter / Sprite / Fox per run, Companions & looks screen, leaderboard emoji.
- [x] More unlocks: board themes (Autumn, Night Garden, Winter Frost, Golden Hour, Royal Garden), Blossom / Sunset / Starlight / Ember lines, Star Gardener rank, next-unlock line.
- [ ] Quick mode (a 3-minute run) — only if testers ask.
- [x] A 10-second "how to score big" demo opening walkthrough step 2 (skip, watch again, still card with reduce motion).

## Design and sound (now)

- [x] Art direction: moss look, illustrated tiles, companions, stats, relic themes and all 36 relics.
- [x] Leftover emoji: menu and Settings tiles, Swap and Skip use line icons; Companions & looks shows painted art (Boss icons, rank and stars stay emoji on purpose).
- [x] Art for the 8 rules-v16 relics (design/gemini-relic-sheet-2.webp).
- [x] Music and sound: generated kalimba score at 66 BPM (seeded per Run), soft effects in the garden key, earned-reward sounds, separate Music switch, /sound-test page.
- [x] Drag and tap together to draw a line.

## Calm + Balatro roadmap (from the two research pieces, 2026-11-01)

Rule: anything random is visible before you commit — no hidden chances, no paid packs, no breaking streaks.

**A — feel (no rules change)**
- [x] 1. Declutter: slim header row (Life always, Gloves/Shears only when held, Seeds in the Shop), relics in one chip with a tap-open list, Tile bag in ☰ (Sound already there), Swap moved to the bottom row next to Hint (glows when the board is weak), softer badges and stripes, wider tile gaps.
- [x] 2. Balatro-style scoring: tiles light up along the path (rising notes into Value/Length), then relics in order (flat, then ×), a 150 ms pause before each ×, total settles. Faster on long lines, tap to skip, Speed ×1/×2/×4.
- [x] 3. "On fire" glow when the line beats what the bed needs (grows at ×2/×5); big-number format (12.4K, 3.1M, 1.2e15).
- [x] 4. Living board (pitch variety kept to ±0.5% on notes so they stay in key; ±3% on noise sounds): idle tiles sway + note on touch, tiles tilt toward the finger, spring motion, Thorns squash/stretch/bloom, ±3% pitch variety.
- [x] 5. "The garden rests" end screen: harvest summary, no failure wording.

**B — Run depth (one rules version each, bots first)**
- [x] 6. Fertilizer (rules v12): a 4th Shop offer that levels one tile type for the Run — Thorns +3 Value per level, other tiles +2; costs 6 Seeds (8 from Ascension 2); "🌱Lv" leaf on tiles, best-line preview in the Shop. Bots: balance unchanged vs v11; buying only Fertilizer is slightly weaker than relics.
- [x] 7. Garden tools (rules v13): hold 2, bought as a 5th Shop offer, tap a tool then a tile; the upgrade stays on that tile in the bag for the Run — Rich Soil +20 Value (4), Long Root +2 Length (5), Sunlit ×1.25 (6), Dew ×1.5 for 3 lines (6); +2 Seeds from Ascension 2. Stone dropped. Bots: unchanged balance in normal use; heavy use helps casual players a little, Ascension 6 stays hard.
- [x] 8. Special tiles (rules v14): Golden +30 Value, Iridescent +2 Length, Radiant ×1.25 on any line through them, with a glow and slow sweep; a new bag starts with 1, a quarter of Shops sell one (8 Seeds, 10 from Ascension 2) that joins the bag. The first numbers (+50 / +3 / ×1.5, 2 to start) were far too strong; the gentle version keeps balance close to v13.
- [x] 9. Echo (rules v15): a 5th garden tool (7 Seeds) on its own layer — a tile's number, tool upgrade and shimmer count twice, and it can join an upgraded tile; 🔔 mark, rings a second time in the scoring show. Bots: no balance change; its value is in combos.
- [x] 10. 8 new relics (rules v16): First Bloom, Thorn Chorus, Bell Tower, Acorn Gate, Long Shadow (score-again), Bramble Berries, Soft Moss, Sunbeam Lens (rule-benders); emoji icons until the Gemini sheet (design/gemini-relic-sheet-2-prompt.md, cut with `node scripts/cut-icon-sheet.cjs design/gemini-relic-sheet-2.webp relics2`, then remove them from RELICS_PENDING_ART in src/lib/art.ts). Bots: small lift for casual buyers, sets a little rarer.
- [x] 11. Skip a bed for a Tag (rules v17): only Small beds, before the first line; Tags: Fertile (free Fertilizer level), Golden (a bag tile turns Golden), Purse (+10 Seeds), Relic (free Rare relic in the next Shop). You lose the bed's Seeds, Shop and Life back, and the Big bed's target grows +50%. Without that last rule skipping was free progress (A6 strong 23 → 36 of 48); with it, 23 → 28.
- [x] 12. Garden upgrades (rules v18): one per Season for 6 Seeds, two tiers — Root Cellar → Old Oak (interest cap +5 → +15), Market Day → Harvest Fair (Shop −25% → −50%), Almanac → Observatory (Fertilizer −3 Seeds → 2 levels each); listed in the menu. They cost a little over 3 Seasons and pay off over 5 (bots buying them first: 12 → 20 of 32 full 15-bed runs).
- [x] 13. Rerolls start at 5 Seeds, +1 each in the same Shop — already the Garden Run rule (getRunRerollCost); the flat 10 was the old Daily mode.
- [x] 14a. The Season's Boss is shown ahead: its icon sits on the third Season dot (tap for the rule) and the Shop's "Up next" names it (preview matched the real Boss in 54 of 54 Boss beds).
- [x] 14b. Four new Bosses (rules v19): 🚧 The Narrow Path (diagonal steps add no Length), 📏 The Long Road (lines under 10 tiles score half), ☁️ The Fog (numbers hidden until your line is next to them), 🪙 The Toll (each line costs 2 Seeds). Bots: about as hard as the old 8 (A6 24 → 21 of 48); the Fog is harder for people than for bots.

**C — come back (no rules change)**
- [x] 15a+c. My Garden, earning and planting (src/lib/myGarden.ts): every cleared bed plants a flower (golden with 3 ⭐), a Boss a rare one, a full Season a tree, a first-ever relic set a special flower; saved on the phone, never lost; shown on the bed-cleared screen and flying into "Planted in your garden" on the end screen.
- [x] 15b. My Garden screen (☰ → My Garden, and 'Visit your garden' on the end screen): calm scene with depth, swaying flowers and pollen, touch a flower for its story, milestones (bench 10, pond 25, lanterns 50, arch 100), opens sleepy after 3+ days away and wakes with a chime. Placeholder art: tinted blooms and emoji decorations.
- [x] 15d. Garden art: 25 illustrated plants (golden ones glow, relic-set flowers tinted by theme) and 8 decorations as milestones (stepping stones 5, bench 10, pond 25, bird bath 40, lanterns 50, wind chime 75, arch 100, gate 150).
- [x] 16a. Garden Journal (☰ → Garden Journal, src/lib/journal.ts): 6 pages — Relics 44, Sets 8, Garden 33, Bosses 12, Supplies 24, Companions 4 — found entries in colour, missing ones as silhouettes with a hint; tap for details and records (Boss wins and best score, companion best Run). Records Bosses, supplies and companions from now on.
- [x] 16b. NEW dots on fresh entries and a gentle "New in your Journal" notice during Runs.
- [x] 16c. Journal rewards (cosmetic): Botanist title at 25%, Pressed Petal line at 50%, Herbarium board at 75%, golden cover and line at 100%.
- [x] 17a. Eight music layers in the garden key (Thorn heartbeat, Acorn marimba, Berry bells, Shears shaker, Long-line drone, Quiet wind, Growing arpeggio, Seed rain), at most 3 per 8-bar section; previews and an "All layers" switch on /sound-test.
- [x] 17b. Each completed relic set unlocks its layer for good (fade-in moment, My Garden "music: N of 8 layers", Journal text, a Music layers switch in ☰).
- [x] 18a. Time of day (looks only): dawn / day / golden hour / night light over the board, fireflies at night, sparser night music; My Garden sky, moon, night-glowing flowers, and the real season on the ground (winter frost, autumn leaves). "Follow time of day" switch in ☰; preview with ?hour=22&month=11.
- [x] 18b. Morning dew: the first Run started 5–10 am has dew on ~6 tiles that pop as a rising arpeggio when the line passes (no score effect).
- [x] 18c. Visitors (ladybug, bumblebee, butterfly, snail; Gemini art): about one bed in three a visitor wanders along a gap on the board (gone as soon as you draw), two wander My Garden; tap for a chime and it flies away; Journal Visitors page. Looks only.
- [ ] 19. Daily board with a days-played count that never breaks (needs Supabase).

Left out on purpose: random breaking / Lucky chances, paid random packs, manual relic ordering, CRT filter.

## Phase 5 — last

- [ ] Payments (Stripe): cosmetics or a supporter pack only, never power.
