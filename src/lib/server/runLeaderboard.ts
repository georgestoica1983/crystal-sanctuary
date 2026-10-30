// Server-only: the Run leaderboard, stored in Supabase with the service-role
// key (RLS on, no public policies). Player ids never leave the server.
import { getSupabaseAdmin } from "@/lib/server/entitlements";
import { replayRun } from "@/lib/runReplay";
import { PRACTICE_GARDEN_SEED } from "@/lib/runLessons";

export const RUN_LEADERBOARD_SIZE = 50;
/** Minimum time between two score submissions from one player */
const SUBMIT_COOLDOWN_MS = 3000;
/** Upper bound for a single Run score (keeps typos/garbage out of the table) */
const MAX_PLAUSIBLE_SCORE = 1e12;

export interface RunLeaderboardRow {
  rank: number;
  name: string;
  score: number;
  gardenIndex: number;
  /** Ascension level of that best Run */
  asc: number;
  updatedAt: string;
  isYou: boolean;
}

export interface RunLeaderboardResponse {
  configured: boolean;
  entries: RunLeaderboardRow[];
  you: RunLeaderboardRow | null;
  totalPlayers: number;
}

interface DbRow {
  player_id: string;
  player_name: string;
  best_score: number;
  best_garden_index: number;
  /** Missing until the 20261030 migration has run */
  best_asc?: number;
  updated_at: string;
  last_submit_at: string;
  runs_submitted: number;
}

const NAME_RE = /^[\p{L}\p{N} _.\-']{2,16}$/u;

/** Trims and validates a display name; null if it isn't acceptable */
export function cleanPlayerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim();
  return NAME_RE.test(name) ? name : null;
}

export function isPlausibleRun(score: unknown, gardenIndex: unknown): boolean {
  return (
    typeof score === "number" &&
    Number.isInteger(score) &&
    score >= 0 &&
    score <= MAX_PLAUSIBLE_SCORE &&
    typeof gardenIndex === "number" &&
    Number.isInteger(gardenIndex) &&
    gardenIndex >= 0 &&
    gardenIndex <= 300
  );
}

export type RunVerification =
  | { ok: true; score: number; gardenIndex: number; runSeed: string; asc: number }
  | { ok: false; error: string };

/**
 * Replays a submitted Run from its action log and checks the claimed score
 * against the replayed one. Only the replayed score is ever stored.
 */
export function verifyRunSubmission(body: {
  score?: unknown;
  gardenIndex?: unknown;
  log?: unknown;
}): RunVerification {
  if (!isPlausibleRun(body.score, body.gardenIndex)) return { ok: false, error: "invalid_score" };
  const log = body.log as { seed?: unknown; asc?: unknown } | undefined;
  if (!log || typeof log !== "object" || typeof log.seed !== "string") {
    return { ok: false, error: "invalid_log" };
  }
  if (log.seed === PRACTICE_GARDEN_SEED) return { ok: false, error: "practice_run" };
  const replay = replayRun(body.log);
  if (!replay.ok) return { ok: false, error: "invalid_run" };
  if (replay.score !== body.score || replay.score <= 0) {
    return { ok: false, error: "score_mismatch" };
  }
  return {
    ok: true,
    score: replay.score,
    gardenIndex: replay.gardenIndex,
    runSeed: log.seed,
    asc: typeof log.asc === "number" ? log.asc : 0,
  };
}

/** Top players plus the caller's own row and rank */
export async function readRunLeaderboard(playerId: string | null): Promise<RunLeaderboardResponse> {
  const db = getSupabaseAdmin();
  if (!db) return { configured: false, entries: [], you: null, totalPlayers: 0 };

  const { data, error, count } = await db
    .from("run_leaderboard")
    .select("player_id, player_name, best_score, best_garden_index, best_asc, updated_at", {
      count: "exact",
    })
    .gt("best_score", 0)
    .order("best_score", { ascending: false })
    .order("best_garden_index", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(RUN_LEADERBOARD_SIZE);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DbRow[];
  const entries: RunLeaderboardRow[] = rows.map((r, i) => ({
    rank: i + 1,
    name: r.player_name,
    score: Number(r.best_score),
    gardenIndex: r.best_garden_index,
    asc: r.best_asc ?? 0,
    updatedAt: r.updated_at,
    isYou: r.player_id === playerId,
  }));

  let you = entries.find((e) => e.isYou) ?? null;
  if (!you && playerId) {
    const { data: mine } = await db
      .from("run_leaderboard")
      .select("player_id, player_name, best_score, best_garden_index, best_asc, updated_at")
      .eq("player_id", playerId)
      .maybeSingle();
    const row = mine as DbRow | null;
    if (row && Number(row.best_score) > 0) {
      const { count: ahead } = await db
        .from("run_leaderboard")
        .select("player_id", { count: "exact", head: true })
        .gt("best_score", row.best_score);
      you = {
        rank: (ahead ?? 0) + 1,
        name: row.player_name,
        score: Number(row.best_score),
        gardenIndex: row.best_garden_index,
        asc: row.best_asc ?? 0,
        updatedAt: row.updated_at,
        isYou: true,
      };
    }
  }

  return { configured: true, entries, you, totalPlayers: count ?? entries.length };
}

export type SubmitResult = "saved" | "not_better" | "too_fast";

/**
 * Records a Run checkpoint or finished Run. The row only changes when the
 * score beats the player's best (the name is always updated).
 */
export async function submitRunScore(params: {
  playerId: string;
  name: string;
  score: number;
  gardenIndex: number;
  runSeed: string | null;
  asc?: number;
}): Promise<SubmitResult> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Supabase admin client is not configured");

  const { data: existing, error: readError } = await db
    .from("run_leaderboard")
    .select("player_id, player_name, best_score, best_garden_index, last_submit_at, runs_submitted")
    .eq("player_id", params.playerId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  const row = existing as DbRow | null;
  const now = new Date();

  if (row && now.getTime() - new Date(row.last_submit_at).getTime() < SUBMIT_COOLDOWN_MS) {
    return "too_fast";
  }

  const better =
    !row ||
    params.score > Number(row.best_score) ||
    (params.score === Number(row.best_score) && params.gardenIndex > row.best_garden_index);

  const update: Record<string, unknown> = {
    player_id: params.playerId,
    player_name: params.name,
    last_submit_at: now.toISOString(),
    runs_submitted: (row?.runs_submitted ?? 0) + 1,
  };
  if (better) {
    update.best_score = params.score;
    update.best_garden_index = params.gardenIndex;
    update.best_run_seed = params.runSeed;
    update.best_asc = params.asc ?? 0;
    update.updated_at = now.toISOString();
  }
  const { error } = await db.from("run_leaderboard").upsert(update, { onConflict: "player_id" });
  if (error) throw new Error(error.message);
  return better ? "saved" : "not_better";
}

/** Changes the player's display name (only if they already have a row) */
export async function renameRunPlayer(playerId: string, name: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Supabase admin client is not configured");
  const { error } = await db
    .from("run_leaderboard")
    .update({ player_name: name })
    .eq("player_id", playerId);
  if (error) throw new Error(error.message);
}
