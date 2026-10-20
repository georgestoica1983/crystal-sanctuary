"use client";

import React, { useId } from "react";
import { Shield, Crown, Sparkles, Compass } from "lucide-react";
import { EntityType, HeroClassId, SanctuaryCompanionId } from "@/types/game";

export interface EntityIconProps {
  type: EntityType | "POISON_POTION";
  className?: string;
  size?: number | string;
  companionId?: HeroClassId | SanctuaryCompanionId;
  isCorrupted?: boolean;
  /** Briar already cleared by the line: drawn as an opened flower */
  isBloomed?: boolean;
  /** Soft coloured glow around the glyph (used on board tiles) */
  glow?: boolean;
}

/** Theme colour for each tile type, shared by icons, value badges and legends */
export const ENTITY_COLORS: Record<string, string> = {
  SHIELD: "#06B6D4",
  WEAPON: "#F59E0B",
  POTION: "#10B981",
  POISON_POTION: "#A855F7",
  GOLD: "#EAB308",
  ENEMY: "#F43F5E",
  TRAP: "#EC4899",
  EXIT: "#A855F7",
  HERO: "#FDE047",
};

/**
 * Unified themed icon for HUD pills, grid tiles, legends and modals:
 * 💧 Dew, ☀️ Sunbeam, 🍓 Berries, 💎 Gem, 🌺 Briar, 🌵 Thistle, 🌈 Archway.
 * Drawn as SVG so colours stay exact on every device.
 */
export default function EntityIcon({
  type,
  className = "w-4 h-4",
  size = 18,
  companionId = "KNIGHT",
  isCorrupted = false,
  isBloomed = false,
  glow = false,
}: EntityIconProps) {
  const uid = useId().replace(/:/g, "");
  const pixelSize = typeof size === "number" ? `${size}px` : size;
  const corrupted = isCorrupted || type === "POISON_POTION";
  const color =
    type === "POTION" && corrupted
      ? ENTITY_COLORS.POISON_POTION
      : ENTITY_COLORS[type] ?? "#FFFFFF";
  const svgProps = {
    viewBox: "0 0 24 24",
    className: `shrink-0 overflow-visible ${className}`,
    style: {
      width: pixelSize,
      height: pixelSize,
      filter: glow ? `drop-shadow(0 0 4px ${color}aa)` : undefined,
    },
    fill: "none",
    "aria-hidden": true,
  } as const;

  switch (type) {
    case "HERO": {
      const isMage = companionId === "MAGE" || companionId === "FOX";
      const isVampire = companionId === "VAMPIRE" || companionId === "BUTTERFLY";
      const isRogue = companionId === "ROGUE" || companionId === "OTTER";

      const IconComponent = isVampire
        ? Crown
        : isMage
        ? Sparkles
        : isRogue
        ? Compass
        : Shield;

      return (
        <div
          className={`relative inline-flex items-center justify-center shrink-0 rounded-full border border-cyan-400/80 bg-slate-900/80 shadow-[0_0_8px_rgba(34,211,238,0.5)] ${className}`}
          style={{ width: pixelSize, height: pixelSize }}
        >
          <IconComponent
            className="w-[68%] h-[68%] text-cyan-200"
            strokeWidth={2.5}
          />
        </div>
      );
    }

    case "SHIELD": {
      // 💧 Glossy cyan Dewdrop
      return (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={`dew-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A5F3FC" />
              <stop offset="55%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#0E7490" />
            </linearGradient>
          </defs>
          <path
            d="M12 2.5C12 2.5 5 10.2 5 15a7 7 0 0 0 14 0c0-4.8-7-12.5-7-12.5Z"
            fill={`url(#dew-${uid})`}
            stroke="#06B6D4"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <ellipse
            cx="9.4"
            cy="14"
            rx="1.6"
            ry="2.6"
            transform="rotate(-20 9.4 14)"
            fill="#ECFEFF"
            opacity="0.85"
          />
          <circle cx="10.3" cy="18.2" r="0.8" fill="#ECFEFF" opacity="0.6" />
        </svg>
      );
    }

    case "WEAPON": {
      // ☀️ Radiant amber Sunbeam
      const rays = Array.from({ length: 8 }, (_, i) => i * 45);
      return (
        <svg {...svgProps}>
          <defs>
            <radialGradient id={`sun-${uid}`} cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="60%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
          {rays.map((deg) => (
            <path
              key={deg}
              d="M12 1.6 L13.3 5.2 L10.7 5.2 Z"
              fill="#F59E0B"
              stroke="#F59E0B"
              strokeWidth="0.8"
              strokeLinejoin="round"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
          <circle
            cx="12"
            cy="12"
            r="5.4"
            fill={`url(#sun-${uid})`}
            stroke="#F59E0B"
            strokeWidth="1.2"
          />
        </svg>
      );
    }

    case "POISON_POTION":
    case "POTION": {
      // 🍓 Emerald berry cluster, or sour purple berries with a minus mark
      const berry = corrupted ? "#A855F7" : "#10B981";
      const light = corrupted ? "#E9D5FF" : "#D1FAE5";
      const dark = corrupted ? "#581C87" : "#065F46";
      return (
        <svg {...svgProps}>
          <path
            d="M12 7.5C12 5 13.2 3.4 15.6 2.6M12 7.5c-.6-2.2-2.4-3.4-4.8-3.4 1 1.9 2.6 3 4.8 3.4Z"
            stroke="#22C55E"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="#16A34A"
          />
          {[
            [8.3, 12.2],
            [15.7, 12.2],
            [12, 17.4],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle
                cx={cx}
                cy={cy}
                r="4"
                fill={berry}
                stroke={dark}
                strokeWidth="1"
              />
              <circle cx={cx - 1.3} cy={cy - 1.3} r="1.1" fill={light} opacity="0.8" />
            </g>
          ))}
          {corrupted && (
            <rect x="9.5" y="16.7" width="5" height="1.6" rx="0.8" fill="#FAF5FF" />
          )}
        </svg>
      );
    }

    case "GOLD": {
      // 💎 Faceted golden crystal
      return (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={`gem-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF9C3" />
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#A16207" />
            </linearGradient>
          </defs>
          <path
            d="M6.5 4h11L22 9.3 12 21.5 2 9.3 6.5 4Z"
            fill={`url(#gem-${uid})`}
            stroke="#EAB308"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M2 9.3h20M9 4 7.8 9.3 12 21.5 16.2 9.3 15 4M7.8 9.3 12 4l4.2 5.3"
            stroke="#713F12"
            strokeOpacity="0.55"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path d="M6.6 5.3 4.4 8.3h2.5Z" fill="#FFFBEB" opacity="0.85" />
        </svg>
      );
    }

    case "ENEMY": {
      if (isBloomed) {
        // 🌸 Cleared Briar opens into a flower
        return (
          <svg {...svgProps}>
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse
                key={deg}
                cx="12"
                cy="6.6"
                rx="3.2"
                ry="4.4"
                fill="#F9A8D4"
                stroke="#EC4899"
                strokeWidth="0.8"
                transform={`rotate(${deg} 12 12)`}
              />
            ))}
            <circle cx="12" cy="12" r="2.6" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.8" />
          </svg>
        );
      }
      // 🌺 Thorny crimson rose bud on a spiked stem
      return (
        <svg {...svgProps}>
          <path
            d="M12 15.5V22M12 18.5l-2.6-1.6M12 20.3l2.6-1.4"
            stroke="#22C55E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M9.4 16.9 8 16.6l1-.9Z M14.6 18.9l1.4-.1-.9-1Z" fill="#86EFAC" />
          <path
            d="M12 2.5 19.5 14.2c-2 1.8-4.6 2.5-7.5 2.5s-5.5-.7-7.5-2.5L12 2.5Z"
            fill="#BE123C"
            stroke="#F43F5E"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M12 6.2c-1.5 2.4-1.9 5-.9 8M12 6.2c1.7 2.1 2.6 4.6 2.2 7.8"
            stroke="#FDA4AF"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          {/* Thorns along the bud's edges */}
          <path
            d="M7.6 9.3 5.4 8.9l1.4 1.8Z M16.4 9.3l2.2-.4-1.4 1.8Z M5.6 12.6l-2 .5 1.6 1Z M18.4 12.6l2 .5-1.6 1Z"
            fill="#F43F5E"
          />
        </svg>
      );
    }

    case "TRAP": {
      // 🌵 Spiky magenta Thistle head on a short stem
      const spikes = Array.from({ length: 12 }, (_, i) => i * 30);
      return (
        <svg {...svgProps}>
          <path
            d="M12 15v7M12 19.5c-1.8-.2-3-1.1-3.6-2.6M12 18.6c1.8-.1 3-1 3.6-2.4"
            stroke="#22C55E"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {spikes.map((deg) => (
            <path
              key={deg}
              d="M12 1.5 13 6 11 6Z"
              fill="#EC4899"
              transform={`rotate(${deg} 12 9.5)`}
            />
          ))}
          <circle cx="12" cy="9.5" r="4.6" fill="#9D174D" stroke="#EC4899" strokeWidth="1.3" />
          <path
            d="M9.6 8.4h4.8M9.3 10.4h5.4M10.4 12.2h3.2"
            stroke="#FBCFE8"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    case "EXIT": {
      // 🌈 Shimmering rainbow Gateway Arch
      const bands = [
        { r: 9.5, c: "#F43F5E" },
        { r: 7.9, c: "#F59E0B" },
        { r: 6.3, c: "#10B981" },
        { r: 4.7, c: "#06B6D4" },
        { r: 3.1, c: "#A855F7" },
      ];
      return (
        <svg {...svgProps}>
          <defs>
            <radialGradient id={`arch-${uid}`} cx="50%" cy="85%" r="60%">
              <stop offset="0%" stopColor="#FAF5FF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M2.5 19a9.5 9.5 0 0 1 19 0Z" fill={`url(#arch-${uid})`} />
          {bands.map(({ r, c }) => (
            <path
              key={r}
              d={`M${12 - r} 19a${r} ${r} 0 0 1 ${2 * r} 0`}
              stroke={c}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
          <path d="M1.5 19.8h21" stroke="#C084FC" strokeWidth="1.4" strokeLinecap="round" />
          <path
            d="M12 4.6l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7Z"
            fill="#FFFFFF"
            className="animate-pulse"
          />
        </svg>
      );
    }

    default:
      return null;
  }
}
