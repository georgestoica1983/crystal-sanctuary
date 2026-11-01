// One size for the game's text and controls, worked out from the screen.
// The smallest phones keep the designed size (1); bigger phones, foldables
// and tablets grow it up to 1.4 so nothing looks tiny in a sea of space.
// The board is never zoomed: it simply fills the height that is left.
//
// The scale is written to the CSS variable --ui-zoom on <html>; elements with
// the .ui-zoom class read it (see globals.css).

/** Biggest scale (12px text becomes about 17px) */
const MAX_SCALE = 1.4;

/** The game column's widest size in px (the board can grow this big) */
export const GAME_COLUMN_MAX = 520;

/** Narrowest column the top card and the four buttons still fit in, at scale 1 */
const NARROWEST_COLUMN = 290;

/** Height of the run screen's top card, hint and buttons at scale 1 (they zoom) */
const RUN_CHROME_HEIGHT = 233;

/** Page padding and the gaps between them (these don't zoom) */
const RUN_FIXED_HEIGHT = 46;

/** The board may give up this much of its width so the text can grow */
const BOARD_GIVE = 0.95;

export function computeUiScale(width: number, height: number): number {
  const column = Math.min(width - 16, GAME_COLUMN_MAX);
  // Room across: text grows until the top card and buttons would run out of width
  const byWidth = column / NARROWEST_COLUMN;
  // Room down: the top card, hint and buttons must leave the board almost full size
  const byHeight = (height - RUN_FIXED_HEIGHT - column * BOARD_GIVE) / RUN_CHROME_HEIGHT;
  const scale = Math.min(byWidth, byHeight);
  return Math.round(Math.max(1, Math.min(MAX_SCALE, scale)) * 100) / 100;
}

/** Keep --ui-zoom up to date with the window size; returns a cleanup */
export function watchUiScale(): () => void {
  const apply = () => {
    // The layout size (not the pinch-zoomed or keyboard-shrunk visual size)
    document.documentElement.style.setProperty("--ui-zoom", String(computeUiScale(window.innerWidth, window.innerHeight)));
  };
  apply();
  window.addEventListener("resize", apply);
  return () => {
    window.removeEventListener("resize", apply);
  };
}
