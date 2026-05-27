import { test, expect } from '@playwright/test';

test.describe('Settings page', () => {
  test.use({ storageState: 'tests/e2e/auth.json' });

  test('can toggle invisible mode', async ({ page }) => {
    await page.goto('/settings');

    const toggle = page.locator('button[role="switch"]');
    const initialState = await toggle.getAttribute('aria-checked');

    await toggle.click();

    // Wait for the toggle to update
    await expect(toggle).toHaveAttribute(
      'aria-checked',
      initialState === 'true' ? 'false' : 'true',
      { timeout: 10000 }
    );
  });

  test('delete account shows confirmation', async ({ page }) => {
    await page.goto('/settings');

    const deleteBtn = page.getByText('Supprimer mon compte');
    await deleteBtn.click();

    await expect(page.getByText('Etes-vous sûr')).toBeVisible();
    await expect(page.getByText('Oui, supprimer')).toBeVisible();
    await expect(page.getByText('Annuler')).toBeVisible();

    // Cancel — don't actually delete
    await page.getByText('Annuler').click();
    await expect(page.getByText('Etes-vous sûr')).not.toBeVisible();
  });
});