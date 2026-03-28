import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: 0,
  fullyParallel: true,
  // Start backend (uvicorn) in background and Vite dev in foreground via one command
  webServer: {
    command:
      'bash -lc "cd .. && cd backend && .venv312/bin/python seed.py && .venv312/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 & cd ../frontend && npm run dev -- --port 5175"',
    url: 'http://localhost:5175',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    headless: true,
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
