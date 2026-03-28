import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans KR',
          'Apple SD Gothic Neo',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        system: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        playfair: [
          'Playfair Display',
          'ui-serif',
          'Georgia',
          'serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
