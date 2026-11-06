import { defineConfig } from '@playwright/test'

const port = process.env.PLAYWRIGHT_PORT ?? '5173'
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('PLAYWRIGHT_PORT must be a valid TCP port.')
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 3,
  reporter: 'list',
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'narrow', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npm run dev -- --host=127.0.0.1 --port=${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_PORT,
  },
})
