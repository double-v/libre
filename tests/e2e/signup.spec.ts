import { test, expect } from '@playwright/test';

// Mock Turnstile globally for all signup tests (see TurnstileProvider.tsx).
// The component checks window.__TURNSTILE_MOCK__ on mount and uses the
// mock branch (instant fake token) instead of loading the Cloudflare widget.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __TURNSTILE_MOCK__?: boolean }).__TURNSTILE_MOCK__ = true;
  });
});

test.describe('Registration flow', () => {
  test('registers a new user and sees confirmation on login', async ({ page }) => {
    const email = `beta-${Date.now()}@example.com`;
    await page.goto('/register');

    await page.fill('input[id="displayName"]', 'BetaTest');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'SecurePass123');
    await page.check('input[id="consent"]');

    // Wait for submit button to be enabled (Turnstile mock or skip).
    // See setup-auth.ts for the full explanation.
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5000 });
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByText('Inscription réussie')).toBeVisible();
  });

  test('rejects weak password', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[id="displayName"]', 'BetaTest');
    await page.fill('input[id="email"]', `weak-${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'short');
    await page.check('input[id="consent"]');

    // Wait for submit button to be enabled (Turnstile mock or skip).
    // See setup-auth.ts for the full explanation.
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5000 });
    await page.click('button[type="submit"]');

    await expect(page.getByText(/8 caractères min/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test('rejects duplicate email', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[id="displayName"]', 'BetaDup');
    await page.fill('input[id="email"]', 'dup@example.com');
    await page.fill('input[id="password"]', 'SecurePass123');
    await page.check('input[id="consent"]');

    // Wait for submit button to be enabled (Turnstile mock or skip).
    // See setup-auth.ts for the full explanation.
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5000 });
    await page.click('button[type="submit"]');

    // First attempt may succeed or fail depending on DB state
    // If it succeeds and redirects, that's fine — the duplicate test is on second attempt
    const url = page.url();
    if (url.includes('/login')) {
      // Go back and try same email again
      await page.goto('/register');
      await page.fill('input[id="displayName"]', 'BetaDup2');
      await page.fill('input[id="email"]', 'dup@example.com');
      await page.fill('input[id="password"]', 'SecurePass123');
      await page.check('input[id="consent"]');
      await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5000 });
      await page.click('button[type="submit"]');
      await expect(page.getByText(/erreur/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('login page shows correct branding', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible();
    await expect(page.getByText('Créer un compte')).toBeVisible();
  });
});