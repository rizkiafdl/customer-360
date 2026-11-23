/// <reference types="vitest/config" />
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the repo under /customer-360/. Dev and preview use it
  // too, so paths are the same everywhere.
  base: '/customer-360/',
  plugins: [react(), tailwindcss()],
  build: {
    // The data JSON (~1.1 MB) is bundled on purpose (docs/adr/0001), so the
    // one chunk is ~1.9 MB (~360 kB gzip). Warn only above 2 MB.
    chunkSizeWarningLimit: 2048,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'eslint.config.test.ts'],
    css: true,
    // Reported in the CI job summary, not enforced (docs/adr/0003).
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**', 'scripts/**'],
    },
  },
})
