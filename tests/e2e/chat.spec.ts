import { test, expect } from '@playwright/test';

test.describe('Chat flow', () => {
  test('user can send an encrypted message', async ({ page }) => {
    // Requires authenticated state + match setup
    test.skip();
  });
});