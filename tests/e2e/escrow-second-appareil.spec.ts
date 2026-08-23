import { test, expect } from '@playwright/test';

/**
 * #198 — le scénario qui définit la feature : un second appareil lit l'historique.
 *
 * **Ce scénario a été exécuté pour de vrai** le 2026-08-17, sur l'app servie
 * (`next dev` + PostgreSQL local + deux comptes appariés), avec Playwright piloté
 * à la main. Résultat : clé créée et versée au coffre au premier chargement,
 * message stocké chiffré (l'API ne renvoie jamais le clair), puis **`localStorage`
 * intégralement vidé** — cache de messages en clair compris — et le message relu
 * en clair après rechargement, sans bulle « illisible ».
 *
 * Il reste `skip` dans la suite partagée parce qu'elle ne fournit pas encore ses
 * fixtures : elle pointe `localhost:3000` avec `npm run dev` (donc la base Neon
 * partagée) et n'a ni compte apparié ni conversation. Le reste de la suite est
 * dans le même état (`chat.spec.ts`, `match-flow.spec.ts`…), cf. #164. Le scénario
 * vit ici pour ne pas être réinventé le jour où la suite aura ses fixtures.
 *
 * Recette de rejeu manuel : `specs/002-messagerie-durable/plan.md`, § Guide de validation.
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
