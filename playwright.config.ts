import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Auth setup — runs first, creates tests/e2e/auth.json
    {
      name: 'setup',
      testMatch: /setup-auth\.ts/,
    },
    // Unauthenticated tests (no storageState needed)
    {
      name: 'public',
      testMatch: /(signup|auth)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    // Authenticated tests
    {
      name: 'authenticated',
      testMatch: /(profile|settings|match-flow|chat)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/auth.json' },
      dependencies: ['setup'],
    },
    // Mobile view
    {
      name: 'mobile',
      testMatch: /(signup|auth)\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});