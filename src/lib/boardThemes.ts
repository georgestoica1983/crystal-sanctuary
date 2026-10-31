import type { CSSProperties } from "react";
import { BoardThemeId } from "@/types/game";

/**
 * Garden board colour themes (looks only): the frame and the tile plates.
 * Tile icons, numbers and the striped harmful tiles keep their colours, so
 * every theme reads the same. Applied as CSS variables on the board.
 */
export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  icon: string;
  frame: string;
  border: string;
  plateTop: string;
  plateBottom: string;
  plateTopHover: string;
  plateBottomHover: string;
  /** Soft glow around the frame (Night Garden's fireflies, Royal's gold) */
  glow?: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: "SPRING", name: "Spring", icon: "🌱", frame: "#10162A", border: "rgba(255,255,255,0.07)", plateTop: "#252D52", plateBottom: "#1B213E", plateTopHover: "#2C3560", plateBottomHover: "#202749" },
  { id: "AUTUMN", name: "Autumn", icon: "🍂", frame: "#1C130E", border: "rgba(251,146,60,0.28)", plateTop: "#4A2F1F", plateBottom: "#352116", plateTopHover: "#563823", plateBottomHover: "#3F2819" },
  { id: "NIGHT", name: "Night Garden", icon: "🌙", frame: "#060A1A", border: "rgba(147,197,253,0.22)", plateTop: "#18214B", plateBottom: "#0F1535", plateTopHover: "#1F2959", plateBottomHover: "#141B41", glow: "0 0 26px rgba(253,230,138,0.18), inset 0 0 30px rgba(190,242,100,0.06)" },
  { id: "WINTER", name: "Winter Frost", icon: "❄️", frame: "#0D1824", border: "rgba(186,230,253,0.32)", plateTop: "#2A4259", plateBottom: "#1C3044", plateTopHover: "#33506B", plateBottomHover: "#233A51" },
  { id: "GOLDEN", name: "Golden Hour", icon: "🌾", frame: "#1D1507", border: "rgba(253,224,71,0.3)", plateTop: "#4A3815", plateBottom: "#33270D", plateTopHover: "#584219", plateBottomHover: "#3D2E10" },
  { id: "ROYAL", name: "Royal Garden", icon: "👑", frame: "#08170F", border: "rgba(250,204,21,0.5)", plateTop: "#1E412D", plateBottom: "#132C1F", plateTopHover: "#254C36", plateBottomHover: "#183726", glow: "0 0 22px rgba(250,204,21,0.2)" },
];

export const getBoardTheme = (id?: BoardThemeId): BoardTheme =>
  BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];

/** CSS variables read by the garden board (GridCanvas) */
export function boardThemeStyle(id?: BoardThemeId): CSSProperties {
  const t = getBoardTheme(id);
  return {
    "--board-frame": t.frame,
    "--board-border": t.border,
    "--plate-top": t.plateTop,
    "--plate-bottom": t.plateBottom,
    "--plate-top-hover": t.plateTopHover,
    "--plate-bottom-hover": t.plateBottomHover,
    "--board-glow": t.glow ?? "none",
  } as CSSProperties;
}
