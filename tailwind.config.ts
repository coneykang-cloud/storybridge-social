import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50:  '#F0FAFA',
          100: '#E8F5F5',
          200: '#C8EAEA',
          300: '#A8D8D8',
          400: '#88C8C8',
          500: '#68B8B8',
          600: '#489898',
          700: '#307878',
        },
        lavender: {
          100: '#EDE8F8',
          200: '#DDD0F0',
          300: '#C9B8E8',
          400: '#B5A0E0',
        },
        coral: {
          300: '#F8A888',
          400: '#F49070',
          500: '#F08060',
          600: '#E86840',
        },
        ivory:    '#FAF8F3',
        charcoal: '#2C2C2A',
        'success-green': '#5BAD8F',
        'warning-amber': '#F0B030',
        'soft-gray':     '#B0B0A8',
      },
      fontFamily: {
        sans: ['Pretendard', 'Apple SD Gothic Neo', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      minHeight: {
        touch: '48px',
      },
      boxShadow: {
        card:  '0 2px 12px rgba(44,44,42,0.08)',
        coral: '0 4px 12px rgba(240,128,96,0.30)',
        mint:  '0 4px 12px rgba(168,216,216,0.40)',
      },
    },
  },
  plugins: [],
}

export default config
