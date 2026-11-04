"use client";

import Badge from "@/components/Badge";
import { Pencil, Trophy } from "lucide-react";
import { companionArt } from "@/lib/art";
import { BackButton } from "@/components/SheetBits";
import { useBackClose } from "@/lib/backClose";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getRunGardenLabel, HERO_CLASS_REGISTRY } from "@/lib/engine";
import type { HeroClassId } from "@/types/game";
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

/** The top three ranks in gold, silver and bronze rounds; the rest as plain numbers */
const PODIUM = ["bg-amber-300 text-slate-950", "bg-zinc-300 text-slate-950", "bg-orange-400 text-slate-950"];

function Row({ row }: { row: RunLeaderboardRow }) {
  return (
    <div
      className={`grid grid-cols-[2.25rem_1fr_auto] items-center gap-2 px-2 py-1.5 rounded-lg ${
        row.isYou
          ? "bg-emerald-400/15 border border-emerald-300/60"
          : "odd:bg-white/[0.03] border border-transparent"
      }`}
    >
      <span className="flex justify-center tabular-nums font-black text-[14px] text-amber-200">
        {PODIUM[row.rank - 1] ? (
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${PODIUM[row.rank - 1]}`}>{row.rank}</span>
        ) : (
          `#${row.rank}`
        )}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-white truncate">
          {row.hero && HERO_CLASS_REGISTRY[row.hero as HeroClassId] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companionArt(row.hero as HeroClassId)}
              alt={HERO_CLASS_REGISTRY[row.hero as HeroClassId].sanctuaryShortName ?? ""}
              draggable={false}
              className="mr-1 inline-block h-[1.3em] w-[1.3em] align-[-0.3em] object-contain"
            />
          )}
          {row.name}
          {!!row.asc && (
            <span className="ml-1.5 rounded bg-orange-400/15 px-1 text-[10px] font-bold text-orange-200"><Badge id="flame" />A{row.asc}</span>
          )}
          {row.isYou && <span className="ml-1 text-[10px] tabular-nums text-emerald-300">(you)</span>}
        </div>
        <div className="text-[10px] tabular-nums text-indigo-200/75 truncate">
          Reached {getRunGardenLabel(row.gardenIndex)}
        </div>
      </div>
      <span className="tabular-nums font-black text-[14px] text-amber-100">
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

  useBackClose(isOpen, onClose);
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
    <div className="ui-zoom fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-3">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[440px] sm:max-h-[calc(90dvh/var(--ui-zoom,1))] flex flex-col bg-gradient-to-b from-[#203025] via-[#17241B] to-[#0D1510] rounded-2xl border border-amber-300/40 text-white overflow-hidden"
      >
        {/* Header */}
        <div className="px-3 pt-2 pb-2 border-b border-white/10 space-y-1">
          <BackButton onClick={onClose} label="Back to the game" />
          <div className="flex items-center gap-1.5 text-xl font-black">
            <Trophy className="w-5 h-5 text-amber-300" /> Leaderboard
          </div>
          <div className="text-[12px] text-indigo-100/80">
            {board && !board.configured
              ? "The online leaderboard opens soon. Until then, this shows your best Run on this phone."
              : "Every player's best Run, ranked by points. Scores are sent automatically when a bed is cleared and when a Run ends."}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] tabular-nums text-indigo-200/70">
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
                Online board coming soon · this phone only
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
                  className="h-9 px-3 rounded-lg bg-emerald-300 text-slate-950 text-xs tabular-nums font-black"
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
                className="h-9 shrink-0 text-[12px] tabular-nums font-bold px-2.5 rounded-lg bg-white/10"
              >
                <span className="inline-flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Change name
                </span>
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-[200px]">
          {board && board.entries.length === 0 && (
            <div className="text-center text-[12px] text-indigo-100/70 py-8">
              No Runs yet. Bloom a garden to put your name on the board!
            </div>
          )}
          {board?.entries.map((row) => <Row key={`${row.rank}-${row.name}`} row={row} />)}
        </div>

        {/* Your rank when outside the list */}
        {you && !youInList && (
          <div className="px-3 py-2 border-t border-white/10">
            <Row row={you} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
