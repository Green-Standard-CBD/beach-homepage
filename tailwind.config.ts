import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FDFAF6',
        sand: {
          100: '#F0EAE0',
          200: '#E0D4C4',
          300: '#C8B49A',
          400: '#A89070',
          500: '#7A6654',
        },
        shore: '#2A2520',
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-noto)', 'Hiragino Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
