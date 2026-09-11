import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo: funciona tanto no GitHub Pages em subpasta (/Teste/)
// quanto em qualquer outro host, sem precisar reconfigurar.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false, target: 'es2019' },
});
