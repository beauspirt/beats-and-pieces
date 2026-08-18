import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#121212",
        foreground: "#EDEDED",
        surface: {
          DEFAULT: "#181818",
          card: "#181818",
          subtle: "#121212",
          border: "#262626",
          hover: "#222222",
        },
        brand: {
          DEFAULT: "#7B61FF",
          hover: "#684DE6",
          subtle: "#7B61FF20",
        },
        flame: {
          DEFAULT: "#FF5E3A",
          hover: "#FF451A",
          subtle: "#FF5E3A20",
        },
        podium: {
          gold: "#F59E0B",
          silver: "#94A3B8",
          bronze: "#D97706",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
