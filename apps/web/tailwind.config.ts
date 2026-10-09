/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,tsx}',
    './lib/**/*.{js,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand: Forest Green palette (#0F3821 primary)
        brand: {
          950: '#071A10',
          900: '#0F3821',
          800: '#14462A',
          700: '#1A4D2E',
          600: '#23653E',
          500: '#2D8050',
          400: '#40A36B',
          300: '#68C391',
          200: '#A1DEBD',
          100: '#D5F2E2',
          50: '#F0F9F4',
        },
        // Brand accent: Warm Gold (#D4AF37 primary)
        gold: {
          900: '#8A6E18',
          800: '#A98720',
          700: '#C29B27',
          600: '#D4AF37',
          500: '#DFC05A',
          400: '#E9D182',
          300: '#F1E1AB',
          200: '#F8F1D4',
          100: '#FDFBEF',
          50: '#FFFEF8',
        },
        // Surface tokens
        surface: {
          DEFAULT: '#F8FAFC',
          light: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          darkCard: '#13231B',
          darkBg: '#09150E',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
        card: '0 4px 20px -2px rgba(15, 56, 33, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card-hover':
          '0 10px 25px -3px rgba(15, 56, 33, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
        'gold-glow': '0 0 20px -3px rgba(212, 175, 55, 0.35)',
        'forest-glow': '0 0 25px -5px rgba(15, 56, 33, 0.4)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2.5s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
