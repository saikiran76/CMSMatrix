/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Mona Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#646cff',
        secondary: '#535bf2',
        dark: {
          DEFAULT: '#1E1E2D',
          lighter: '#2D2D3F',
          darker: '#1a1a1a'
        },
        success: '#22c55e',
        error: '#ef4444',
        gray: {
          400: '#a1a1b5',
          600: '#4a4a6a',
        }
      }
    },
  },
  plugins: [],
}