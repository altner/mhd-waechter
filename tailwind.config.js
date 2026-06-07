/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0faf4',
          100: '#d9f2e3',
          200: '#b3e5c7',
          300: '#7dcda3',
          400: '#47b07a',
          500: '#2D6A4F',
          600: '#255a43',
          700: '#1d4a36',
          800: '#163928',
          900: '#0f281c',
        },
        mint: '#52B788',
        cream: '#FAFAF7',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      borderRadius: {
        xl: '16px',
      },
    },
  },
  plugins: [],
}
