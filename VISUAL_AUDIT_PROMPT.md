# Visual polish audit: Bloomline

## The goal

Act as a meticulous, detail-obsessed product designer doing the final pass before ship. Go through every screen, sheet, card and overlay in Bloomline and find anything that looks inconsistent, misaligned, cramped, clipped or overlapping. Fix each one, or find a better solution where a simple fix isn't enough. Everything must look deliberate and finished, and everything must still work as well as it does now.

The rule above all others: **nothing may overlap anything it shouldn't**. That covers text over text, buttons over content, sticky footers over the last line, toasts over controls, and art over labels, on every screen size.

## Where and how to look

- Project: `/Users/georgeflorinstoica/Downloads/1 stroke tactician game app` (Next.js 15, React 19, Tailwind, framer-motion).
- Check in the browser pane against the local dev server at `localhost:3000`.
- Primary size is **375×812** (the iPhone baseline). Also check:
  - **320×568**, the smallest supported phone, where things break first;
  - **430×932**, a large phone;
  - **768×1024**, a tablet, to make sure nothing stretches or floats oddly;
  - one short landscape-ish height, such as 812×375, to see what happens when the height runs out.
- Animations are paused while the pane is hidden. Before screenshots, force `.ui-zoom *` to opacity 1 and no transform. Then also check real motion: nothing should jump, overlap mid-animation or land in the wrong place.
- To reach states that are hard to play into (Boss beds, full relic slots, long names, big numbers, the Daily result), add a temporary `window.__x` test hook in `page.tsx`, or edit localStorage from a non-game page with backups. Remove every temporary hook before committing.

## What to check on every surface

1. **Overlap and clipping**
   - No element covers another: the HUD, board, line meter, score tally, tips, toasts, modals or sticky footers.
   - No text is cut off, truncated without an ellipsis, or pushed outside its card.
   - The last item in a scrolling sheet can be scrolled fully clear of the sticky footer and the home indicator (safe areas).
   - Stacking order (z-index) makes sense when two layers show at once, for example a tip over the Shop, a toast over a modal, or the Saved for later overlay over the payout card.
2. **Alignment**
   - Every item sits on a shared edge or centre line. Icons are vertically centred with their text, numbers in a column line up, and badges sit at the same spot on every card.
   - Left and right gutters are the same on every screen (16px unless there's a reason).
   - Rows of buttons have equal heights and spacing. Single buttons are centred or full width, never in between.
3. **Spacing**
   - One spacing scale, used everywhere. The gaps between title, body and buttons follow the same rhythm on every card and sheet.
   - Padding inside cards matches across similar cards (Shop offers, relic cards, Journal entries, tip cards, result cards).
4. **Typography**
   - Every type role (title, subtitle, body, label, number, hint) has one consistent size, weight, colour and font, everywhere.
   - The handwritten font is used only where it's intentional.
   - No widows or orphans in short titles, and no awkward line breaks in buttons.
   - Long text (long relic names, big scores like 1,234,567, long garden codes, other languages if any) still fits.
5. **Colour and contrast**
   - The same meaning uses the same colour everywhere: Seeds, Life, stars, danger, success and disabled.
   - Text meets readable contrast on its background, including over art.
   - Disabled buttons look disabled the same way everywhere.
6. **Icons and art**
   - Icons are the same visual size and weight within a row, and none look blurry, stretched or off-centre.
   - Art isn't pixelated at 2× and 3×.
   - Emoji and drawn icons aren't mixed where one style is expected.
7. **Buttons and touch targets**
   - Every tappable thing is at least 44×44 and looks tappable.
   - Primary, secondary and text buttons are styled the same way across the game.
   - Close and back buttons are always in the same place.
8. **States**
   - Check every screen empty, typical and maxed out: zero Seeds and lots of Seeds, no relics and full slots, Season 1 and late Ascension, first Run and many Runs, every Companion.
   - Check loading, disabled, pressed and selected states too.
9. **Motion**
   - Transitions don't overlap or flash content underneath.
   - Nothing slides in under something else.
   - Score counters don't change width and nudge their neighbours while they count.
10. **Consistency of wording on screen**
    - The same thing has the same name everywhere (Run, bed, garden, Season, Seeds, Life).
    - Capitalisation and punctuation follow one style.
    - No em dashes in player-facing text.

## Surfaces to cover (all of them)

- Intro splash, sound prompt, the move page.
- Home and the start of a Run, the New Run sheet (Ascension picker, Companion choice, Today's garden button, garden code field).
- The tutorial and tutorial coach, and the Run guide.
- The Run board: HUD, grid, line drawing and head feedback, line meter, line score show, score tally and line comparison, Boss moments, weather, Spikes and other tile intros.
- Tip cards, toasts and notices.
- Garden clear (payout) card, including Boss beds and "Stop here, resume later".
- The Saved for later overlay.
- The Shop: relics, Fertilizer, tools, special tiles, upgrades, selling, prune card, rerolls, full slots.
- The Gardener card, the Sanctuary, Looks.
- Run over: Next goal card, closer line, Daily result card and share grid, Challenge a friend row, Saved data.
- The leaderboard.
- The Journal, every page including the Tips page.
- Every confirm dialog and small modal in `Modals.tsx` and `SheetBits.tsx`.

## How to work

1. **Audit first, change nothing.** Take a screenshot of each surface at each size, and write down every issue with:
   - the screen;
   - the size;
   - what's wrong;
   - why it matters;
   - the proposed fix.

   Sort them: overlaps and broken layouts first, then misalignments and inconsistencies, then fine polish.
2. **Show me the list and wait for my yes** before fixing anything. Group fixes into small steps, and ask me before each step.
3. **Fix the cause, not the symptom.** Where the same problem shows up in many places, fix it once in a shared style or component, such as a common card, button or sheet layout, rather than patching each screen.
4. **Don't change how the game plays.** Scoring, rules, saves and replays must stay exactly the same, and no layout change may break a tap, a drag or the line drawing.
5. **Verify each step** by retaking the before screenshots at every size, side by side with the after, and play a short Run to confirm nothing broke. Then run the build and commit locally. Push only when I ask.

## Done means

- Every surface on the list has been checked at every size, in every state that matters.
- Nothing overlaps or clips, anywhere.
- Spacing, type, colour, icons and buttons follow one consistent system across the game.
- The game plays exactly as before, the build passes, and the replay check passes.
