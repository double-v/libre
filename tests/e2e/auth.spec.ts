import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Se connecter')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="email"]', 'nobody@example.com');
    await page.fill('input[id="password"]', 'WrongPass123');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/incorrect/i)).toBeVisible({ timeout: 5000 });
  });

  test('navigation between login and register', async ({ page }) => {
    await page.goto('/login');
    await page.click('a', { hasText: 'Créer un compte' });
    await expect(page).toHaveURL(/\/register/);

    await page.click('a', { hasText: 'Se connecter' });
    await expect(page).toHaveURL(/\/login/);
  });
});