/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: ({ opacityValue }) => opacityValue !== undefined ? `rgba(193, 122, 43, ${opacityValue})` : '#C17A2B',
          light: ({ opacityValue }) => opacityValue !== undefined ? `rgba(212, 149, 74, ${opacityValue})` : '#D4954A',
          dark: ({ opacityValue }) => opacityValue !== undefined ? `rgba(154, 94, 26, ${opacityValue})` : '#9A5E1A',
        },
        bg: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        success: ({ opacityValue }) => opacityValue !== undefined ? `rgba(46, 204, 130, ${opacityValue})` : '#2ECC82',
        warning: ({ opacityValue }) => opacityValue !== undefined ? `rgba(245, 166, 35, ${opacityValue})` : '#F5A623',
        danger: ({ opacityValue }) => opacityValue !== undefined ? `rgba(232, 69, 90, ${opacityValue})` : '#E8455A',
        info: ({ opacityValue }) => opacityValue !== undefined ? `rgba(74, 158, 245, ${opacityValue})` : '#4A9EF5',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
