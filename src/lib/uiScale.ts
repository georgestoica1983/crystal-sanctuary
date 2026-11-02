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

/** The three-column layout for wide screens (same test as the CSS in globals.css) */
export function isWideLayout(width: number, height: number): boolean {
  return width >= 1100 && height >= 640 && width > height;
}

export function computeUiScale(width: number, height: number): number {
  // Wide screens: the side columns grow with the window, gently (the board takes the middle)
  if (isWideLayout(width, height)) {
    return Math.round(Math.max(1, Math.min(1.25, width / 1200, height / 700)) * 100) / 100;
  }
  const column = Math.min(width - 16, GAME_COLUMN_MAX);
  // Room across: text grows until the top card and buttons would run out of width
  const byWidth = column / NARROWEST_COLUMN;
  // Room down: the top card, hint and buttons must leave the board almost full size
  const byHeight = (height - RUN_FIXED_HEIGHT - column * BOARD_GIVE) / RUN_CHROME_HEIGHT;
  const scale = Math.min(byWidth, byHeight);
  return Math.round(Math.max(1, Math.min(MAX_SCALE, scale)) * 100) / 100;
}

/** Height of the Shop card at scale 1 (header, offers, details, relics, buttons) */
const SHOP_HEIGHT = 600;

/** Keep --ui-zoom up to date with the window size; returns a cleanup */
export function watchUiScale(): () => void {
  const apply = () => {
    // The layout size (not the pinch-zoomed or keyboard-shrunk visual size)
    const ui = computeUiScale(window.innerWidth, window.innerHeight);
    document.documentElement.style.setProperty("--ui-zoom", String(ui));
    // The Shop is about SHOP_HEIGHT tall at scale 1: keep it inside the screen
    const fit = Math.floor(((window.innerHeight - 32) / SHOP_HEIGHT) * 100) / 100;
    document.documentElement.style.setProperty("--card-zoom", String(Math.max(1, Math.min(ui, fit))));
  };
  apply();
  window.addEventListener("resize", apply);
  return () => {
    window.removeEventListener("resize", apply);
  };
}
