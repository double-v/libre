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
    // Dismiss the cookie consent banner (CookieBanner.tsx) so its
    // fixed-bottom overlay does not intercept pointer events on
    // buttons/links in the form. Without this, tests that need to click
    // "Se connecter" or the form submit see the banner intercept and
    // timeout 30s.
    try {
      localStorage.setItem('libre_cookie_consent', JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    } catch {}
  });

  // (Diagnostic instrumentation removed — root cause of #23 was Zod
  // stripping consentGiven. Fixed in the client body and the schema.)

  const email = `e2e-test-${Date.now()}@example.com`;
  const password = 'E2eTestPass123';

  // Register
  await page.goto('/register');
  await page.fill('input[id="displayName"]', 'E2E Tester');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.check('input[id="consent"]');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // Bypass email verification in CI: mark email verified directly in DB
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // Create the Profile row (1-to-1, not auto-created with User — see
    // prisma/schema.prisma). Without this, /profile and /settings pages
    // see profile=null and disable their UI (toggle switch, edit buttons).
    await pool.query(
      `INSERT INTO profiles ("userId") SELECT id FROM users WHERE email = $1
       ON CONFLICT ("userId") DO NOTHING`,
      [email],
    );
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
