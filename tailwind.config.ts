import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#071A3D', 2: '#0C2757' },
        brand: { DEFAULT: '#1769FF', hover: '#0F52CC', soft: '#EAF2FF' },
        page: '#F6F9FF',
        ink: '#0F172A',
        muted: '#64748B',
        line: '#E1E8F5',
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
