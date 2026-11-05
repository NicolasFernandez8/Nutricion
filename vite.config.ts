import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona igual en web (GitHub Pages), Android (Capacitor) y escritorio (Electron)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
});
