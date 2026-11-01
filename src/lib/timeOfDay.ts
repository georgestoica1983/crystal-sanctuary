// Time of day and the real seasons: the garden quietly follows the player's
// clock and calendar. Looks only — scoring never depends on the time.

export type DayPhase = "DAWN" | "DAY" | "GOLDEN" | "NIGHT";
export type YearSeason = "WINTER" | "SPRING" | "SUMMER" | "AUTUMN";

const TIME_OF_DAY_KEY = "ost_time_of_day_v1";

/** ?hour=22 or ?month=12 in the address previews another time (handy for checking the looks) */
function previewParam(name: "hour" | "month"): number | null {
  try {
    const v = new URLSearchParams(window.location.search).get(name);
    return v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
  } catch {
    return null;
  }
}

/** Dawn 5–9, day 9–17, golden hour 17–20, night 20–5 (the phone's local time) */
export function getDayPhase(date = new Date()): DayPhase {
  const h = previewParam("hour") ?? date.getHours();
  if (h >= 5 && h < 9) return "DAWN";
  if (h >= 9 && h < 17) return "DAY";
  if (h >= 17 && h < 20) return "GOLDEN";
  return "NIGHT";
}

/** Northern-hemisphere months (most players); only My Garden's ground follows it */
export function getYearSeason(date = new Date()): YearSeason {
  const m = (previewParam("month") ?? date.getMonth() + 1) - 1;
  if (m === 11 || m <= 1) return "WINTER";
  if (m <= 4) return "SPRING";
  if (m <= 7) return "SUMMER";
  return "AUTUMN";
}

/** The "Follow time of day" setting (on by default) */
export function loadFollowTimeOfDay(): boolean {
  try {
    return window.localStorage.getItem(TIME_OF_DAY_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveFollowTimeOfDay(on: boolean): void {
  try {
    window.localStorage.setItem(TIME_OF_DAY_KEY, on ? "1" : "0");
  } catch {
    // Ignore storage errors
  }
}

/** The light laid over the board for each phase (a soft gradient, never hiding tiles) */
export const DAY_LIGHT: Record<DayPhase, string | null> = {
  DAWN: "linear-gradient(180deg, rgba(251,207,232,0.16) 0%, rgba(253,230,138,0.08) 40%, rgba(0,0,0,0) 75%)",
  DAY: null,
  GOLDEN: "linear-gradient(160deg, rgba(251,191,36,0.16) 0%, rgba(249,115,22,0.08) 55%, rgba(120,53,15,0.12) 100%)",
  NIGHT: "linear-gradient(180deg, rgba(30,58,95,0.30) 0%, rgba(15,23,42,0.22) 60%, rgba(2,6,23,0.30) 100%)",
};

export const DAY_PHASE_NAMES: Record<DayPhase, string> = {
  DAWN: "Dawn",
  DAY: "Day",
  GOLDEN: "Golden hour",
  NIGHT: "Night",
};

const DEW_DAY_KEY = "ost_dew_day_v1";

/**
 * Morning dew: the first Run started between 5 and 10 am gets dew on a few
 * tiles of its first board (once per day; looks and sound only).
 */
export function takeMorningDew(date = new Date()): boolean {
  if (!loadFollowTimeOfDay()) return false;
  const h = previewParam("hour") ?? date.getHours();
  if (h < 5 || h >= 10) return false;
  const today = date.toISOString().slice(0, 10);
  try {
    if (window.localStorage.getItem(DEW_DAY_KEY) === today && previewParam("hour") === null) return false;
    window.localStorage.setItem(DEW_DAY_KEY, today);
  } catch {
    return false;
  }
  return true;
}

/** About six dew tiles on a board (never the companion or the gate) */
export function pickDewTiles(cells: Array<{ id: string; type: string }>, count = 6): string[] {
  const options = cells.filter((c) => c.type !== "HERO" && c.type !== "EXIT" && c.type !== "VOID");
  const picked: string[] = [];
  let k = 7;
  while (picked.length < Math.min(count, options.length)) {
    k = (k * 31 + 17) % 9973;
    const c = options[k % options.length];
    if (!picked.includes(c.id)) picked.push(c.id);
  }
  return picked;
}
