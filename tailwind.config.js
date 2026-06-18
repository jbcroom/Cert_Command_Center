/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0F1117',
        'bg-surface': '#1A1D2E',
        'bg-elevated': '#242840',
        'accent-blue': '#3B82F6',
        'accent-gold': '#F59E0B',
        'accent-teal': '#14B8A6',
        'text-primary': '#F1F5F9',
        'text-muted': '#64748B',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
