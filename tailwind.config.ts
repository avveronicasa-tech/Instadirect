import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#7C4DFF",
          bg: "#F6F7F9",
          sidebar: "#FFFFFF",
          border: "#E7E8EC",
        },
      },
    },
  },
  plugins: [],
};
export default config;
