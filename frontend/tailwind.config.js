/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0D1117",
        panel: "#151B23",
        line: "#2A313C",
        ink: "#E6EDF3",
        muted: "#8B95A1",
        add: "#3FB950",
        addDim: "#1F3A28",
        del: "#F85149",
        delDim: "#3D2224",
        amber: "#D29922",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
