import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
