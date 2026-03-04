/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark financial theme background
        'fin-bg': '#0b0e11',
        'fin-card': '#151a21',
        'fin-border': '#2a3441',
        
        // Candlestick colors
        'bullish': '#ff3333',
        'bearish': '#00cc00',
        
        // Accent gold
        'gold': '#c5a065',
        'gold-light': '#d4b87a',
        
        // Text colors
        'text-primary': '#e8eaed',
        'text-secondary': '#9aa0a6',
        'text-muted': '#5f6368',
      },
    },
  },
  plugins: [],
}
