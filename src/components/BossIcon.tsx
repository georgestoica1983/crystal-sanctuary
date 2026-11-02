"use client";

import React from "react";
import type { BossRuleId } from "@/types/game";
import { BOSS_RULE_REGISTRY } from "@/lib/engine";
import { bossArt } from "@/lib/art";

/** A Boss's painted portrait (public/art/icons/boss-*.png), at any size */
export default function BossIcon({ id, size, className = "" }: { id: BossRuleId; size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bossArt(id)}
      alt={BOSS_RULE_REGISTRY[id].name}
      draggable={false}
      className={`inline-block shrink-0 object-contain select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
