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
  - When setting up Supabase, run **both** migrations in `supabase/migrations/` (the 20261030 one adds the Ascension level column).
- [ ] Progress tied to an account (stars and unlocks survive a new phone).
- [ ] Daily board (same seed for everyone) + streak.

## Phase 4 — depth for players who get hooked

- [x] More Boss rules (now 8) and a reward for Endless (after Season 8).
- [x] Harder start for veterans: Ascension levels 0–6.
- [ ] Build depth:
  - [x] ✂️ Pruning Shears in the Shop: remove one tile from the bag (rules v9).
  - [x] Relic theme tags (Thorns, Acorns, Berries & Gloves, Shears, Long lines, Careful, Growing, Seeds, Any build) + "Fits your build" mark.
  - [ ] Optional: set bonus for 3 relics with the same tag (rules change).
  - [ ] Companions with a small rule (reuse the 4 hero classes; decide whether companions stay "looks only").
- [ ] More unlocks (one every ~10 ⭐, board themes).
- [ ] Quick mode (a 3-minute run) — only if testers ask.
- [ ] A 10-second "how to score big" demo replacing walkthrough step 2.

## Phase 5 — last

- [ ] Payments (Stripe): cosmetics or a supporter pack only, never power.
