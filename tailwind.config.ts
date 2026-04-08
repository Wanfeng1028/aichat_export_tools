import type { Config } from 'tailwindcss';

export default {
  content: ['./src/ui/**/*.{html,tsx,ts}', './src/ui/**/*.html'],
  theme: {
    extend: {
      colors: {
        ink: '#101828',
        mist: '#dce6f2',
        tide: '#6d8aa8',
        foam: '#f7fbff',
        ember: '#e67e22'
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        panel: '0 18px 40px rgba(16, 24, 40, 0.12)'
      }
    }
  },
  plugins: []
} satisfies Config;
