/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1565C0', dark: '#0D47A1', light: '#42A5F5', soft: '#E3F2FD' },
        lc: {
          bg: '#F5F9FF',
          surface: '#FFFFFF',
          textPrimary: '#172B4D',
          textSecondary: '#60758A',
          success: '#16803C',
          danger: '#D32F2F',
          warning: '#F59E0B',
          border: '#DCE7F5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontVariantNumeric: ['tabular-nums'],
    },
  },
  plugins: [],
}
