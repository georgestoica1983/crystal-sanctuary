/**
 * "Reduce motion": stops pulsing, shaking and bouncing. Follows the phone's
 * own setting until the player chooses in the menu.
 */
const REDUCE_MOTION_KEY = "ost_reduce_motion_v1";

export function loadReduceMotion(): boolean {
  try {
    const saved = window.localStorage.getItem(REDUCE_MOTION_KEY);
    if (saved !== null) return saved === "1";
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

export function saveReduceMotion(on: boolean): void {
  try {
    window.localStorage.setItem(REDUCE_MOTION_KEY, on ? "1" : "0");
  } catch {
    // Ignore storage errors
  }
}

/** Marks the page so CSS animations (pulse, shake…) stop too */
export function applyReduceMotion(on: boolean): void {
  document.documentElement.classList.toggle("reduce-motion", on);
}
