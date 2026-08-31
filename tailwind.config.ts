import type { Config } from "tailwindcss";

/**
 * Colours resolve to the CSS custom properties defined in app/globals.css
 * (imported from design/tokens.css). Never hard-code a hex in a component -
 * use these names so light/dark and any future re-theme stay in one place.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "on-primary": "var(--on-primary)",
        link: "var(--link)",
        "brand-wash": "var(--brand-wash)",
        gold: "var(--pretag-gold)",
        "gold-wash": "var(--gold-wash)",
        olive: "var(--pretag-olive)",
        grow: "var(--grow)",
        "grow-wash": "var(--grow-wash)",
        stable: "var(--stable)",
        "stable-wash": "var(--stable-wash)",
        decline: "var(--decline)",
        "decline-wash": "var(--decline-wash)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
    },
  },
  plugins: [],
};

export default config;
