# Bloomline — visual design brief

You are a senior game art director and UX designer who has shipped calm, long-lived mobile hits (think the polish of Alto's Odyssey, Monument Valley, Mini Metro, Two Dots and Balatro's satisfying scoring). Design the complete visual identity and the key mobile screens for my game, Bloomline. I want a game people open every day for months: calm to look at, deeply satisfying to play, and clean enough that nothing gets between the player and the board.

## The game in one paragraph

Bloomline is a one-line garden roguelike for phones, played in portrait. Each Garden Bed is a 5×5 board of tiles. You drag ONE continuous line from your Companion (a small animal) to the Exit gate, passing through tiles. Your line's score is Value × Length × multipliers: Value comes from the tiles you pass (Thorns, Spikes, Shears, Gloves, Berries and Acorns all carry a number), and Length is how many tiles your line visits. Long lines score far more but cost Life. You get 4 lines per bed to reach a target score. Clearing a bed pays Seeds, which you spend in a Shop on relics: lasting powers that multiply your score. Three beds make a Season (Small, Big, Boss), and targets rise each Season. A Run ends when you can't reach a target or run out of Life.

## The pieces you need to design

**Board tiles.** Each needs a symbol and a small value badge:

| Tile | What it does |
|---|---|
| Thorn | An enemy flower. Passing it costs Life equal to its number, but the number adds to your score. |
| Spike | A trap. It hurts unless you cross it diagonally. |
| Shears | Cut the next Thorn for free. |
| Gloves | Block damage. |
| Berry | Heals Life. |
| Acorn | Currency. |
| Exit gate | The goal of every line. |
| Empty soil | A plain tile. |
| Cleared Thorn | Shown as a blooming flower after the line passes. |

**Companions** (the line starts on them):
- Keeper (a cat)
- Otter
- Fox
- Sprite (a butterfly)

**Player stats** (always visible): Life (hearts), Gloves, Shears, Seeds.

**Relics.** There are 36 relics in 9 themes: Thorns, Acorns, Berries & Gloves, Shears, Long lines, Careful, Growing, Seeds and Any build. A set of 3 relics with the same theme gives ×1.25. I need a relic frame plus a symbol language that makes each theme recognisable at 32 px.

**Other screens:**
- The live score meter while drawing ("161 value × 22 length ×3.75 = 13,283").
- The line score tally after each line.
- The bed-cleared screen with 1–3 stars.
- The Shop.
- The run-over screen.
- The leaderboard.
- The companions and looks screen: unlockable board themes (Spring, Autumn, Night, Winter, Golden, Royal) and line colours.

## Design goals, in priority order

1. **Calm first.** A soft, low-contrast world, unhurried motion, and nothing flashing for attention. Playing should feel like tending a small garden at dusk.
2. **Satisfying rewards ("juice") where the player earned them.** The excitement lives in moments the player caused: the line growing, the score counting up, multipliers stacking, a bed bursting into bloom, a relic set clicking into place. Quiet when idle, joyful on success. Rewards always come from skill or progress, never from random flashing, fake urgency or casino tricks.
3. **Minimal.** One clear focal point per screen (the board). No emoji anywhere: use one cohesive custom icon set. Show at most 4 stats. Use plain words and generous empty space.
4. **Built for phones.**
   - Portrait at 390×844 pt, scaling cleanly from 360 to 430 pt wide.
   - Respect the notch and home-indicator safe areas.
   - The board fills the width with a 16 pt gutter. Tiles must be at least 60 pt so a thumb can drag through them accurately.
   - Primary actions sit in the bottom third, where the thumb reaches.
   - Sharp at 3× resolution.
5. **Holds up after hundreds of hours.** No visual fatigue, so avoid saturated neon and busy textures. Board themes and line colours should feel like rewards worth collecting. Make the 100th bed as pleasant as the first.

## Art direction: propose, then commit

Propose THREE distinct art directions that fit the goals. For each, give:
- a name
- a one-sentence mood
- a reference vibe
- a 6-colour palette with hex values
- why it suits hours of play

Then pick the strongest one, explain why, and use it for everything below.

The direction must work on a dark board AND a light board, read clearly at small sizes, and keep each tile type identifiable by shape alone, not just colour (colour-blind safe).

Constraints for the icon set:
- One consistent stroke weight and corner radius.
- A maximum of 3 colours per icon.
- Readable at 24 pt and beautiful at 96 pt.
- Thorns read as "danger, but valuable" (sharp silhouette, warm colour).
- Helpful tiles read as soft and round.
- The Exit gate is the brightest, most inviting shape on the board.

## Colour and type system

**Colour.** Give the palette as design tokens with hex values:
- background
- board frame
- tile plate (rest, hover and visited)
- line (default, plus 6 unlockable colours)
- text (primary, secondary, muted)
- one danger colour
- one reward/gold colour
- one success colour

Keep the base palette calm and desaturated. Save the most saturated colours for rewards only: score, multipliers, stars and set bonuses.

Check text contrast against WCAG AA.

**Type.** Choose one rounded, friendly sans for the UI and one display face for big score numbers, with tabular figures so counting numbers don't jitter. Give a type scale for:
- caption
- body
- label
- stat
- score
- hero number

## Motion and feedback

Describe each of these with duration, easing and what changes:
- **Drawing the line.** It glows softly and grows; each tile reacts with a tiny scale pulse as the line enters it. A gentle pitch rises as the line gets longer.
- **The live meter.** Value and length tick up, and multipliers pop in one by one.
- **Releasing a line.** The tally plays out as value, then × length, then × each relic, then the total, with counting numbers and a final "settle" bounce.
- **Clearing a bed.** Thorns turn into flowers in a ripple outward from the line, then stars land one at a time. Allow up to 1.5 s of celebration, always skippable by a tap.
- **Buying a relic and completing a set.** A soft card flip, a chime, and the theme colour washing across the relic row.
- **Taking damage.** A soft red vignette and a gentle shake of under 4 px. Never harsh.
- **Idle.** Very slow ambient life: drifting pollen, leaves swaying. It must stay under 5% visual energy so it never distracts.
- **Reduced motion.** Provide a mode where all of the above becomes fades and static states.

## Sound and music direction

Describe the audio identity so a composer can make it:
- **Music.** A warm, slow, looping score at 60–75 BPM: soft pads, felt piano or kalimba, light nature ambience. No strong beat, and it never becomes repetitive across a 20-minute session; suggest a layering approach.
- **Sound effects.**
  - Scoring sounds follow a rising pentatonic scale, so longer lines literally sound better.
  - Multipliers add a sparkle layer.
  - A bed clear resolves to a satisfying chord.
  - Damage is a muted, low thud.
  - Keep effects short, soft-edged and in the same key as the music.

## What to deliver

1. **Art direction.** The 3 options, your choice and the reasoning.
2. **Style guide.** Palette tokens (hex), type scale, spacing scale (4 pt grid), corner radii, shadow and elevation rules, and icon rules.
3. **Icon sheet.** Every tile, the 4 companions, the 4 stats, the 9 relic themes, and the UI icons: menu, sound, hint, swap, close, star and lock.
4. **High-fidelity mobile mockups (390×844)** for:
   - the board mid-line, with the live meter
   - the line score tally
   - the bed-cleared screen with stars
   - the Shop with 3 offers, the relic row and a set in progress
   - the run-over screen
   - the companions and looks screen
5. **Two board themes** shown side by side: the default, plus one unlockable (Night or Autumn).
6. **Motion spec table.** Moment, trigger, duration, easing, what animates and the sound cue.
7. **Things to avoid.** A short list of patterns that would break the calm or feel manipulative.

Be specific and opinionated, with exact values, not vague adjectives. Where you show a screen, label the key measurements.
