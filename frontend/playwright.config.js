import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Playwright starts both servers and tears them down after the run. Locally an already
  // running dev server is reused (run_dev.ps1 or a manual `python main.py`); CI always
  // starts its own. The backend needs its users seeded first: `python scripts/seed_e2e_users.py`
  // from backend/ with FLASK_ENV=development (tests.yml and scripts/preflight.ps1 do that).
  webServer: [
    {
      command: 'python main.py',
      cwd: '../backend',
      env: {
        FLASK_ENV: 'development',
        FLASK_USE_RELOADER: 'False',
        FLASK_DEBUG: 'True',
      },
      url: 'http://localhost:8000/server/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
