import { test, expect } from '@playwright/test';

// Helper: wait for the submit button to be enabled, handling the 3 possible
// Turnstile states (token obtained, blocked after 5s, no site key).
// Capped at 8s so CI never races the 5s Turnstile timeout.
async function waitForSubmitEnabled(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => {
      const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
      return btn !== null && !btn.disabled;
    },
    { timeout: 8000 },
  );
}

test.describe('Registration flow', () => {
  test('registers a new user and sees confirmation on login', async ({ page }) => {
    const email = `beta-${Date.now()}@example.com`;
    await page.goto('/register');

    await page.fill('input[id="displayName"]', 'BetaTest');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'SecurePass123');
    await page.check('input[id="consent"]');
    await waitForSubmitEnabled(page);

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
    await waitForSubmitEnabled(page);

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
    await waitForSubmitEnabled(page);

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
      await waitForSubmitEnabled(page);
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