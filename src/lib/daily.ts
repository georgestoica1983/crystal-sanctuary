import { getTodayDateKey } from "@/lib/engine";
import { RUN_DAILY_LAST_BED } from "@/lib/runReplay";

/**
 * The Daily Garden on this device: one official try per day (the first one
 * started), its stars bed by bed, and the day streak. Replays of the same day
 * are practice and never change the record.
 */
const DAILY_KEY = "ost_daily_v1";
/** The date whose official try is in progress (cleared when it ends or another Run starts) */
const ACTIVE_KEY = "ost_daily_active_v1";

export interface DailyRecord {
  /** Stars of each bloomed bed, in order */
  stars: number[];
  /** The official try is over */
  done: boolean;
  score: number;
  bestLineTiles: number;
}

type DailyBook = Record<string, DailyRecord>;

const BEDS = RUN_DAILY_LAST_BED + 1;

function readBook(): DailyBook {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DAILY_KEY) || "{}");
    return raw && typeof raw === "object" ? (raw as DailyBook) : {};
  } catch {
    return {};
  }
}

function writeBook(book: DailyBook): void {
  try {
    window.localStorage.setItem(DAILY_KEY, JSON.stringify(book));
  } catch {
    // Storage unavailable: the day just isn't remembered
  }
}

export const dailyRecord = (dateKey: string): DailyRecord | null => readBook()[dateKey] ?? null;

export function activeDaily(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/** A Run starts: a Daily Garden with no record yet today is the official try */
export function noteRunStarted(dailyDate: string | null): boolean {
  let official = false;
  try {
    if (dailyDate && !readBook()[dailyDate]) {
      writeBook({ ...readBook(), [dailyDate]: { stars: [], done: false, score: 0, bestLineTiles: 0 } });
      window.localStorage.setItem(ACTIVE_KEY, dailyDate);
      official = true;
    } else {
      window.localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
  return official;
}

/** A bed of the official try bloomed */
export function recordDailyBed(dateKey: string, gardenIndex: number, stars: number): void {
  if (activeDaily() !== dateKey) return;
  const book = readBook();
  const rec = book[dateKey];
  if (!rec || rec.done) return;
  const next = [...rec.stars];
  next[gardenIndex] = stars;
  writeBook({ ...book, [dateKey]: { ...rec, stars: next } });
}

/** The official try ended (finished or not) */
export function finishDaily(dateKey: string, score: number, bestLineTiles: number): void {
  if (activeDaily() !== dateKey) return;
  const book = readBook();
  const rec = book[dateKey];
  if (rec) writeBook({ ...book, [dateKey]: { ...rec, done: true, score, bestLineTiles } });
  try {
    window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Ignore storage errors
  }
}

const shiftDay = (dateKey: string, days: number): string => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = new Date(y, m - 1, d + days);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

/** Days in a row with a Daily Garden played, up to today (yesterday still counts if today isn't played yet) */
export function dailyStreak(today: string = getTodayDateKey()): number {
  const book = readBook();
  let day = book[today] ? today : shiftDay(today, -1);
  let n = 0;
  while (book[day]) {
    n++;
    day = shiftDay(day, -1);
  }
  return n;
}

export function dailyStatus(today: string = getTodayDateKey()): { played: boolean; streak: number } {
  return { played: Boolean(readBook()[today]), streak: dailyStreak(today) };
}

const CELL = ["🥀", "🌱", "🌼", "🌸"];

/** e.g. "3 Nov" */
const shortDate = (dateKey: string): string => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** The flower grid: a row per Season, a cell per bed, no spoilers about the boards */
export function dailyGridRows(rec: DailyRecord): string[] {
  const cleared = rec.stars.filter((n) => n > 0).length;
  const rows: string[] = [];
  for (let season = 0; season < BEDS / 3; season++) {
    let row = "";
    for (let k = 0; k < 3; k++) {
      const bed = season * 3 + k;
      const stars = rec.stars[bed];
      row += stars ? CELL[stars] : bed === cleared && rec.done ? CELL[0] : "⬛";
    }
    rows.push(row);
  }
  return rows;
}

export function dailyShareText(dateKey: string, rec: DailyRecord, streak: number): string {
  const rows = dailyGridRows(rec).map((r, i) => `${r}  Season ${i + 1}`);
  const tail = [
    rec.score.toLocaleString("en-US"),
    rec.bestLineTiles > 0 ? `best line ${rec.bestLineTiles} tiles` : null,
    streak > 1 ? `🔥 ${streak} days` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return [`Bloomline Daily · ${shortDate(dateKey)}`, ...rows, tail].join("\n");
}
