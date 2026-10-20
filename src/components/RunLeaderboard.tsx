"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getRunGardenLabel } from "@/lib/engine";
import {
  fetchRunLeaderboard,
  getRunPlayerName,
  isValidPlayerName,
  RunLeaderboardData,
  RunLeaderboardRow,
  setRunPlayerName,
} from "@/lib/runLeaderboard";

/** How often the open leaderboard refreshes itself */
const REFRESH_MS = 15000;

const MEDALS = ["🥇", "🥈", "🥉"];

function Row({ row }: { row: RunLeaderboardRow }) {
  return (
    <div
      className={`grid grid-cols-[2.25rem_1fr_auto] items-center gap-2 px-2 py-1.5 rounded-lg ${
        row.isYou
          ? "bg-emerald-400/15 border border-emerald-300/60"
          : "odd:bg-white/[0.03] border border-transparent"
      }`}
    >
      <span className="text-center font-mono font-black text-[13px] text-amber-200">
        {MEDALS[row.rank - 1] ?? `#${row.rank}`}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-white truncate">
          {row.name}
          {row.isYou && <span className="ml-1 text-[10px] font-mono text-emerald-300">(you)</span>}
        </div>
        <div className="text-[10px] font-mono text-indigo-200/75 truncate">
          Reached {getRunGardenLabel(row.gardenIndex)}
        </div>
      </div>
      <span className="font-mono font-black text-[13px] text-amber-100">
        {row.score.toLocaleString()}
      </span>
    </div>
  );
}

export default function RunLeaderboardModal({
  isOpen,
  refreshKey,
  onClose,
}: {
  isOpen: boolean;
  /** Changes whenever this device sent a new score, to refresh at once */
  refreshKey: number;
  onClose: () => void;
}) {
  const [board, setBoard] = useState<RunLeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await fetchRunLeaderboard();
    if (!aliveRef.current) return;
    setBoard(next);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    if (!isOpen) return;
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => {
      aliveRef.current = false;
      window.clearInterval(id);
    };
  }, [isOpen, load, refreshKey]);

  if (!isOpen) return null;

  const you = board?.you ?? null;
  const youInList = Boolean(board?.entries.some((e) => e.isYou));

  const saveName = async () => {
    if (!isValidPlayerName(nameDraft)) {
      setNameError("2–16 letters, numbers, spaces or . _ - '");
      return;
    }
    setNameError(null);
    setEditingName(false);
    const next = await setRunPlayerName(nameDraft);
    if (next) setBoard(next);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-3">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[440px] sm:max-h-[90dvh] flex flex-col bg-gradient-to-b from-[#1F1A36] via-[#151229] to-[#0C0A18] rounded-2xl border border-amber-300/40 text-white overflow-hidden"
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-white/10 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-lg font-black">🏆 Leaderboard</div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 text-[12px] font-mono font-bold px-3 rounded-lg bg-white/10"
            >
              Close
            </button>
          </div>
          <div className="text-[11px] text-indigo-100/80">
            Every player&apos;s best Run, ranked by points. Scores are sent automatically when a
            garden is cleared and when a Run ends.
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-200/70">
            {board?.configured ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live · {board.totalPlayers.toLocaleString()} player
                {board.totalPlayers === 1 ? "" : "s"}
                {lastUpdated && ` · updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
              </>
            ) : board ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Not connected yet — showing this device only
              </>
            ) : (
              "Loading…"
            )}
            {loading && board && <span className="ml-auto">↻</span>}
          </div>
        </div>

        {/* Your name */}
        <div className="px-3 py-2 border-b border-white/10">
          {editingName ? (
            <div className="space-y-1">
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={nameDraft}
                  maxLength={16}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void saveName()}
                  aria-label="Your leaderboard name"
                  className="h-9 flex-1 min-w-0 rounded-lg bg-black/40 border border-white/20 px-2 text-[16px] text-white outline-none focus:border-emerald-300"
                />
                <button
                  type="button"
                  onClick={() => void saveName()}
                  className="h-9 px-3 rounded-lg bg-emerald-300 text-slate-950 text-xs font-mono font-black"
                >
                  Save
                </button>
              </div>
              {nameError && <div className="text-[10px] text-rose-300">{nameError}</div>}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-indigo-100/80">
                You appear as <span className="font-bold text-white">{getRunPlayerName()}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setNameDraft(getRunPlayerName());
                  setEditingName(true);
                }}
                className="h-9 shrink-0 text-[11px] font-mono font-bold px-2.5 rounded-lg bg-white/10"
              >
                ✏️ Change name
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-[200px]">
          {board && board.entries.length === 0 && (
            <div className="text-center text-[12px] text-indigo-100/70 py-8">
              No Runs yet. Bloom a garden to put your name on the board!
            </div>
          )}
          {board?.entries.map((row) => <Row key={`${row.rank}-${row.name}`} row={row} />)}
        </div>

        {/* Your rank when outside the list */}
        {you && !youInList && (
          <div className="px-2 py-2 border-t border-white/10">
            <Row row={you} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
