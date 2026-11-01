// How many Garden Runs this device has started. Teaching notes (like "half
// this line would score…") fade out after the first few Runs.

const RUNS_STARTED_KEY = "ost_runs_started_v1";

export function runsStarted(): number {
  try {
    return Number(window.localStorage.getItem(RUNS_STARTED_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function countRunStarted(): void {
  try {
    window.localStorage.setItem(RUNS_STARTED_KEY, String(runsStarted() + 1));
  } catch {
    // Ignore storage errors
  }
}

/** Teaching notes show in a player's first two Runs */
export const TEACHING_RUNS = 2;
