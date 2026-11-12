/**
 * Fiche membre sur l'app servie (spec 012, US4, T043 ; quickstart, scénario 6).
 * Écrit en base : à jouer sur une base fraîchement chargée.
 */
import { test, expect } from '@playwright/test';
import { contexteAdmin, ID, SESSION_ADMIN } from './admin-aide';

test.skip(!SESSION_ADMIN, 'E2E_ADMIN_SESSION absent : voir tests/e2e/admin-aide.ts');
test.describe.configure({ mode: 'serial' });

test('bannir depuis la fiche : motif exigé, « Le membre verra », journal à son auteur', async ({ browser }) => {
  const c = await contexteAdmin(browser, 360);
  const page = await c.newPage();
  await page.goto(`/admin/membres?filtre=report&membre=${ID.marc}`);
  await page.getByRole('article').getByRole('button', { name: 'Bannir…' }).click();
  const feuille = page.getByRole('dialog', { name: 'Bannir Marc_Tln ?' });
  await expect(feuille.getByText('Le membre verra')).toBeVisible();
  await expect(feuille.getByText(/Votre compte a été suspendu\./)).toBeVisible();
  await expect(feuille.getByRole('button', { name: 'Bannir' })).toBeDisabled();
  await feuille.getByLabel('Motif, inscrit à l’historique').selectOption('menaces');
  await feuille.getByRole('button', { name: 'Bannir' }).click();
  // La première compilation d'une route en `next dev` peut prendre quelques secondes.
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByText('Banni', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Banni : Menaces ou harcèlement/)).toBeVisible();
  await expect(page.getByText('· par Toi').first()).toBeVisible();
  await c.close();
});

test('doublon probable : le compte lié s’ouvre d’un geste', async ({ browser }) => {
  const c = await contexteAdmin(browser, 1280);
  const page = await c.newPage();
  await page.goto(`/admin/membres?filtre=indice&membre=${ID.ines}`);
  await expect(page.getByRole('button', { name: 'Supprimer Ines_2…' })).toBeVisible();
  await page.getByRole('button', { name: /Ines_2.*Compte lié/ }).click();
  await expect(page).toHaveURL(new RegExp(`membre=${ID.ines2}`));
  await expect(page.getByRole('heading', { level: 1, name: 'Ines_2' })).toBeVisible();
  await c.close();
});
