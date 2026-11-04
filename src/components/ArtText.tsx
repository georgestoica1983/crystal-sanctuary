"use client";

import React from "react";
import { badgeArt, bossArt, companionArt, icon, miscArt, statArt, tileArt } from "@/lib/art";

/**
 * Teaching text, tips and messages still name tiles with emoji (🌺 Thorn,
 * 🌈 Exit…). `artify` swaps those emoji for the game's illustrated icons, so
 * the words match what the board shows. It walks plain elements and their
 * children; it skips SVG and form fields, and never looks inside components.
 */
const ART: Record<string, string> = {
  "❤": statArt("life"),
  "🧤": statArt("gloves"),
  "✂": statArt("shears"),
  "🌱": statArt("seeds"),
  "🌺": tileArt("ENEMY") ?? "",
  "🌈": tileArt("EXIT") ?? "",
  "🍓": tileArt("POTION") ?? "",
  "🌰": tileArt("GOLD") ?? "",
  "🐱": companionArt("KNIGHT"),
  "🌸": tileArt("ENEMY", { bloomed: true }) ?? "",
  "⭐": badgeArt("star"),
  "👑": badgeArt("crown"),
  "🔥": badgeArt("flame"),
  "🔒": badgeArt("lock"),
  // Garden moments: 🔄 Swap and ⛔ no safe line are this game's own markers
  // (🌿 and 🪨 mean other things elsewhere)
  "🔄": miscArt("swap"),
  "⛔": miscArt("no-safe-line"),
  "📖": miscArt("journal"),
  "🌞": miscArt("daily"),
  "🎵": miscArt("music"),
  "💡": miscArt("hint"),
  // Special tiles and the Toll in notices (✨ and 🪙 mean other things)
  "💛": badgeArt("golden"),
  "🔮": badgeArt("iridescent"),
  "💠": badgeArt("radiant"),
  "🎟": bossArt("TOLL"),
  // Rules v26 and the lessons: 💮 full bloom, 🥀 the garden grows wilder, 🟫 bare ground, 🪴 Seedling Season
  "💮": miscArt("full-bloom"),
  "🥀": miscArt("wilder"),
  "🟫": icon("tile-bare-a"),
  "🪴": miscArt("seedling"),
};
const ART_RE = /(❤️?|🧤|✂️?|🌱|🌺|🌈|🍓|🌰|🐱|🌸|⭐|👑|🔥|🔒|🔄|⛔|📖|🌞|🎵|💡|💛|🔮|💠|🎟️?|💮|🥀|🟫|🪴)/gu;
const SKIP = new Set(["svg", "textarea", "input", "option", "title", "select"]);

function artifyString(text: string, keyBase: string): React.ReactNode {
  if (!ART_RE.test(text)) return text;
  ART_RE.lastIndex = 0;
  return text.split(ART_RE).map((part, i) => {
    const src = ART[part.replace("️", "")];
    if (!src) return <React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`${keyBase}-${i}`}
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="inline-block align-[-0.2em] h-[1.15em] w-[1.15em] object-contain select-none"
      />
    );
  });
}

export function artify(node: React.ReactNode, keyBase = "a"): React.ReactNode {
  if (typeof node === "string") return artifyString(node, keyBase);
  // A list from .map already carries its keys; split strings get keyed parts
  if (Array.isArray(node)) return node.map((n, i) => artify(n, `${keyBase}.${i}`));
  if (!React.isValidElement(node)) return node;
  const el = node as React.ReactElement<{ children?: React.ReactNode; dangerouslySetInnerHTML?: unknown }>;
  if (typeof el.type === "string" && SKIP.has(el.type)) return el;
  if (el.props.dangerouslySetInnerHTML || el.props.children === undefined) return el;
  if (typeof el.props.children === "function") return el;
  // Hand static children back one by one (as JSX wrote them) so React doesn't ask for keys
  const kids = el.props.children;
  if (Array.isArray(kids)) return React.cloneElement(el, undefined, ...kids.map((k, i) => artify(k, `${keyBase}.${i}`)));
  return React.cloneElement(el, undefined, artify(kids, keyBase));
}
