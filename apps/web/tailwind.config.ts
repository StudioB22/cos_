import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cos: {
          bg: '#02141b',
          panel: '#072633',
          neon: '#63ffda',
          sky: '#67b6ff',
          ink: '#dbfffa',
          warning: '#ffdc6b',
          danger: '#ff7c7c',
        },
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(99,255,218,0.45), 0 0 30px rgba(37,165,255,0.18)',
      },
      backgroundImage: {
        grid:
          'linear-gradient(rgba(103,182,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(103,182,255,0.08) 1px, transparent 1px)',
      },
      fontFamily: {
        pixel: ['"VT323"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
