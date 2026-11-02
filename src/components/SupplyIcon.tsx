import React from "react";
import { tagArt, toolArt, upgradeArt } from "@/lib/art";

const ART = { tool: toolArt, upgrade: upgradeArt, tag: tagArt };

/** A garden tool, garden upgrade or skip Tag, drawn as its illustration */
export default function SupplyIcon({
  kind,
  id,
  size = 32,
  className = "",
}: {
  kind: keyof typeof ART;
  id: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ART[kind](id)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
