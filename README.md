# Bloomline

*A one-line garden roguelike: draw one unbroken line to the Exit, clear Garden Bed after Garden Bed, and see how far your Garden Run goes.* (Originally prototyped as "1-Stroke Tactician".)

**Minimalist Path-Drawing Dungeon Auto-Battler (Mobile-First PWA)**

Blends the single-line drawing mechanic of *Threadline* with the tactical grid resolution of *Forward: Escape the Fold*. Draw a single continuous orthogonal/diagonal stroke from the **Hero (`⚪`)** to the **Exit Portal (`🟣`)** across a 5×5 grid, previewing exact combat outcomes in real time before releasing to trigger the step-by-step Auto-Battle Resolution phase.

## Architecture & Modules

- [`src/types/game.ts`](./src/types/game.ts) — Grid types, Entity interfaces, Modifier enums, and Run state.
- [`src/lib/audio.ts`](./src/lib/audio.ts) — Zero-dependency Web Audio API procedural sound synthesizer (sine/triangle/sawtooth/noise envelopes for swipe ticks, shield clinks, glass shatter, sword hits, victory chords) + `navigator.vibrate` haptics.
- [`src/lib/engine.ts`](./src/lib/engine.ts) — Pure deterministic path validation, step-by-step combat math, modifier rule hooks, `mulberry32` seeded PRNG generator, playability verifier, and Wordle-style spoiler-free ASCII/Emoji share card generator.
- [`src/lib/supabase.ts`](./src/lib/supabase.ts) — `localStorage` persistence for streaks, pass unlocks, and daily history + Supabase client for daily leaderboard submissions.
- [`src/app/api/generate-dungeon/route.ts`](./src/app/api/generate-dungeon/route.ts) — Gemini 1.5 Flash (`@google/generative-ai`) structured JSON output endpoint (`responseSchema`) with automatic deterministic offline fallback.
- [`src/components/GridCanvas.tsx`](./src/components/GridCanvas.tsx) — Pointer gesture controller (`touch-action: none`) with diagonal-safe inner hit detection, illuminated SVG vector path with directional chevrons, and live ghost-HP simulation.
- [`src/components/HUD.tsx`](./src/components/HUD.tsx) — Top status bar, active modifier rule tooltip, live projected outcome pill, and bottom geometric legend & controls.
- [`src/components/Modals.tsx`](./src/components/Modals.tsx) — Victory/Defeat summary with 1-click Wordle share card, Daily Leaderboard, and the Monetization / Custom AI Dungeon Crafter drawer with developer pass simulator toggle.

## Getting Started

```bash
npm install
npm run dev
```

## Expansion Purchases (Stripe + Supabase)

The Daily is free. The one-time $3.99 Expansion (extra companions, the Ten-Garden Trail, past Dailies, all cosmetics, and the AI Garden Crafter at 3 crafts/day) is sold through Stripe Checkout and only unlocked after the server confirms payment.

1. **Supabase:** run [`supabase/migrations/20261019_expansion_purchases.sql`](./supabase/migrations/20261019_expansion_purchases.sql) in the SQL editor. Under Authentication → URL Configuration, add your site URL to the redirect allow-list (used by "Restore purchase" magic links). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
2. **Stripe:** create a product with a one-time $3.99 price and set `STRIPE_PRICE_ID` and `STRIPE_SECRET_KEY`. Add a webhook endpoint at `https://<your-site>/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and set `STRIPE_WEBHOOK_SECRET`.
3. **Local testing:** `stripe listen --forward-to localhost:3000/api/stripe-webhook` prints a `whsec_...` secret to use locally; pay with test card `4242 4242 4242 4242`.

How it works: each device gets an anonymous player ID. `/api/checkout` creates the Checkout session; `/api/stripe-webhook` (and `/api/entitlement` on return from Stripe) record the purchase in `entitlements`. "Restore purchase" emails a Supabase magic link and links the new device to the purchase made with that email. `/api/generate-dungeon` (Crafter) checks the purchase and a per-purchase limit of 3 crafts per day.

Without these keys, the buy button shows "Purchases aren't open yet", and in local development (`npm run dev`) a **Dev only: simulate purchase** toggle unlocks everything. That toggle is hidden and ignored in production builds.

## Run Leaderboard (Supabase)

Every player's best Run, ranked by points, shown from the 🏆 button.

1. In the Supabase SQL editor, run [`supabase/migrations/20261020_run_leaderboard.sql`](./supabase/migrations/20261020_run_leaderboard.sql).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (the same ones the Expansion uses) and restart the server.

How it works: the game sends a score to `/api/run-leaderboard` when a garden blooms (a checkpoint) and when a Run ends; Practice Garden runs never count. The server keeps one row per anonymous player id and only replaces it when the new score is higher. The table has RLS on with no public policies, so only the server reads and writes it, and player ids are never returned to other players. The open leaderboard refreshes every 15 seconds. Without the keys, the board shows "Not connected yet" and this device's best Run.

**Verified scores.** Every submission carries the Run's action log: the run seed, the Companion, and in order each stroke's path, each Weed-out's tiles and each Shop action (buy / reroll / leave). The server rebuilds the Run from the seed with the same engine and rule helpers the game uses ([`src/lib/runReplay.ts`](./src/lib/runReplay.ts)) and stores the replayed score, never the client's. A log with an illegal step, a line that doesn't reach the Archway alive, too many strokes or Weed-outs, an unaffordable or unknown purchase, the Practice Garden seed, or a score that doesn't match the replay is refused with `400`. This stops forged scores; it can't stop a player from finding good lines with outside help, and a known seed can be replayed.

Check it with `npm run check:replay`: it replays the Runs recorded from the real game in `scripts/fixtures/` (they must match the score the game showed), plays a few seeded bot Runs, and confirms a set of tampered logs are refused. To add a fixture, copy the JSON body of a `/api/run-leaderboard` POST from the browser's network tab into a new file there.
