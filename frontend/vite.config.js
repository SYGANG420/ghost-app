import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://89.127.235.242',
      '/ws': {
        target: 'ws://89.127.235.242',
        ws: true,
      },
    },
  },
});
