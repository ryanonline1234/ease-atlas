import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Browser probe: starts the Vite playground, drives it with Playwright, and
// measures the ridden marker against the parsed function. Run with `npm run probe`.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.probe.ts'],
    sequence: { concurrent: false },
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
})
