import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 16px 45px rgba(15, 23, 42, 0.10)",
        fairy: "0 18px 50px rgba(47, 143, 107, 0.14)",
      },
      colors: {
        ink: "#17201A",
        mint: "#2F8F6B",
        coral: "#E56B5D",
        gold: "#D7A83F",
        sky: "#4D8BC8",
        pearl: "#FFFDF7",
        lavender: "#A78BFA",
        petal: "#F4A7B9",
      },
    },
  },
  plugins: [],
};

export default config;
