import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 16px 45px rgba(15, 23, 42, 0.10)",
      },
      colors: {
        ink: "#17201A",
        mint: "#2F8F6B",
        coral: "#E56B5D",
        gold: "#D7A83F",
        sky: "#4D8BC8",
      },
    },
  },
  plugins: [],
};

export default config;
