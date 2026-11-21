import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fundo: '#0F1F2B',
        superficie: '#172C3B',
        superficie2: '#1E3749',
        borda: '#26435A',
        destaque: '#52BBF6',
        acao: '#FF5A12',
        texto: '#E6EEF4',
        suave: '#9DB2C2',
        apagado: '#6F8798',
        bom: '#3DD68C',
        alerta: '#F5B83D',
        ruim: '#F0605D',
      },
      fontFamily: {
        titulo: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
