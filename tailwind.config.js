/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', '"Vazirmatn Variable"', 'system-ui', 'sans-serif'],
        fa: ['"Vazirmatn Variable"', '"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"Vazirmatn Variable"', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        muted: c('muted'),
        line: c('line'),
        'line-strong': c('line-strong'),
        ink: c('ink'),
        sub: c('sub'),
        brand: c('brand'),
        'brand-soft': c('brand-soft'),
        wine: c('wine'),
        good: c('good'),
        warn: c('warn'),
        bad: c('bad'),
        band: c('band'),
        'on-band': c('on-band'),
        'band-sub': c('band-sub'),
        'band-line': c('band-line'),
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px' },
      boxShadow: {
        card: '0 1px 2px rgb(10 12 16 / 0.04), 0 8px 24px -16px rgb(10 12 16 / 0.18)',
        float: '0 4px 14px -6px rgb(10 12 16 / 0.24)',
        pop: '0 18px 48px -16px rgb(10 12 16 / 0.42)',
      },
      transitionTimingFunction: { spring: 'cubic-bezier(.2,.9,.3,1.2)' },
    },
  },
  plugins: [],
}
