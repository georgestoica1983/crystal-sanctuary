/**
 * Best stars earned on each Garden Bed of a Run (by its position: Season 1
 * Small = 0, Big = 1, Boss = 2, Season 2 Small = 3…), kept on this device.
 */
const BEST_STARS_KEY = "ost_best_stars_v1";

export type BestStars = Record<string, number>;

export function loadBestStars(): BestStars {
  try {
    const raw = JSON.parse(window.localStorage.getItem(BEST_STARS_KEY) || "{}");
    return raw && typeof raw === "object" ? (raw as BestStars) : {};
  } catch {
    return {};
  }
}

/** Records stars for a Garden Bed; `improved` when they beat the old best */
export function saveBestStars(gardenIndex: number, stars: number): { best: BestStars; improved: boolean } {
  const best = loadBestStars();
  const before = best[gardenIndex] ?? 0;
  if (stars <= before) return { best, improved: false };
  const next = { ...best, [gardenIndex]: stars };
  try {
    window.localStorage.setItem(BEST_STARS_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: stars just aren't remembered
  }
  return { best: next, improved: before > 0 };
}

export function totalBestStars(best: BestStars = loadBestStars()): number {
  return Object.values(best).reduce((sum, n) => sum + (Number(n) || 0), 0);
}
