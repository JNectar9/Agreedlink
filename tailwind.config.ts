import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#172554',
        brand: { DEFAULT: '#2563EB', hover: '#1D4ED8', soft: '#EFF6FF' },
        page: '#F8FAFC',
        ink: '#0F172A',
        muted: '#64748B',
        line: '#E2E8F0',
        ok: { DEFAULT: '#15803D', bg: '#F0FDF4' },
        warn: { DEFAULT: '#B45309', bg: '#FFFBEB' },
        bad: { DEFAULT: '#B91C1C', bg: '#FEF2F2' }
      },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};

export default config;
