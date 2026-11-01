# Gemini prompt: 4 garden visitors

Attach `design/gemini-garden-plants.webp` as the style reference. Save the result as `design/gemini-visitors.webp`, then cut it with:

```
node scripts/cut-icon-sheet.cjs design/gemini-visitors.webp visitors
```

---

Create 4 tiny garden visitor illustrations for my calm mobile garden game Bloomline, in exactly the same style as the attached sheet: the same painterly-but-clean look, soft natural colours, light from the upper left, gentle outline and level of detail. They wander across the player's garden and game board as small moments of delight, so they should feel friendly, cute but not cartoonish, and calm.

**Layout (important, the image is cut by a script):**
- One square image, a grid of **2 columns × 2 rows**: 4 equal square cells.
- Every cell has the **same flat, plain, dark moss-green background** (#151D18): no texture, no gradient, no frame, no border, no grid lines, no shadow outside the creature, no ground, no leaves or flowers around it.
- One creature per cell, centred, filling about 60% of the cell, with clear empty space around it.
- No text, no letters, no labels.

**The 4 visitors, in this exact order (left to right, top row first):**
1. **Ladybug**: seen from above, walking, round red shell with black spots, tiny legs and antennae visible.
2. **Bee**: a soft, fuzzy bumblebee seen from the side in flight, wings slightly blurred, gentle golden-and-brown stripes.
3. **Butterfly**: seen from above with wings open, pale blue and lilac wings with soft cream spots.
4. **Snail**: seen from the side, a cream-and-amber spiral shell, eyes up on soft stalks, a faint shiny trail behind it.

**Constraints:**
- Each must read clearly at 28 px: one strong silhouette.
- Facing right (they will be mirrored in code when walking left).
- Calm and natural, never neon.
