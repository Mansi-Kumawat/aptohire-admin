import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'frontend',
  envDir: '..',
  publicDir: '../public',
  plugins: [react()],
  server: { fs: { allow: ['..'] }, allowedHosts: ['.e2b.app'] },
  preview: { allowedHosts: ['.e2b.app'] },
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false },
  test: { environment: 'jsdom', setupFiles: '../tests/setup.ts', include: ['../tests/**/*.test.ts', '../tests/**/*.test.tsx'] },
});
