"use client";

import React, { useEffect, useState } from "react";

/**
 * Moving progress to a new web address. Browsers keep a site's storage per
 * address, so stars, unlocks, the Journal and a Run in progress don't follow
 * the game when its address changes.
 *
 * On the old address this page packs everything into a link to the new one.
 * On the new address it unpacks the link and opens the game. The progress
 * travels after the "#", which browsers never send to the server.
 */

const NEW_HOME = "https://bloomline-game.vercel.app";
/** Only the game's own keys move */
const isGameKey = (k: string) => k.startsWith("ost_") || k === "totalBankedGold";
const MAX_CHARS = 4_000_000;

const toBase64Url = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (text: string) => {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

async function pack(data: Record<string, string>): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(data));
  if (typeof CompressionStream === "undefined") return `j.${toBase64Url(json)}`;
  const zipped = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
  return `g.${toBase64Url(new Uint8Array(zipped))}`;
}

async function unpack(text: string): Promise<Record<string, string> | null> {
  try {
    const [kind, body] = [text.slice(0, 2), text.slice(2)];
    let bytes = fromBase64Url(body);
    if (kind === "g.") {
      bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    } else if (kind !== "j.") return null;
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) if (isGameKey(k) && typeof v === "string") clean[k] = v;
    return clean;
  } catch {
    return null;
  }
}

function readProgress(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && isGameKey(k)) out[k] = window.localStorage.getItem(k) ?? "";
  }
  return out;
}

/** "a", "a and b", "a, b and c" */
const listOf = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** A few things the player will recognise, to show what is moving */
function describe(data: Record<string, string>): string[] {
  const lines: string[] = [];
  try {
    const stars = Object.values(JSON.parse(data.ost_best_stars_v1 ?? "{}") as Record<string, number>).reduce((a, b) => a + (Number(b) || 0), 0);
    if (stars > 0) lines.push(`${stars} stars`);
  } catch {
    // Not readable: just skip it
  }
  try {
    const journal = JSON.parse(data.ost_journal_v1 ?? "null");
    const found = (journal?.relics?.length ?? 0) + (journal?.supplies?.length ?? 0) + Object.keys(journal?.bosses ?? {}).length;
    if (found > 0) lines.push(`${found} Journal entries`);
  } catch {
    // Not readable: just skip it
  }
  if (data.ost_run_save_v1) lines.push("your Garden Run in progress");
  return lines;
}

const shell = "min-h-[100dvh] bg-[#101813] text-white flex items-center justify-center p-4";
const card = "w-full max-w-[400px] rounded-2xl border border-white/10 bg-[#1B281F] p-5 space-y-3";
const mainBtn = "w-full h-12 rounded-xl bg-lime-300 text-slate-950 text-[16px] font-bold active:scale-[0.98] transition disabled:opacity-40";
const quietBtn = "w-full h-11 rounded-xl border border-white/10 bg-white/[0.06] text-[15px] font-semibold text-white/85";

export default function MovePage() {
  const [incoming, setIncoming] = useState<Record<string, string> | null | "bad">(null);
  const [mine, setMine] = useState<Record<string, string>>({});
  const [target, setTarget] = useState(NEW_HOME);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMine(readProgress());
    const hash = window.location.hash;
    if (hash.startsWith("#p=")) {
      void unpack(hash.slice(3)).then((d) => setIncoming(d && Object.keys(d).length > 0 ? d : "bad"));
    }
  }, []);

  const sendOff = async () => {
    setState("working");
    try {
      const url = new URL("/move", target.trim());
      const packed = await pack(readProgress());
      if (packed.length > MAX_CHARS) throw new Error("too big");
      window.location.href = `${url.toString()}#p=${packed}`;
    } catch {
      setState("error");
      setMessage("That address doesn't look right. Check it and try again.");
    }
  };

  const bringIn = () => {
    if (!incoming || incoming === "bad") return;
    // Replace what this address had with the moved progress
    Object.keys(readProgress()).forEach((k) => window.localStorage.removeItem(k));
    Object.entries(incoming).forEach(([k, v]) => window.localStorage.setItem(k, v));
    window.history.replaceState(null, "", "/move");
    setState("done");
  };

  // The new address: a link with progress in it arrived
  if (incoming !== null) {
    const hasOwn = describe(mine).length > 0 || Boolean(mine.ost_runs_started_v1);
    return (
      <main className={shell}>
        <div className={card}>
          <h1 className="font-display text-[26px] font-semibold leading-tight">
            {state === "done" ? "Your progress is here" : "Bring your progress here?"}
          </h1>
          {incoming === "bad" ? (
            <p className="text-[15px] leading-snug text-white/80">
              This link is damaged or incomplete, so nothing was changed. Open the move page on the old address and try again.
            </p>
          ) : state === "done" ? (
            <>
              <p className="text-[15px] leading-snug text-white/80">Everything moved over. You can keep playing right where you left off.</p>
              <button type="button" className={mainBtn} onClick={() => window.location.replace("/")}>
                Open Bloomline
              </button>
            </>
          ) : (
            <>
              <p className="text-[15px] leading-snug text-white/80">
                From your old address: {listOf(describe(incoming)) || "your settings and progress"}.
              </p>
              {hasOwn && (
                <p className="rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-[14px] leading-snug text-amber-100">
                  This address already has some progress. It will be replaced by the progress you are bringing.
                </p>
              )}
              <button type="button" className={mainBtn} onClick={bringIn}>
                Bring it here
              </button>
              <button type="button" className={quietBtn} onClick={() => window.location.replace("/")}>
                Not now
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  // The old address: pack the progress and go
  const what = describe(mine);
  return (
    <main className={shell}>
      <div className={card}>
        <h1 className="font-display text-[26px] font-semibold leading-tight">Move your progress</h1>
        <p className="text-[15px] leading-snug text-white/80">
          Bloomline has a new address. This takes {what.length ? listOf(what) : "your settings and progress"} with you, on this
          phone. Nothing is sent to a server: it all travels inside the link.
        </p>
        <label className="block space-y-1">
          <span className="text-[13px] text-white/55">New address</span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full h-11 rounded-xl border border-white/15 bg-black/25 px-3 text-[15px] text-white outline-none focus:border-lime-300/70"
          />
        </label>
        {state === "error" && <p className="text-[14px] text-rose-200">{message}</p>}
        <button type="button" className={mainBtn} disabled={state === "working"} onClick={sendOff}>
          {state === "working" ? "Packing…" : "Move my progress"}
        </button>
        <button type="button" className={quietBtn} onClick={() => window.location.replace("/")}>
          Back to the game
        </button>
      </div>
    </main>
  );
}
