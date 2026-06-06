// VERSION: Vite 8 + Tailwind v4 + React 19
// DO NOT use old v3 Tailwind syntax in this project
// DO NOT use rollupOptions (use rolldownOptions)

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
