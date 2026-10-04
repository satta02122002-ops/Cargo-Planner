/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1120",
        panel: "#111a2e",
        line: "#1f2a44",
        muted: "#8aa0c6",
        accent: "#38bdf8",
        ok: "#22c55e",
        warn: "#f59e0b",
        err: "#ef4444",
      },
    },
  },
  plugins: [],
};
