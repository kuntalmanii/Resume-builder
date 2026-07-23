/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'th-bg':       'var(--bg)',
        'th-card':     'var(--card)',
        'th-border':   'var(--border)',
        'th-text':     'var(--text)',
        'th-text2':    'var(--text-secondary)',
        'th-text3':    'var(--text-muted)',
        'th-primary':  'var(--primary)',
        'th-primary2': 'var(--primary-2)',
        'th-input':    'var(--input-bg)',
        'th-inputb':   'var(--input-border)',
        'success':     '#22C55E',
        'danger':      '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '22px',
        '4xl': '28px',
      },
      boxShadow: {
        'theme':      'var(--shadow)',
        'theme-lg':   'var(--shadow-lg)',
        'theme-hover':'var(--shadow-hover)',
        'glow':       'var(--glow)',
        'premium':    '0 0 0 1px rgba(109,74,255,0.08), 0 8px 48px rgba(109,74,255,0.10)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease both',
        'slide-up': 'slideUp 0.4s ease both',
        'pulse-slow': 'pulse 3s ease infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      transitionDuration: { '300': '300ms' },
    },
  },
  plugins: [],
};
