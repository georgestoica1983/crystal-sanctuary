import React from "react";
import { unlockArt } from "@/lib/art";

/** An unlock's painted art (rank, board look, title, companion), or its emoji where there is none (line colours) */
export default function UnlockIcon({ item, size, className = "" }: { item: { id: string; icon: string }; size?: number; className?: string }) {
  const art = unlockArt(item.id);
  if (!art) return <span className={className} aria-hidden="true">{item.icon}</span>;
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
