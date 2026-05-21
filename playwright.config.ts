import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4189)
const baseURL = `http://localhost:${port}`
const wranglerConfig = process.env.E2E_WRANGLER_CONFIG ?? 'tests/e2e/wrangler.toml'
const persistStatePath = process.env.E2E_PERSIST_STATE_PATH ?? 'tests/e2e/.wrangler/state'

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  workers: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: [
      `CF_WRANGLER_CONFIG=${wranglerConfig}`,
      `CF_PERSIST_STATE_PATH=${persistStatePath}`,
      `npm run dev -- --host 127.0.0.1 --mode e2e --port ${port}`,
    ].join(' '),
    reuseExistingServer: false,
    url: baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
