import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core brand tokens — now CSS-variable-backed so `dark:` / the .dark
        // class switches the whole palette (see globals.css for both sets).
        void: "hsl(var(--background) / <alpha-value>)",   // page background
        steel: "hsl(var(--foreground) / <alpha-value>)",  // body/heading text
        violet: {
          DEFAULT: "hsl(var(--violet) / <alpha-value>)",
          deep: "hsl(var(--violet-deep) / <alpha-value>)",
          glow: "hsl(var(--violet-glow) / <alpha-value>)",
        },
        cyan: {
          DEFAULT: "hsl(var(--cyan) / <alpha-value>)",
          deep: "hsl(var(--cyan-deep) / <alpha-value>)",
        },
        signal: {
          green: "#16A34A",
          red: "hsl(var(--destructive) / <alpha-value>)",
          blue: "hsl(var(--violet) / <alpha-value>)",
          purple: "hsl(var(--violet-deep) / <alpha-value>)",
        },
        // Always-near-black app shell (navbar/sidebar/mobile nav) — same in
        // both light and dark mode, see globals.css for why.
        chrome: {
          DEFAULT: "hsl(var(--chrome-bg) / <alpha-value>)",
          foreground: "hsl(var(--chrome-foreground) / <alpha-value>)",
          border: "hsl(var(--chrome-border) / <alpha-value>)",
          muted: "hsl(var(--chrome-muted) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        wordmark: ["var(--font-wordmark)", "cursive"],
        body: ["var(--font-body)"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, hsl(var(--violet-deep)) 0%, hsl(var(--violet)) 45%, hsl(var(--cyan)) 100%)",
        "brand-radial": "radial-gradient(circle at 30% 20%, hsl(var(--violet) / 0.08), transparent 60%), radial-gradient(circle at 80% 60%, hsl(var(--cyan) / 0.06), transparent 55%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
