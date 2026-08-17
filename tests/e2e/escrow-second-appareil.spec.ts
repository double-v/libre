import { test, expect } from '@playwright/test';

/**
 * #198 — le scénario qui définit la feature : un second appareil lit l'historique.
 *
 * Squelette **volontairement skippé**, comme le reste de la suite E2E de ce dépôt
 * (`chat.spec.ts`, `match-flow.spec.ts`…) : Playwright ne s'installe pas sur cette
 * machine (Ubuntu 26.04, issue #164) et le scénario exige en plus un compte
 * authentifié et un match préparé. Le scénario est écrit ici pour être exécutable
 * dès que #164 est levé — le laisser hors du dépôt reviendrait à le réinventer.
 *
 * En attendant, la garantie est tenue par les tests unitaires des quatre branches
 * du montage (`src/hooks/__tests__/useEncryptedChat.test.ts`) et par la validation
 * manuelle décrite dans `specs/002-messagerie-durable/plan.md` § Guide de validation.
 */
test.describe('Escrow — changement d’appareil (#198)', () => {
  test('un stockage local vidé ne fait pas perdre l’historique', async ({ page }) => {
    test.skip(true, 'Nécessite session authentifiée + match préparé, et Playwright local (#164)');

    // 1. Session A : ouvrir une conversation existante, relever le dernier message.
    await page.goto('/messages');
    const dernier = await page.locator('[data-testid="message"]').last().innerText();

    // 2. Vider intégralement le stockage local — l'équivalent d'un nouvel appareil.
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 3. Le message doit revenir, en clair, sans aucune action de la personne.
    await expect(page.locator('[data-testid="message"]').last()).toHaveText(dernier);

    // 4. Et surtout : aucune bulle « illisible », aucun chiffré brut à l'écran.
    await expect(page.getByText('Message illisible sur cet appareil')).toHaveCount(0);
  });
});
