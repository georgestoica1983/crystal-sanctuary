"use client";

import React from "react";
import { RelicId } from "@/types/game";
import { relicArt } from "@/lib/art";

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
