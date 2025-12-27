/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./<custom directory>/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ana renkler
        'dark': '#0F172A',
        'dark-light': '#1E293B',
        'dark-surface': 'rgba(255, 255, 255, 0.05)',
        
        // Neon renkler
        'neon-cyan': '#00F2FF',
        'neon-purple': '#BC13FE',
        'neon-pink': '#FF2E93',
        'neon-green': '#39FF14',
        'neon-orange': '#FF6B35',
      },
      borderRadius: {
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
