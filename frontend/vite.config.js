import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://ghost-control.duckdns.org',
      '/ws': {
        target: 'wss://ghost-control.duckdns.org',
        ws: true,
      },
    },
  },
});
