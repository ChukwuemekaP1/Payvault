import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#FF5C2B",
        background: "#0d0d0f",
        surface: "#1a1a1f",
        border: "#2a2a30",
        success: "#00C97A",
        error: "#FF3B3B",
        warning: "#FFB800",
        text: "#e8e6e0",
        muted: "#6b6872",
      },
      fontFamily: {
        serif: ["Instrument Serif", "serif"],
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Syne", "sans-serif"],
      },
      keyframes: {
        flash: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3", backgroundColor: "#FFB800" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 92, 43, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 92, 43, 0.6)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        flash: "flash 0.5s ease-in-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.25s ease-out",
        "slide-out": "slide-out 0.25s ease-in",
        shimmer: "shimmer 2s infinite linear",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "scale-in": "scale-in 0.2s ease-out",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #FF5C2B 0%, #ff8c5a 100%)",
        "gradient-surface": "linear-gradient(135deg, #1a1a1f 0%, #222228 100%)",
        "gradient-card": "linear-gradient(145deg, #1a1a1f 0%, #141418 100%)",
        shimmer: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.6)",
        glow: "0 0 24px rgba(255, 92, 43, 0.35)",
        "glow-sm": "0 0 12px rgba(255, 92, 43, 0.2)",
        "inner-border": "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
