import { test, expect } from '@playwright/test';

// These tests require an authenticated session.
// Run with a test user already created, or use the storageState approach.

test.describe('Profile editing', () => {
  test.use({ storageState: 'tests/e2e/auth.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
  });

  test('page loads with profile sections', async ({ page }) => {
    await expect(page.getByText('Identité')).toBeVisible();
    await expect(page.getByText('Bio')).toBeVisible();
  });

  test('can edit bio', async ({ page }) => {
    // Click "Modifier" on the Bio section
    const bioSection = page.locator('section', { hasText: 'Bio' });
    await bioSection.locator('button', { hasText: 'Modifier' }).click();

    // Fill bio
    const bioInput = bioSection.locator('textarea');
    await bioInput.fill('Beta tester — je teste Libre !');

    // Save
    await bioSection.locator('button', { hasText: 'Enregistrer' }).click();

    // Verify saved
    await expect(page.getByText('Beta tester — je teste Libre !')).toBeVisible({ timeout: 10000 });
  });

  test('can select gender identity', async ({ page }) => {
    const identitySection = page.locator('section', { hasText: 'Identité' });
    await identitySection.locator('button', { hasText: 'Modifier' }).click();

    const genderSelect = identitySection.locator('select');
    await genderSelect.selectOption({ label: 'Non-binaire' });

    await identitySection.locator('button', { hasText: 'Enregistrer' }).click();

    await expect(identitySection.getByText('Non-binaire')).toBeVisible({ timeout: 10000 });
  });

  test('can add interests', async ({ page }) => {
    const interestSection = page.locator('section', { hasText: 'Centres d\'intérêt' });
    await interestSection.locator('button', { hasText: 'Modifier' }).click();

    // Toggle an interest tag
    await interestSection.getByText('Cinema').click();

    await interestSection.locator('button', { hasText: 'Enregistrer' }).click();

    await expect(interestSection.getByText('Cinema')).toBeVisible({ timeout: 10000 });
  });

  test('shows profile completeness', async ({ page }) => {
    // Wording varies by completion state (vide / timide / complet). Match
    // the banner's structural shape (the "X/6" counter) instead of locking
    // to a specific phrase, so copy iterations don't break this test.
    await expect(page.getByText(/\d+\/6/)).toBeVisible();
  });
});