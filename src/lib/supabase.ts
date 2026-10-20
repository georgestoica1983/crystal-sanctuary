import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  CosmeticPreferences,
  DailyPlayerStats,
  GridCoord,
  LeaderboardEntry,
  ModifierId,
  MonetizationState,
} from "@/types/game";
import { DailyShopLoadout, getTodayDateKey } from "@/lib/engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const STATS_STORAGE_KEY = "ost_daily_player_stats_v1";
const PASS_STORAGE_KEY = "ost_monetization_pass_v1";
const LOCAL_LEADERBOARD_KEY = "ost_local_leaderboard_v1";
const BANKED_GOLD_KEY = "totalBankedGold";
const COSMETICS_STORAGE_KEY = "ost_cosmetics_prefs_v1";

export const DEFAULT_PLAYER_STATS: DailyPlayerStats = {
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  bestDailyScore: 0,
  totalRunsCompleted: 0,
  totalBankedGold: 0,
  dailyHistory: {},
};

export const DEFAULT_MONETIZATION_STATE: MonetizationState = {
  expansionUnlocked: false,
  weekendPassExpiresAt: null,
  lifetimePassUnlocked: false,
  devSimulatePass: false,
};

export const DEFAULT_COSMETIC_PREFS: CosmeticPreferences = {
  emblemId: "CLASSIC_H",
  trailId: "CYBER_CYAN",
  visualTheme: "SANCTUARY",
  companionId: "CAT",
};

export function loadPlayerStats(): DailyPlayerStats {
  if (typeof window === "undefined") return DEFAULT_PLAYER_STATS;
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    const bankedRaw = window.localStorage.getItem(BANKED_GOLD_KEY);
    const parsedStats = raw ? JSON.parse(raw) : {};
    const explicitBanked = bankedRaw ? parseInt(bankedRaw, 10) : 0;
    const mergedGold = Math.max(
      typeof parsedStats.totalBankedGold === "number"
        ? parsedStats.totalBankedGold
        : 0,
      Number.isNaN(explicitBanked) ? 0 : explicitBanked
    );
    return {
      ...DEFAULT_PLAYER_STATS,
      ...parsedStats,
      totalBankedGold: mergedGold,
    };
  } catch {
    return DEFAULT_PLAYER_STATS;
  }
}

export function addBankedGold(goldAmount: number): DailyPlayerStats {
  const stats = loadPlayerStats();
  if (goldAmount > 0) {
    stats.totalBankedGold = Math.max(0, (stats.totalBankedGold || 0) + goldAmount);
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        BANKED_GOLD_KEY,
        String(stats.totalBankedGold)
      );
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage error
    }
  }
  return stats;
}

export function loadCosmeticPreferences(): CosmeticPreferences {
  if (typeof window === "undefined") return DEFAULT_COSMETIC_PREFS;
  try {
    const raw = window.localStorage.getItem(COSMETICS_STORAGE_KEY);
    if (!raw) return DEFAULT_COSMETIC_PREFS;
    return { ...DEFAULT_COSMETIC_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_COSMETIC_PREFS;
  }
}

export function saveCosmeticPreferences(
  prefs: CosmeticPreferences
): CosmeticPreferences {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(COSMETICS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }
  return prefs;
}

/**
 * Records a finished Daily. Only the first finished attempt of a date is
 * official: it sets the day's score, stars, share card and the streak. Later
 * attempts are practice and only bank their gems.
 *
 * Any official attempt (all gardens or ended early) keeps the streak alive —
 * the streak rewards showing up for the Daily, not perfection.
 */
export function saveDailyRunCompletion(params: {
  dateKey: string;
  score: number;
  survived: boolean;
  floorsCleared: number;
  starsEarned?: number;
  parPercent?: number | null;
  perfectCount?: number;
  heroClassId?: "KNIGHT" | "ROGUE" | "MAGE" | "VAMPIRE";
  shareAscii: string;
  goldEarned?: number;
}): { stats: DailyPlayerStats; isOfficial: boolean } {
  const stats = loadPlayerStats();
  const isOfficial = !stats.dailyHistory[params.dateKey];

  if (isOfficial) {
    const yesterday = new Date(params.dateKey + "T00:00:00");
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(
      yesterday.getMonth() + 1
    ).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    if (stats.lastCompletedDate === yKey) {
      stats.currentStreak += 1;
    } else if (stats.lastCompletedDate !== params.dateKey) {
      stats.currentStreak = 1;
    }
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.lastCompletedDate = params.dateKey;
    stats.bestDailyScore = Math.max(stats.bestDailyScore, params.score);
    stats.dailyHistory[params.dateKey] = {
      score: params.score,
      survived: params.survived,
      floorsCleared: params.floorsCleared,
      starsEarned: params.starsEarned ?? 0,
      parPercent: params.parPercent ?? undefined,
      perfectCount: params.perfectCount ?? 0,
      heroClassId: params.heroClassId,
      shareAscii: params.shareAscii,
      timestamp: Date.now(),
    };
  }

  stats.totalRunsCompleted += 1;
  if (params.goldEarned && params.goldEarned > 0) {
    stats.totalBankedGold = (stats.totalBankedGold || 0) + params.goldEarned;
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        BANKED_GOLD_KEY,
        String(stats.totalBankedGold || 0)
      );
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage error
    }
  }
  return { stats, isOfficial };
}

/** Whether today's official Daily has already been finished on this device. */
export function hasOfficialDailyResult(dateKey: string): boolean {
  return Boolean(loadPlayerStats().dailyHistory[dateKey]);
}

const DAILY_PROGRESS_KEY = "ost_daily_progress_v1";

/**
 * In-progress official Daily: the committed line for each finished garden.
 * The engine is deterministic and the Daily's companion and Blessings are
 * fixed, so these lines are enough to rebuild the visit after a reload —
 * which also stops "reload and redo garden 1" from counting as official.
 */
export interface DailyProgress {
  dateKey: string;
  paths: GridCoord[][];
  // What left the Sanctuary Shop after each garden (index = garden index)
  loadouts?: Array<DailyShopLoadout | null>;
}

export function loadDailyProgress(dateKey: string): DailyProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DAILY_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyProgress;
    return parsed.dateKey === dateKey && Array.isArray(parsed.paths)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function saveDailyProgress(progress: DailyProgress | null): void {
  if (typeof window === "undefined") return;
  try {
    if (progress) {
      window.localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(progress));
    } else {
      window.localStorage.removeItem(DAILY_PROGRESS_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

export function loadMonetizationState(): MonetizationState {
  if (typeof window === "undefined") return DEFAULT_MONETIZATION_STATE;
  try {
    const raw = window.localStorage.getItem(PASS_STORAGE_KEY);
    if (!raw) return DEFAULT_MONETIZATION_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MONETIZATION_STATE,
      ...parsed,
      expansionUnlocked: Boolean(
        parsed.expansionUnlocked || parsed.lifetimePassUnlocked
      ),
    };
  } catch {
    return DEFAULT_MONETIZATION_STATE;
  }
}

export function saveMonetizationState(
  state: MonetizationState
): MonetizationState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PASS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore
    }
  }
  return state;
}

/** The developer unlock simulator only works in local development builds. */
export const DEV_SIMULATOR_ENABLED = process.env.NODE_ENV !== "production";

export function hasExpansionAccess(state: MonetizationState): boolean {
  return Boolean(
    (DEV_SIMULATOR_ENABLED && state.devSimulatePass) ||
      state.expansionUnlocked ||
      state.lifetimePassUnlocked
  );
}

const PLAYER_ID_KEY = "ost_player_id_v1";

/** Anonymous per-device id that purchases are attached to (no accounts). */
export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return "";
  }
}

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not_configured" | "failed" };

/** Creates a Stripe Checkout session; the caller redirects to `url`. */
export async function startExpansionCheckout(): Promise<CheckoutResult> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: getOrCreatePlayerId() }),
    });
    if (res.status === 503) return { ok: false, reason: "not_configured" };
    const data = await res.json();
    return res.ok && data.url
      ? { ok: true, url: data.url }
      : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/**
 * Asks the server whether this device owns the Expansion. Returns null when the
 * server can't answer (offline / payments not configured) so callers keep the
 * cached local state.
 */
export async function fetchExpansionEntitlement(options?: {
  sessionId?: string;
  restoreAccessToken?: string;
}): Promise<{ expansion: boolean; restored: boolean } | null> {
  const playerId = getOrCreatePlayerId();
  if (!playerId) return null;
  try {
    const res = await fetch("/api/entitlement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options?.restoreAccessToken
          ? { Authorization: `Bearer ${options.restoreAccessToken}` }
          : {}),
      },
      body: JSON.stringify({
        playerId,
        sessionId: options?.sessionId,
        restore: Boolean(options?.restoreAccessToken),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { expansion: Boolean(data.expansion), restored: Boolean(data.restored) };
  } catch {
    return null;
  }
}

/** Emails a magic link; the player returns to `/?restore=1` signed in. */
export async function sendRestoreLink(
  email: string
): Promise<"sent" | "not_configured" | "failed"> {
  if (!supabase) return "not_configured";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/?restore=1`,
    },
  });
  return error ? "failed" : "sent";
}

/**
 * Finishes a restore after the magic link: links this device to the purchase
 * made with the verified email, then signs out (sign-in is only used to prove
 * the email).
 */
export async function completeRestoreFromMagicLink(): Promise<
  { expansion: boolean; restored: boolean } | null
> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const result = await fetchExpansionEntitlement({ restoreAccessToken: token });
  await supabase.auth.signOut();
  return result;
}

export function hasActivePass(state: MonetizationState): boolean {
  if (hasExpansionAccess(state)) return true;
  if (state.weekendPassExpiresAt && state.weekendPassExpiresAt > Date.now()) {
    return true;
  }
  return false;
}

export function hasCustomCrafterAccess(state: MonetizationState): boolean {
  return hasExpansionAccess(state);
}

export async function fetchDailyLeaderboard(
  dateKey: string = getTodayDateKey(),
  modifierId: ModifierId = "GLASS_ARMOR"
): Promise<LeaderboardEntry[]> {
  let remoteEntries: LeaderboardEntry[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("daily_leaderboard")
        .select("*")
        .eq("date_key", dateKey)
        .order("score", { ascending: false })
        .limit(15);

      if (!error && data) {
        remoteEntries = data as LeaderboardEntry[];
      }
    } catch {
      // Fallback to local entries
    }
  }

  let localEntries: LeaderboardEntry[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LOCAL_LEADERBOARD_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LeaderboardEntry[];
        localEntries = parsed.filter((e) => e.date_key === dateKey);
      }
    } catch {
      // Ignore
    }
  }

  // Only real submissions (remote + this device). No seeded bot rivals.
  void modifierId;
  const combined = [...remoteEntries, ...localEntries];
  const uniqueByHandle = new Map<string, LeaderboardEntry>();
  for (const entry of combined) {
    const existing = uniqueByHandle.get(entry.player_name);
    if (!existing || entry.score > existing.score) {
      uniqueByHandle.set(entry.player_name, entry);
    }
  }

  return Array.from(uniqueByHandle.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function submitDailyLeaderboardScore(params: {
  playerName: string;
  dateKey: string;
  score: number;
  remainingHp: number;
  goldCollected: number;
  cellsVisited: number;
  modifierId: ModifierId;
  survived: boolean;
}): Promise<LeaderboardEntry[]> {
  const newEntry: LeaderboardEntry = {
    id: `local-${Date.now()}`,
    player_name: (params.playerName.trim() || "TACTICIAN").toUpperCase().slice(0, 16),
    date_key: params.dateKey,
    score: params.score,
    remaining_hp: params.remainingHp,
    gold_collected: params.goldCollected,
    cells_visited: params.cellsVisited,
    modifier_id: params.modifierId,
    survived: params.survived,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LOCAL_LEADERBOARD_KEY);
      const list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
      list.push(newEntry);
      window.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(list));
    } catch {
      // Ignore
    }
  }

  if (supabase) {
    try {
      await supabase.from("daily_leaderboard").insert([
        {
          player_name: newEntry.player_name,
          date_key: newEntry.date_key,
          score: newEntry.score,
          remaining_hp: newEntry.remaining_hp,
          gold_collected: newEntry.gold_collected,
          cells_visited: newEntry.cells_visited,
          modifier_id: newEntry.modifier_id,
          survived: newEntry.survived,
        },
      ]);
    } catch {
      // Ignore network errors and rely on local persistence
    }
  }

  return fetchDailyLeaderboard(params.dateKey, params.modifierId);
}
