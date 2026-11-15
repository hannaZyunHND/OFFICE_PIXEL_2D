/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['Silkscreen', 'JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        void: 'var(--color-canvas-void)',
        hud: {
          bg: 'var(--color-background)',
          card: 'var(--color-card)',
          muted: 'var(--color-muted)',
          border: 'var(--color-border)',
          fg: 'var(--color-foreground)',
          sub: 'var(--color-muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          godview: 'var(--color-godview)',
          handoff: 'var(--color-handoff)',
          editmode: 'var(--color-editmode)',
          danger: 'var(--color-destructive)',
        },
      },
    },
  },
  plugins: [],
};
