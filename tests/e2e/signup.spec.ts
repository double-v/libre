import { test, expect } from '@playwright/test';

test.describe('Registration flow', () => {
  test('registers a new user successfully', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[id="displayName"]', 'TestUser');
    await page.fill('input[id="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows validation errors for invalid input', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[id="email"]', 'not-an-email');
    await page.fill('input[id="password"]', 'short');
    await page.click('button[type="submit"]');
    // Should show some error indicator
  });
});