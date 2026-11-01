"use client";

import React from "react";
import { RelicId } from "@/types/game";
import { relicArt, relicHasArt } from "@/lib/art";
import { RELIC_REGISTRY } from "@/lib/engine";

/** A relic's illustrated icon (public/art/icons/relic-*.png) */
export default function RelicIcon({
  id,
  size = 24,
  className = "",
}: {
  id: RelicId;
  size?: number | string;
  className?: string;
}) {
  const px = typeof size === "number" ? `${size}px` : size;
  if (!relicHasArt(id)) {
    // New relics show their emoji until their illustrated icon is drawn
    return (
      <span
        aria-hidden="true"
        className={`shrink-0 inline-flex items-center justify-center select-none pointer-events-none leading-none ${className}`}
        style={{ width: px, height: px, fontSize: typeof size === "number" ? `${Math.round(size * 0.78)}px` : "1em" }}
      >
        {RELIC_REGISTRY[id]?.icon}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={relicArt(id)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`shrink-0 object-contain select-none pointer-events-none ${className}`}
      style={{ width: px, height: px }}
    />
  );
}
