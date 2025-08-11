// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",                // toggle dengan .dark di <html>
  theme: {
    extend: {
      colors: { primary: "#ac94d8" },
    },
  },
  plugins: [],
};
