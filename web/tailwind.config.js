/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Fraunces = expressive serif display (headings, hero numerals).
        // Inter = clean sans body. JetBrains Mono = reference numbers.
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      // Semantic colors driven by CSS variables → instant dark/light theming.
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          muted: 'hsl(var(--surface-muted) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        // Gold — used sparingly for premium micro-accents.
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
      },
      borderRadius: {
        lg: '0.7rem',
        xl: '1rem',
        '2xl': '1.35rem',
        '3xl': '1.85rem',
      },
      boxShadow: {
        // Layered, soft, low-contrast — premium not heavy.
        soft: '0 1px 2px -1px hsl(160 40% 12% / 0.08), 0 1px 3px hsl(160 40% 12% / 0.05)',
        card: '0 1px 3px hsl(160 40% 12% / 0.05), 0 12px 28px -16px hsl(160 40% 12% / 0.18)',
        pop: '0 16px 48px -12px hsl(160 40% 10% / 0.24)',
        glow: '0 0 0 1px hsl(var(--primary) / 0.18), 0 12px 32px -12px hsl(var(--primary) / 0.32)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.97)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-up': 'slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        float: 'float 7s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 12s ease infinite',
      },
    },
  },
  plugins: [],
};
