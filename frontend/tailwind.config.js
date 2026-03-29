/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Cormorant Garamond', 'serif'],
        body: ['Outfit', 'sans-serif'],
      },
      colors: {
        background: {
          DEFAULT: '#060A11',
          surface: '#0B1320',
          glass: 'rgba(11, 19, 32, 0.6)',
        },
        primary: {
          DEFAULT: '#D4AF37',
          hover: '#E6C65C',
          active: '#B5952F',
          foreground: '#060A11',
        },
        secondary: {
          DEFAULT: '#A0AABF',
          foreground: '#F9F9F9',
        },
        accent: {
          oxford: '#8A1538',
          parchment: '#F5F5DC',
        },
        muted: {
          DEFAULT: '#56657F',
          foreground: '#A0AABF',
        },
        text: {
          primary: '#F9F9F9',
          secondary: '#A0AABF',
          muted: '#56657F',
        },
        border: 'rgba(255, 255, 255, 0.08)',
        input: 'rgba(255, 255, 255, 0.08)',
        ring: '#D4AF37',
        card: {
          DEFAULT: '#0B1320',
          foreground: '#F9F9F9',
        },
        popover: {
          DEFAULT: '#0B1320',
          foreground: '#F9F9F9',
        },
        destructive: {
          DEFAULT: '#7f1d1d',
          foreground: '#F9F9F9',
        },
      },
      borderRadius: {
        lg: '1rem',
        md: '0.75rem',
        sm: '0.5rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-up': 'slide-up 0.4s ease-out forwards',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(212, 175, 55, 0.3)',
        'card': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
