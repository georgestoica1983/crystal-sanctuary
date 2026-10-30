// Client side of the Run leaderboard: the player's display name, automatic
// score submission (with a retry queue) and a local fallback when the server
// isn't configured.
import { getOrCreatePlayerId } from "@/lib/supabase";
import { loadRunBestRecord } from "@/lib/engine";
import type { RunActionLog } from "@/lib/runReplay";

export interface RunLeaderboardRow {
  rank: number;
  name: string;
  score: number;
  gardenIndex: number;
  /** Ascension level of that best Run (0 when unknown) */
  asc?: number;
  updatedAt: string;
  isYou: boolean;
}

export interface RunLeaderboardData {
  configured: boolean;
  entries: RunLeaderboardRow[];
  you: RunLeaderboardRow | null;
  totalPlayers: number;
}

const NAME_KEY = "ost_run_player_name_v1";
const PENDING_KEY = "ost_run_leaderboard_pending_v1";
const NAME_RE = /^[\p{L}\p{N} _.\-']{2,16}$/u;

export function isValidPlayerName(name: string): boolean {
  return NAME_RE.test(name.replace(/\s+/g, " ").trim());
}

/** The name shown on the leaderboard (a friendly default until the player picks one) */
export function getRunPlayerName(): string {
  try {
    const saved = window.localStorage.getItem(NAME_KEY);
    if (saved && isValidPlayerName(saved)) return saved;
  } catch {
    // Fall through to a default
  }
  const id = getOrCreatePlayerId();
  const digits = (id.replace(/[^0-9]/g, "") + "0000").slice(0, 4);
  return `Gardener ${digits}`;
}

export function hasChosenRunPlayerName(): boolean {
  try {
    return Boolean(window.localStorage.getItem(NAME_KEY));
  } catch {
    return false;
  }
}

/** This device's best Run, shaped like a leaderboard row (used offline) */
function localBoard(): RunLeaderboardData {
  const best = loadRunBestRecord();
  const you: RunLeaderboardRow | null =
    best && best.score > 0
      ? {
          rank: 1,
          name: getRunPlayerName(),
          score: best.score,
          gardenIndex: best.gardenIndex,
          updatedAt: new Date().toISOString(),
          isYou: true,
        }
      : null;
  return { configured: false, entries: you ? [you] : [], you, totalPlayers: you ? 1 : 0 };
}

async function parseBoard(res: Response): Promise<RunLeaderboardData | null> {
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as RunLeaderboardData | null;
  return data && Array.isArray(data.entries) ? data : null;
}

export async function fetchRunLeaderboard(): Promise<RunLeaderboardData> {
  await flushPendingRunScore();
  try {
    const res = await fetch(
      `/api/run-leaderboard?playerId=${encodeURIComponent(getOrCreatePlayerId())}`,
      { cache: "no-store" }
    );
    const board = await parseBoard(res);
    if (board?.configured) return board;
  } catch {
    // Offline: fall back to this device
  }
  return localBoard();
}

interface PendingScore {
  score: number;
  gardenIndex: number;
  /** The Run's action log; the server replays it to verify the score */
  log: RunActionLog;
}

function loadPending(): PendingScore | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    const pending = raw ? (JSON.parse(raw) as PendingScore) : null;
    // Scores queued before Runs were replayed carry no log and can't be verified
    return pending && pending.log ? pending : null;
  } catch {
    return null;
  }
}

function savePending(p: PendingScore | null) {
  try {
    if (p) window.localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // Ignore storage errors
  }
}

async function postScore(p: PendingScore): Promise<RunLeaderboardData | null> {
  const res = await fetch("/api/run-leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId: getOrCreatePlayerId(),
      name: getRunPlayerName(),
      score: p.score,
      gardenIndex: p.gardenIndex,
      log: p.log,
    }),
  });
  if (res.status === 503) return localBoard(); // Leaderboard not set up yet
  // Refused by the replay check: retrying won't help, so drop it
  if (res.status === 400) return localBoard();
  return parseBoard(res);
}

/** Re-sends a score that couldn't be delivered earlier */
async function flushPendingRunScore(): Promise<void> {
  const pending = loadPending();
  if (!pending) return;
  try {
    const board = await postScore(pending);
    if (board) savePending(null);
  } catch {
    // Still offline; try again later
  }
}

/**
 * Sends a Run checkpoint (a garden bloomed) or a finished Run with its action
 * log. The server replays the log, and keeps the verified score only if it
 * beats the player's best. Failed sends are retried later.
 */
export async function submitRunToLeaderboard(params: {
  score: number;
  gardenIndex: number;
  log: RunActionLog;
}): Promise<RunLeaderboardData | null> {
  if (params.score <= 0) return null;
  const pending = loadPending();
  // Keep the best undelivered score
  const toSend =
    pending && pending.score > params.score ? pending : { ...params };
  try {
    const board = await postScore(toSend);
    if (board) {
      savePending(null);
      return board;
    }
  } catch {
    // Offline
  }
  savePending(toSend);
  return null;
}

/** Saves the display name locally and on the server */
export async function setRunPlayerName(name: string): Promise<RunLeaderboardData | null> {
  const clean = name.replace(/\s+/g, " ").trim();
  if (!isValidPlayerName(clean)) return null;
  try {
    window.localStorage.setItem(NAME_KEY, clean);
  } catch {
    // Ignore storage errors
  }
  try {
    const res = await fetch("/api/run-leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: getOrCreatePlayerId(), name: clean, action: "rename" }),
    });
    const board = await parseBoard(res);
    if (board) return board;
  } catch {
    // Offline: the name goes out with the next score
  }
  return fetchRunLeaderboard();
}
