// Smoke tests against the production build. The web server serves the
// existing dist/, so run `npm run build` first. CI reuses the dist/ that the
// "checks" job built (docs/adr/0003-engineering-workflow.md).
import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:4173/customer-360/'

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
