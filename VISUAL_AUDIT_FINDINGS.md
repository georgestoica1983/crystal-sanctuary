# Visual audit: findings (no fixes yet)

Checked on 2026-11-03 in the browser pane at 375×812, plus 320×568, 430×932, 768×1024 and 812×375 landscape.

## A. Overlaps and broken layouts (fix first)

| # | Screen | Size | What's wrong | Proposed fix |
|---|---|---|---|---|
| A1 | Run HUD, score bar | all | The star roses on the score bar sit on top of the "800 to go" label. The 3-star rose covers the end of the text, and the 2-star rose touches its start. | Move "to go" outside the bar, above it or as part of the score text ("0 / 800 · 800 to go"), so the bar only carries the roses. |
| A2 | Board, warning callout ("That Thorn would take 3 Life…") | 375 | The callout is drawn over the whole top row of the board, including the Exit, which is exactly what the player needs to see. | Show the callout in the empty space between the HUD and the board, or in place of the line meter, never on the board. |
| A3 | Board, "Drag from here" pill | 375, first-visit tutorial | The pill covers the tile badge next to YOU. In the tutorial it touches the YOU label and nearly crosses the board's left edge. | Anchor it above the YOU tile, centred on it and kept inside the board. |
| A4 | Board while drawing | 375 | The floating score chip at the line head ("432") covers the number badge of the tile underneath. The direction arrows on the line also sit on top of tile number badges. | Offset the chip above the head tile. Draw the arrows below the badges, or skip them on tiles that have a badge corner. |
| A5 | Shop guide (3 coach steps) | 375 | Step 1 covers the word "Shop" in the title. Step 2 says "Tap any offer" but covers the offers row and highlights the detail card instead. Step 3 covers the offers too. | Place each coach card next to what it points at (below the offers for step 2), and never over the item it describes. |
| A6 | Run over, garden code row | 375 | "MEADOW-4821" breaks over two lines at the hyphen ("MEADOW-" / "4821"). Long words like MEADOW, HOLLOW, LINDEN, WILLOW and CLOVER all do this. | Keep the code on one line (no wrapping, slightly smaller type), and put "Challenge a friend" under it when there isn't room. |
| A7 | Run over and payout card, scroll area | 375, 320 | Content scrolls under the sticky footer with a hard cut: relic icons are sliced in half, and at 320 the "Unlocked" card is cut off. Nothing shows that more content is below. | Add a short fade above the sticky footer, and make sure the last item can scroll fully clear of it. |
| A8 | Run board | 812×375 landscape | Clear line, Swap and Hint are pushed off the bottom of the screen, and the board is cut off too. | Show a "turn your phone upright" card in landscape on phones, or lock the layout so the board shrinks to fit. |
| A9 | Run board | 320×568 | The action buttons sit about 9px from the bottom edge, and the board is only about 10px above them. It's cramped, and on phones with a home bar they would sit under it. | Use the bottom safe-area inset, and take space from the gap above the board instead (see B1). |
| A10 | Payout card, Run over, Leaderboard | all | The modal card starts about 15px from the top of the screen. There's no top safe-area allowance, so on notch phones it can run under the status bar. | Add the safe-area inset to the top padding of the full-height cards. |

## B. Misalignments and inconsistencies

| # | Screen | What's wrong | Proposed fix |
|---|---|---|---|
| B1 | Run board | The board isn't vertically centred: about 90px of empty space above it, about 60px below at 375 (and about 70/50 at 430). | Centre the board between the HUD and the buttons, or pin it to the buttons and let the HUD absorb the slack. |
| B2 | Board highlights | Gold borders mean three different things: the Exit, YOU, and the hinted tile. The hint is also white on some board themes. | Give the hint its own style, such as a soft pulsing glow with the ✦, and keep gold for the Exit and YOU. |
| B3 | Action buttons | "Clear line" has no icon while Swap and Hint do. Hint's label is gold while the others are white. The Swap label sits about 2px higher than the others. | Same layout for all three: icon plus label, one text colour, one baseline. Use colour only for the disabled state. |
| B4 | New Run sheet, Companion cards | In the same row, Keeper's content is vertically centred while Otter's is top-aligned, so the names and stats sit at different heights. The Sprite text wraps awkwardly ("(they give ✂)" on its own line). | Top-align every card's content with one fixed header layout, and shorten the Sprite text. |
| B5 | New Run sheet | When a garden code is typed in, the Start button scrolls out of view. | Make the Start and Not now buttons sticky at the bottom of the sheet, as on the Run over card. |
| B6 | Today's garden button (New Run sheet and Run over) | The "not played yet" dot floats in the top-right corner, not aligned with the title. | Put the dot inline after the title, or as a small "New today" pill like the Journal's "4 new". |
| B7 | Menu and Looks sheets | The sheet's height changes when switching tabs (Play/Settings, Companions/Line colour/Board), so the top edge jumps by 20 to 60px. | Give each sheet one fixed height, set by its tallest tab, and scroll inside it. |
| B8 | Looks, Line colour and Board tabs | Unlock hints are cut off: "Reach…", "Beat the…", "Fill 50% of…", "Fill the…". Star costs wrap onto their own line ("40" / "⭐"). Card heights vary. | Use short, complete unlock labels that fit in 2 lines, keep the number and ⭐ together, and use equal card heights. |
| B9 | Shop offers row | Prices are a dark circle badge on three cards but plain text on "Prune a tile". The badges sit over the art's top-right corner. The prune card is a different width at 320. | Use one price chip for every offer (with the seed icon), placed below the art or in a corner that's kept clear. Make all four cards equal width. |
| B10 | Shop | At 375 "Garden Shop" wraps onto two lines because of the ? and Seeds buttons. The eyebrow "Season 1 · Small Garden…" is truncated. "Up next: … target 1,5…" is truncated, and the target is the part that matters. "Relics 0/5" wraps. | One-line title, a shorter eyebrow ("Season 1 · Small bed cleared"), "Up next" wrapping to 2 lines instead of truncating, and "Relics 0/5" on one line. |
| B11 | Shop detail | The headline repeats the body ("Interest can reach +10" and then "Interest can pay up to +10…"). | Show only one of the two. |
| B12 | Seeds icon | The Shop guide uses 🌱 for Seeds while every other screen uses the seed-bag icon. | Use the seed-bag icon everywhere. |
| B13 | Stars | Three star styles: drawn art (payout header), text ★☆ (season track), and the ⭐ emoji (unlock lines, Next goal). | Use one star icon, the art version, everywhere. |
| B14 | Close and back controls | Each screen does it differently: "Done" at the bottom (menu, Looks), "Not now" (New Run), "Close" at top right (Leaderboard, Rules), "Skip" at top right (Rules), "← Back to my Run" as a full card (Help), "‹ Back to the game" at top left (Journal). | Pick one pattern for sheets (bottom "Done") and one for full screens (top-left back), and apply it everywhere. |
| B15 | Pagination | The Journal uses round chevron buttons with dots. Prune uses "← Back · 1 of 2 · More →". Rules uses "← Back / Next →". | One pager component everywhere. |
| B16 | Arrows in buttons | "Start with Keeper →", "Next→" and "Enter the Shop … →" have the arrow glued to the text or spaced differently. | Same arrow icon and gap in every button. |
| B17 | Number formats | Run over shows "1.23M" next to "98,765", and the Daily card shows "345.7K". The leaderboard shows "65,091". | Full numbers with commas everywhere they fit. Abbreviate only above a million, and then the same way on every screen. |
| B18 | Run over, order | "Your best Garden Run yet!" sits at the very bottom, under the garden code. It's the headline moment. | Move it up under the title. |
| B19 | Payout card | "23,450 / 4,000 · ✨ New best! Perfect Garden Bed!" wraps with "Bed!" alone on the second line. "→ Season 2" is tiny and pushes the bed track off centre. | Put the score and "New best" on separate lines, and centre the track, with "Season 2" under it or dropped. |
| B20 | Journal tabs | The chip row is hard-clipped at both edges with no hint that it scrolls. | Add an edge fade, or wrap the chips onto two rows. |
| B21 | Journal entries | Names are truncated ("Bramble H…", "Desert Blo…"). The "NEW" pill covers the top of the art. | Allow 2-line names, and tuck the NEW pill into the corner outside the art. |
| B22 | Boss intro | The name and rule sit straight on the busy board with a light scrim, so tile badges show through the text. | Use a darker scrim behind the text, or a card under the title and rule. |
| B23 | Tablet 768 | The HUD and buttons stretch to the full width (about 720px) while the board is about 420px, and the bottom third is empty. | Cap the HUD and buttons at the board's width and centre the whole column. |
| B24 | Leaderboard | The full-height panel has one row and a lot of empty space. The row card's left edge (10px) doesn't match the header text (16px). | Size it to fit its content, and use one inner gutter. |
| B25 | Icons | Emoji (🏆 ✏️ 🥇 🎓 📖 🧿 👀 🎨 🎉) are mixed with the drawn icon set. The Rules "Relics" page uses 🧿. | Swap the emoji in headings and buttons for drawn icons, or at least use them consistently. |

## C. Fine polish

| # | Screen | What's wrong |
|---|---|---|
| C1 | Line meter | The "Vine!" pill sits on the card's top border. The "×" sits higher than the Value and Length numbers. The Value/Length card leaves the right half empty. |
| C2 | Line meter warning | "❤−10" next to "you have 3" reads as a contradiction. Reword it so both numbers mean the same thing. |
| C3 | Menu | The Journal card has a "4 new" pill where the other cards have a subtitle. The Seedling card's "⭐ 8" has no label. "Tile bag: 0 tiles left" in the first bed looked wrong, so I'll check it. |
| C4 | Settings | "Reduce motion" touches its card's right edge. The last row has one lone card. "Set music" is unclear next to "Music". |
| C5 | Help | Orphans: "wait." and "minutes." alone on their lines. |
| C6 | Rules guide | Page 1 has a large empty gap above the content. The "RULES" label style is used nowhere else. |
| C7 | Saved for later | Text runs edge to edge with a 16px gutter, while the other cards use 24 to 32px. |
| C8 | Daily result card | The legend always shows "🥀 stopped here", even when every bed bloomed. "Share your garden" uses an olive style not seen on other secondary buttons. |
| C9 | Tip card | It uses a 24px outer gutter, while other modals use 16px. |
| C10 | /tutorial page | It's still reachable by URL and uses the old words and look (Sanctuary, Archway, Magic, Dew, Briars) in black and gold. Remove it or redirect it to the game. |
| C11 | Payout and Run over | The text "Reached" is lighter than the other row labels. |

## Not covered yet

I couldn't reach these in this pass, so they still need a look:
- the Gardener gift card, the Boss beaten card and the Legendary award;
- weather on a bed, the skip-a-bed sheet and using a tool on a tile;
- the sound prompt, Endless and high Ascension states, and full relic slots with selling.

Also, the browser pane often lagged while animating, so a few states were judged from the page layout rather than a picture.

## Suggested fix steps

1. **Run screen layout:** A1, A2, A3, A4, A8, A9, B1, B2, B3. ✅ Done.
   - A8 and A9 were already handled: touch phones held sideways get a "Turn your phone upright" screen, and the buttons sit above the home bar.
   - B2 was a misread: the gold ✦ tile is a Golden special tile, not the hint. It now carries a "✦ +30" tag.
   - Also fixed: the "why" chips on a stopped line ("❤️ +1", "−3 ❤️") now sit in the tile's free bottom-left corner.
2. **End screens:** A6, A7, A10, B17, B18, B19, C8, C11. ✅ Done.
   - A10 was already handled: every full-screen pop-up gets the notch inset.
   - B17: scores show full digits up to a million everywhere. The score bar keeps its short form (23.5K) because it has to fit beside the roses.
3. **Shop:** A5, B9, B10, B11, B12. ✅ Done.
   - The eyebrow and "Up next" use the short bed names ("Season 1 · Small bed ✓", "Season 1 · Big bed · target 1,500").
4. **Sheets:** B4, B5, B6, B7, B8, B14, B15, B16. ✅ Done.
   - Locked Looks tiles are dimmed with a short requirement ("40 ⭐", "Ascension 6", "Journal 50%"). The full sentence is the tooltip and the screen-reader label.
5. **Journal, Boss, tablet and leaderboard:** B20, B21, B22, B23, B24.
6. **Icons and stars:** B13, B25.
7. **Polish:** C1–C10, then a second pass over the "Not covered yet" list.
