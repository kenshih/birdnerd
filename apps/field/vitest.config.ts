import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Scope to src so Playwright specs under e2e/ aren't swallowed by the
    // default {test,spec} glob. E2E runs via `npm run test:e2e` (Playwright).
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
