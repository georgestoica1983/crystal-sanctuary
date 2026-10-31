import type { Config } from "tailwindcss";

// Moss look: the cool neutrals (slate, zinc, indigo) become moss greens, the
// cool accents (teal, sky) become sage, mint (emerald) becomes a soft leaf
// green, violet/purple multipliers become warm honey, and white is a warm parchment.
const moss = {
  50: "#F2F4EE",
  100: "#E1E6DA",
  200: "#C5CEBB",
  300: "#A3B096",
  400: "#7F8D72",
  500: "#636F58",
  600: "#4C5644",
  700: "#3A4335",
  800: "#2A3127",
  900: "#1D231B",
  950: "#121610",
};
const leaf = {
  50: "#F1F7EC",
  100: "#DDEDD3",
  200: "#C2DFB2",
  300: "#A6CF8F",
  400: "#89BC70",
  500: "#6FA257",
  600: "#578443",
  700: "#446836",
  800: "#33502A",
  900: "#263C20",
  950: "#162414",
};
const honey = {
  50: "#FFF7EB",
  100: "#FDEACC",
  200: "#FAD79F",
  300: "#F5C072",
  400: "#EEA94F",
  500: "#E3913A",
  600: "#C7742C",
  700: "#A15A25",
  800: "#7C4521",
  900: "#5E361D",
  950: "#33190B",
};
const sage = {
  50: "#F3F8EA",
  100: "#E3F0CF",
  200: "#CFE6AE",
  300: "#B9D98C",
  400: "#A1C76E",
  500: "#87AE55",
  600: "#6B8C42",
  700: "#536C35",
  800: "#3F522B",
  900: "#2F3D22",
  950: "#1C2614",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        white: "#F3EEE1",
        slate: moss,
        zinc: moss,
        indigo: moss,
        teal: sage,
        sky: sage,
        emerald: leaf,
        violet: honey,
        purple: honey,
        fuchsia: honey,
        obsidian: "#0A0A0C",
        slateCell: "#141418",
        slateBorder: "#26262E",
        crimson: "#F43F5E",
        cyanShield: "#06B6D4",
        amberWeapon: "#F59E0B",
        emeraldPotion: "#10B981",
        goldHex: "#EAB308",
        violetPortal: "#8B5CF6",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
