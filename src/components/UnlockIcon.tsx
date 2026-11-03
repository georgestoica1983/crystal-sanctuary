import React from "react";
import { unlockArt } from "@/lib/art";
import { TRAIL_SKINS } from "@/lib/engine";
import { UNLOCKS } from "@/lib/unlocks";

/** An unlock's painted art (rank, board look, title, companion); a line colour shows a swatch of its colour */
export default function UnlockIcon({ item, size, className = "" }: { item: { id: string; icon: string }; size?: number; className?: string }) {
  const art = unlockArt(item.id);
  if (!art) {
    const unlock = UNLOCKS.find((u) => u.id === item.id);
    const color = unlock?.kind === "TRAIL" ? TRAIL_SKINS.find((t) => t.id === unlock.target)?.primaryStroke : undefined;
    if (!color) return <span className={className} aria-hidden="true">{item.icon}</span>;
    const d = size ?? 18;
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 rounded-full align-middle ${className}`}
        style={{ width: d * 1.4, height: Math.max(5, d * 0.35), backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={art}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`inline-block shrink-0 object-contain ${size ? "" : "h-[1.3em] w-[1.3em] align-[-0.3em]"} ${className}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}
