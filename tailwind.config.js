/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        magazine: {
          accent: '#b1976b',
          paper: '#fdfdfc',
          obsidian: '#0a0a0a',
        }
      },
      letterSpacing: {
        'ultra-wide': '0.3em',
        'tightest': '-0.04em',
      }
    },
  },
  plugins: [],
}