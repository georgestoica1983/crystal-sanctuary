import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isValidPlayerId } from "@/lib/server/entitlements";
import {
  cleanPlayerName,
  readRunLeaderboard,
  renameRunPlayer,
  submitRunScore,
  verifyRunSubmission,
} from "@/lib/server/runLeaderboard";

export const dynamic = "force-dynamic";

/** GET ?playerId=… → top players and the caller's own rank */
export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  try {
    const board = await readRunLeaderboard(isValidPlayerId(playerId) ? playerId : null);
    return NextResponse.json(board, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

/**
 * POST { playerId, name, score, gardenIndex, log } → replays the Run from its
 * action log and records the verified checkpoint or finished Run (kept only if
 * it beats the player's best). A log that doesn't replay, or whose score
 * doesn't match, is refused with 400.
 * POST { playerId, name, action: "rename" } → changes the display name.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!isValidPlayerId(body.playerId)) {
    return NextResponse.json({ error: "invalid_player" }, { status: 400 });
  }
  const name = cleanPlayerName(body.name);
  if (!name) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  const isRename = body.action === "rename";
  // Verify before anything else so a bad Run is refused even while offline
  const verified = isRename ? null : verifyRunSubmission(body);
  if (verified && !verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }
  if (!getSupabaseAdmin()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    if (isRename) {
      await renameRunPlayer(body.playerId, name);
    } else if (verified?.ok) {
      const result = await submitRunScore({
        playerId: body.playerId,
        name,
        score: verified.score,
        gardenIndex: verified.gardenIndex,
        runSeed: verified.runSeed,
        asc: verified.asc,
      });
      if (result === "too_fast") {
        return NextResponse.json({ error: "too_fast" }, { status: 429 });
      }
    }
    const board = await readRunLeaderboard(body.playerId);
    return NextResponse.json(board, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
