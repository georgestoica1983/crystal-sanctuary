# Bloomline backlog

Things that are ready in code but wait on a setup step, plus work planned for later.

## Waiting on setup (your part)

- [ ] **Feedback form** — create a Google Form ("Bloomline feedback": how do you score points · what do Shears, Gloves and Acorns do · when were you confused · what felt satisfying · play again tomorrow? · how far did you get · phone model), copy its forms.gle link.
- [ ] **PostHog** — free account (EU region), project "Bloomline", copy the `phc_…` Project API key.
- [ ] **Vercel** — Settings → Environment Variables: `NEXT_PUBLIC_FEEDBACK_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`, then Redeploy. Check one line shows up in PostHog → Activity.
- [ ] **Real tester round** — send the link to 10–15 new players; mention anonymous gameplay stats.
- [ ] **Rename the GitHub repo** to `bloomline` (optional).

## Phase 3 — online and habit (needs a free Supabase account)

- [ ] Online leaderboard with player names, and a share-your-score image.
  - When setting up Supabase, run **all** migrations in `supabase/migrations/` in date order (20261030 adds the Ascension level, 20261031 the companion).
- [ ] Progress tied to an account (stars and unlocks survive a new phone).
- [ ] Daily board (same seed for everyone) + streak.

## Phase 4 — depth for players who get hooked

- [x] More Boss rules (now 8) and a reward for Endless (after Season 8).
- [x] Harder start for veterans: Ascension levels 0–6.
- [ ] Build depth:
  - [x] ✂️ Pruning Shears in the Shop: remove one tile from the bag (rules v9).
  - [x] Relic theme tags (Thorns, Acorns, Berries & Gloves, Shears, Long lines, Careful, Growing, Seeds, Any build) + "Fits your build" mark.
  - [x] Relic sets: 3 relics with one tag score every line ×1.25 (rules v10), with Shop progress, a HUD set chip and help text.
  - [x] Companions with their own rule: pick Keeper / Otter / Sprite / Fox per run, Companions & looks screen, leaderboard emoji.
- [x] More unlocks: board themes (Autumn, Night Garden, Winter Frost, Golden Hour, Royal Garden), Blossom / Sunset / Starlight / Ember lines, Star Gardener rank, next-unlock line.
- [ ] Quick mode (a 3-minute run) — only if testers ask.
- [x] A 10-second "how to score big" demo opening walkthrough step 2 (skip, watch again, still card with reduce motion).

## Design and sound (now)

- [x] Art direction: moss look, illustrated tiles, companions, stats, relic themes and all 36 relics.
- [ ] Leftover emoji: Shop boosts, score tally labels, welcome screen, companion picker.
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
- [ ] 9. Echo (Red Seal): the tile scores twice.
- [ ] 10. ~8 new relics: score-again (first tile twice, Thorns twice, Echo ×3) and rule-benders (cross yourself once, Spikes never hurt, Exit = Acorn, diagonal = 2 Length, Berries count as Thorns).
- [ ] 11. Skip a Small/Big bed for a Tag (free Rare relic, Edition on next item, +25 Seeds after Boss, free Fertilizer); no reward, interest, Shop or growth that bed.
- [ ] 12. Garden upgrades (Vouchers), one per Season, two tiers: Deep Roots → Old Oak (interest cap 10 → 20), Market Day → Harvest Fair (−25% → −50%), Almanac → Observatory.
- [ ] 13. Rerolls start at 5 Seeds, +1 each in the same Shop.
- [ ] 14. Boss check-up across 5 kinds (tile blockers, line rules, hidden tiles, taxes, finishers); show the Season's Boss in advance.

**C — come back (no rules change)**
- [ ] 15. My Garden: a permanent garden that only grows from cleared beds; nothing dies.
- [ ] 16. Garden Journal: relics, Fertilizers, tools, Editions, Bosses, sets, companions; empty slots show their unlock goal.
- [ ] 17. Music grows: each completed set adds a permanent music layer.
- [ ] 18. Time of day (dew, Night Garden after dark) and tappable visitors — cosmetic.
- [ ] 19. Daily board with a days-played count that never breaks (needs Supabase).

Left out on purpose: random breaking / Lucky chances, paid random packs, manual relic ordering, CRT filter.

## Phase 5 — last

- [ ] Payments (Stripe): cosmetics or a supporter pack only, never power.
