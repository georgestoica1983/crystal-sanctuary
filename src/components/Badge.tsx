import React from "react";
import { badgeArt, type BadgeId } from "@/lib/art";

/** A small painted badge (star, crown, flame, lock, gems, seed) sitting in a line of text */
export default function Badge({ id, size, className = "" }: { id: BadgeId; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={badgeArt(id)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`inline-block shrink-0 object-contain select-none ${size ? "" : "h-[1.15em] w-[1.15em] align-[-0.2em]"} ${className}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}
