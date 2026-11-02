"use client";

import React from "react";

/**
 * Bottom sheets close the way phones do: pull the sheet down by its top, tap
 * outside, press Back, or tap Done at the bottom. No small X.
 */

/** The little bar on top that says "you can pull this down" */
export function GrabBar() {
  // A taller strip than it looks (easy to catch), where touch never scrolls the sheet
  return (
    <div aria-hidden="true" className="-mt-1 flex h-6 w-full shrink-0 touch-none items-center justify-center">
      <div className="h-1.5 w-10 rounded-full bg-white/25" />
    </div>
  );
}

/**
 * Props that let a sheet be pulled down to close: start the pull on the top
 * part of the sheet (the grab bar and title), the sheet follows the finger,
 * and letting go past 90px closes it. Plain pointer events, so it never
 * fights the sheet's own scrolling or taps.
 */
export function sheetDrag(onClose: () => void) {
  let startY: number | null = null;
  let dy = 0;
  const reset = (el: HTMLElement) => {
    el.style.transition = "transform 0.2s ease-out";
    el.style.transform = "";
    window.setTimeout(() => (el.style.transition = ""), 220);
  };
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      const top = e.currentTarget.getBoundingClientRect().top;
      // Only from the top of the sheet, so lists and buttons below work as usual
      if (e.clientY - top > 64) return;
      startY = e.clientY;
      dy = 0;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // No live pointer to capture (rare); the pull still works without it
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (startY === null) return;
      dy = Math.max(0, e.clientY - startY);
      if (dy > 4) e.currentTarget.style.transform = `translateY(${dy}px)`;
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (startY === null) return;
      startY = null;
      if (dy > 90) onClose();
      else reset(e.currentTarget);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      startY = null;
      reset(e.currentTarget);
    },
  };
}

/** A full-width button in thumb reach that closes the sheet */
export function DoneButton({ onClick, label = "Done" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 w-full shrink-0 rounded-xl border border-white/10 bg-white/[0.07] text-[15px] font-semibold text-white/90 active:scale-[0.98] transition"
    >
      {label}
    </button>
  );
}

/** "‹ Back" for full screens (top left, where phones put Back) */
export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 -ml-2 pl-2 pr-3 shrink-0 rounded-xl flex items-center gap-1 text-[15px] font-semibold text-white/85 active:bg-white/[0.08]"
    >
      <span aria-hidden="true" className="text-[22px] leading-none">‹</span>
      {label}
    </button>
  );
}
