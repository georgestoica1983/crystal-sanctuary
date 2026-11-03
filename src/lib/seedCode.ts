/**
 * Garden codes: a Run's seed written as a word and four digits (MOSS-4821),
 * easy to read out or type. The code is the seed itself, so the same code
 * grows the same beds, Shops and Bosses for anyone who plays it.
 */
const WORDS = [
  "MOSS", "FERN", "IVY", "ROSE", "SAGE", "MINT", "OAK", "ELM",
  "ASH", "YEW", "LILY", "IRIS", "TULIP", "DAISY", "POPPY", "THYME",
  "BASIL", "CLOVER", "ACORN", "BERRY", "THORN", "BRIAR", "PETAL", "BLOOM",
  "SEED", "ROOT", "BUD", "LEAF", "STEM", "VINE", "REED", "RUSH",
  "LARK", "WREN", "ROBIN", "FINCH", "BEE", "MOTH", "SNAIL", "TOAD",
  "DEW", "RAIN", "MIST", "FROST", "SUN", "MOON", "STAR", "DAWN",
  "HEDGE", "MEADOW", "GROVE", "BROOK", "POND", "GLEN", "DELL", "HOLLOW",
  "PLUM", "PEAR", "FIG", "HAZEL", "WILLOW", "ALDER", "LINDEN", "MAPLE",
];
const WORD_SET = new Set(WORDS);
const CODE = /^([A-Z]+)-(\d{4})$/;

/** A fresh code for a new Run */
export function newSeedCode(random: () => number = Math.random): string {
  const word = WORDS[Math.floor(random() * WORDS.length)];
  return `${word}-${1000 + Math.floor(random() * 9000)}`;
}

/** "moss 4821", "Moss4821" or "MOSS-4821" → "MOSS-4821"; null if it isn't a garden code */
export function normalizeSeedCode(input: string): string | null {
  const m = input.trim().toUpperCase().match(/^([A-Z]+)[\s\-_]*(\d{4})$/);
  if (!m || !WORD_SET.has(m[1])) return null;
  return `${m[1]}-${m[2]}`;
}

/** The code of a Run's seed (older Runs and the Daily Garden have none) */
export const seedCodeOf = (seed: string): string | null => (CODE.test(seed) ? normalizeSeedCode(seed) : null);

/** A link that opens the game ready to plant this code */
export const seedCodeLink = (code: string): string =>
  `${typeof window === "undefined" ? "" : window.location.origin}/?seed=${encodeURIComponent(code)}`;

// Runs started from someone else's code stay off the leaderboard (a known
// good code would otherwise be easy to farm)
const FROM_CODE_KEY = "ost_run_from_code_v1";
/** A code waiting to be planted (from a ?seed= link) */
const PENDING_CODE_KEY = "ost_pending_code_v1";

export function markRunFromCode(seed: string | null): void {
  try {
    if (seed) window.localStorage.setItem(FROM_CODE_KEY, seed);
    else window.localStorage.removeItem(FROM_CODE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function isRunFromCode(seed: string): boolean {
  try {
    return window.localStorage.getItem(FROM_CODE_KEY) === seed;
  } catch {
    return false;
  }
}

export function loadPendingCode(): string | null {
  try {
    return normalizeSeedCode(window.localStorage.getItem(PENDING_CODE_KEY) ?? "");
  } catch {
    return null;
  }
}

export function savePendingCode(code: string | null): void {
  try {
    if (code) window.localStorage.setItem(PENDING_CODE_KEY, code);
    else window.localStorage.removeItem(PENDING_CODE_KEY);
  } catch {
    // Ignore storage errors
  }
}
