/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#071A10',
          900: '#0F3821', // Primary brand deep forest green
          800: '#14462A',
          700: '#1A4D2E', // Secondary dark forest green
          600: '#23653E',
          500: '#2D8050',
          400: '#40A36B',
          300: '#68C391',
          200: '#A1DEBD',
          100: '#D5F2E2',
          50: '#F0F9F4',
        },
        gold: {
          900: '#8A6E18',
          800: '#A98720',
          700: '#C29B27',
          600: '#D4AF37', // Brand accent warm gold
          500: '#DFC05A',
          400: '#E9D182',
          300: '#F1E1AB',
          200: '#F8F1D4',
          100: '#FDFBEF',
          50: '#FFFEF8',
        },
        surface: {
          light: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          darkCard: '#13231B',
          darkBg: '#09150E'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
        'card': '0 4px 20px -2px rgba(15, 56, 33, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 25px -3px rgba(15, 56, 33, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
        'gold-glow': '0 0 20px -3px rgba(212, 175, 55, 0.35)',
        'forest-glow': '0 0 25px -5px rgba(15, 56, 33, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2.5s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
