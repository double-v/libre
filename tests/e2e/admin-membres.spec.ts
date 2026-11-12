/**
 * Hub Membres sur l'app servie (spec 012, US3, T033 ; quickstart, scénario 5).
 * Pixels réels : débordement horizontal mesuré, état conservé par l'adresse.
 */
import { test, expect } from '@playwright/test';
import { contexteAdmin, ID, SESSION_ADMIN } from './admin-aide';

test.skip(!SESSION_ADMIN, 'E2E_ADMIN_SESSION absent : voir tests/e2e/admin-aide.ts');

for (const largeur of [360, 1280]) {
  test(`${largeur} px : filtre, fiche, rechargement et retour gardent l’état, sans défilement horizontal`, async ({ browser }) => {
    const c = await contexteAdmin(browser, largeur);
    const page = await c.newPage();
    await page.goto('/admin/membres');
    await expect(page.getByRole('button', { name: /Julien_84/ })).toBeVisible();

    await page.getByRole('button', { name: /^Signalés/ }).click();
    await expect(page).toHaveURL(/filtre=report/);
    await page.getByRole('button', { name: /Julien_84/ }).click();
    await expect(page).toHaveURL(new RegExp(`filtre=report.*membre=${ID.julien}`));
    await expect(page.getByRole('heading', { level: 1, name: 'Julien_84' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

    if (largeur < 900) {
      // La fiche remplace la liste (US3, scénario 3).
      await expect(page.getByRole('searchbox', { name: 'Chercher un membre' })).toBeHidden();
    } else {
      await expect(page.getByRole('searchbox', { name: 'Chercher un membre' })).toBeVisible();
    }

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Julien_84' })).toBeVisible();

    if (largeur < 900) {
      await page.getByRole('button', { name: '← Membres' }).click();
      await expect(page).toHaveURL(/filtre=report$/);
      await expect(page.getByRole('button', { name: /Julien_84/ })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /^Signalés/ })).toHaveAttribute('aria-pressed', 'true');
    await c.close();
  });
}

test('une ancienne adresse mène au hub filtré (US4, scénario 4)', async ({ browser }) => {
  const c = await contexteAdmin(browser, 1280);
  const page = await c.newPage();
  for (const [ancienne, nouvelle] of [['/admin/reports', /\/admin\/membres\?filtre=report$/], ['/admin/verifications', /filtre=verif$/], ['/admin/indices', /filtre=indice$/], [`/admin/users/${ID.julien}`, new RegExp(`membre=${ID.julien}$`)]] as const) {
    await page.goto(ancienne);
    await expect(page).toHaveURL(nouvelle);
  }
  await c.close();
});
