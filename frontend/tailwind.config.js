/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0F1113",
          900: "#14161A",
          800: "#1B1E23",
          700: "#2A2E35",
          600: "#3A3F47",
        },
        paper: {
          100: "#EDEAE3",
          200: "#D8D4C9",
          400: "#9A9689",
        },
        amber: {
          400: "#F0B85A",
          500: "#E8A33D",
          600: "#C8862A",
        },
        signal: {
          500: "#D64545",
          600: "#B93636",
        },
        moss: {
          500: "#5C8A5C",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};