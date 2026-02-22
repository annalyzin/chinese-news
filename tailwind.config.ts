import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        noto: ['var(--font-noto-sc)', 'var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
