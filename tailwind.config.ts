import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1B3B2F",
          50: "#E9EFEC",
          100: "#C9D7CF",
          200: "#94B0A1",
          300: "#5F8973",
          400: "#3A6451",
          500: "#1B3B2F",
          600: "#163026",
          700: "#11251D",
          800: "#0C1A14",
          900: "#070F0B",
        },
        cream: {
          DEFAULT: "#F5F1E8",
          50: "#FBF9F3",
          100: "#F5F1E8",
          200: "#EDE6D4",
          300: "#E0D5B8",
        },
        brass: {
          DEFAULT: "#B08D57",
          50: "#F4ECDF",
          100: "#E5D2B0",
          200: "#D1B585",
          300: "#B08D57",
          400: "#8E7044",
          500: "#6C5434",
        },
        charcoal: {
          DEFAULT: "#1F1F1F",
          soft: "#2C2C2C",
          muted: "#5A5A5A",
        },
        line: "#E6DFCC",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: [
          '"Inter"',
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 30, 25, 0.06), 0 1px 0 rgba(20, 30, 25, 0.04)",
        elevated:
          "0 1px 2px rgba(20, 30, 25, 0.08), 0 12px 24px -16px rgba(20, 30, 25, 0.18)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};

export default config;
