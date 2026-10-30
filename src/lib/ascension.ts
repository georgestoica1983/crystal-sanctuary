import { RUN_MAX_ASCENSION } from "@/lib/runReplay";

/**
 * Ascension progress on this device: the highest level unlocked (clear the
 * Season 3 Boss at a level to unlock the next) and the level last chosen.
 */
const UNLOCKED_KEY = "ost_asc_unlocked_v1";
const CHOSEN_KEY = "ost_asc_chosen_v1";
const CLEARED_KEY = "ost_asc_cleared_v1";

/** The Season 3 Boss Garden Bed (0-based run position) */
export const ASCENSION_UNLOCK_BED = 8;

const read = (key: string): number => {
  try {
    return Math.max(0, Math.min(RUN_MAX_ASCENSION, Number(window.localStorage.getItem(key)) || 0));
  } catch {
    return 0;
  }
};

export const loadUnlockedAscension = () => read(UNLOCKED_KEY);
export const loadChosenAscension = () => Math.min(read(CHOSEN_KEY), loadUnlockedAscension());

export function saveChosenAscension(level: number): void {
  try {
    window.localStorage.setItem(CHOSEN_KEY, String(level));
  } catch {
    // Ignore storage errors
  }
}

/** Clearing the Season 3 Boss at `level` unlocks the next one; returns it if new */
export function unlockAscensionAfter(level: number): number | null {
  const next = Math.min(RUN_MAX_ASCENSION, level + 1);
  if (next <= loadUnlockedAscension() || level >= RUN_MAX_ASCENSION) return null;
  try {
    window.localStorage.setItem(UNLOCKED_KEY, String(next));
  } catch {
    return null;
  }
  return next;
}

/** Highest level whose Season 3 Boss has been cleared (0 = none above Normal) */
export const loadBestClearedAscension = () => read(CLEARED_KEY);

export function recordAscensionCleared(level: number): void {
  if (level <= loadBestClearedAscension()) return;
  try {
    window.localStorage.setItem(CLEARED_KEY, String(level));
  } catch {
    // Ignore storage errors
  }
}
