import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo-name>/, so production builds need
// that sub-path as their base. The deploy workflow injects VITE_BASE_PATH from
// the repository name; local dev stays at the root so the Sigma Plugin Dev
// Playground (which points at http://localhost:3000) resolves directly.
const DEFAULT_BASE = '/sigma-data-explorer-plugin/';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? (process.env.VITE_BASE_PATH ?? DEFAULT_BASE) : '/',
  server: {
    port: 3000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
