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
- [ ] Progress tied to an account (stars and unlocks survive a new phone).
- [ ] Daily board (same seed for everyone) + streak.

## Phase 4 — depth for players who get hooked

- [ ] More Boss rules (4 today) and a reward for Endless (after Season 8).
- [ ] Harder start for veterans (Season 3 start / Ascension levels).
- [ ] Build depth: remove a tile from the bag, relic synergy tags, companions with a small rule of their own.
- [ ] More unlocks (one every ~10 ⭐, board themes).
- [ ] Quick mode (a 3-minute run) — only if testers ask.
- [ ] A 10-second "how to score big" demo replacing walkthrough step 2.

## Phase 5 — last

- [ ] Payments (Stripe): cosmetics or a supporter pack only, never power.
