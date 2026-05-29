import { test as setup, expect } from '@playwright/test';
import pg from 'pg';

// This setup script creates an authenticated session file for E2E tests.
// Run: npx playwright test --project=setup
// It registers a test user and saves the session state.

const AUTH_FILE = 'tests/e2e/auth.json';

setup('authenticate', async ({ page }) => {
  const email = `e2e-test-${Date.now()}@example.com`;
  const password = 'E2eTestPass123';

  // Register
  await page.goto('/register');
  await page.fill('input[id="displayName"]', 'E2E Tester');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // Bypass email verification in CI: mark email verified directly in DB
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      'UPDATE "User" SET "emailVerified" = NOW(), "isVerified" = true WHERE email = $1',
      [email],
    );
    await pool.end();
  }

  // Login
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/discover|\/profile/, { timeout: 10000 });

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE });
});
