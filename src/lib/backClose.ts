// The phone's Back gesture closes whatever sheet or screen is open on top,
// like a native app, instead of leaving the game page.
//
// While any overlay is open there is one extra history entry. Back pops it:
// the top overlay closes, and if others are still open the entry comes back.
// When the last overlay closes by a tap, the entry is taken away again.
"use client";

import { useEffect, useRef } from "react";

const stack: Array<{ id: number; close: () => void }> = [];
let armed = false;
let ignoreNextPop = false;
let nextId = 1;

function arm() {
  if (armed) return;
  window.history.pushState({ bloomlineOverlay: true }, "");
  armed = true;
}

function onPop() {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    armed = false;
    // An overlay opened while our entry was being taken away
    if (stack.length > 0) arm();
    return;
  }
  armed = false;
  const top = stack[stack.length - 1];
  if (top) top.close();
  if (stack.length > 1) arm();
}

if (typeof window !== "undefined") window.addEventListener("popstate", onPop);

/** While `open`, the phone's Back closes this overlay (the top one first) */
export function useBackClose(open: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = nextId++;
    stack.push({ id, close: () => closeRef.current() });
    arm();
    return () => {
      const i = stack.findIndex((e) => e.id === id);
      if (i >= 0) stack.splice(i, 1);
      // Closed by a tap: take our history entry away again
      if (stack.length === 0 && armed) {
        ignoreNextPop = true;
        window.history.back();
      }
    };
  }, [open]);
}
