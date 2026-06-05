import { test as setup, expect } from '@playwright/test';
import { Pool } from 'pg';

// This setup script creates an authenticated session file for E2E tests.
// Run: npx playwright test --project=setup
// It registers a test user and saves the session state.

const AUTH_FILE = 'tests/e2e/auth.json';

setup('authenticate', async ({ page }) => {
  // Mock Turnstile: in tests, skip the Cloudflare widget entirely and
  // emit a fake token immediately. The TurnstileProvider component checks
  // window.__TURNSTILE_MOCK__ on mount and uses the mock branch.
  await page.addInitScript(() => {
    (window as unknown as { __TURNSTILE_MOCK__?: boolean }).__TURNSTILE_MOCK__ = true;
  });

  const email = `e2e-test-${Date.now()}@example.com`;
  const password = 'E2eTestPass123';

  // Register
  await page.goto('/register');
  await page.fill('input[id="displayName"]', 'E2E Tester');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.check('input[id="consent"]');
  // Wait for submit button to be enabled. In CI the canSubmit guard waits
  // for either a real Turnstile token, a blocked Turnstile state, or the
  // mock branch (window.__TURNSTILE_MOCK__). The mock branch sets a token
  // asynchronously via useEffect after mount — without this wait the click
  // can land on a still-disabled button if hydration is slow.
  await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5000 });
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // Bypass email verification in CI: mark email verified directly in DB
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(
      'UPDATE users SET "emailVerified" = NOW(), "isVerified" = true WHERE email = $1',
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
