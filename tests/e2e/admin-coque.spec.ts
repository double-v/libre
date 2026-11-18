/**
 * Coque du bureau (#568, avance la coque de l'US8) : quatre entrées dans
 * l'en-tête à partir de 900 px, en onglets en bas en dessous ; plus de barre
 * latérale ; le menu du thème tient dans l'en-tête et son panneau dans la
 * fenêtre. Mesures sur plusieurs points, jamais le seul centre.
 */
import { test, expect } from '@playwright/test';
import { contexteAdmin, SESSION_ADMIN } from './admin-aide';

test.skip(!SESSION_ADMIN, 'E2E_ADMIN_SESSION absent : voir tests/e2e/admin-aide.ts');

const ENTREES = ['Activité', 'Membres', 'Retours', 'Outils'];

for (const largeur of [360, 390, 768, 900, 1080, 1440]) {
  test(`${largeur} px : le bouton du thème tient dans son bandeau, son panneau dans la fenêtre`, async ({ browser }) => {
    const c = await contexteAdmin(browser, largeur);
    const page = await c.newPage();
    await page.goto('/admin/membres');
    const bouton = page.locator('button[aria-haspopup="dialog"]:visible');
    await expect(bouton).toBeVisible({ timeout: 30_000 });

    // Neuf points du bouton : chacun est peint par le bouton, et dans le
    // bandeau qui le porte (en-tête ou colonne).
    const dedans = await bouton.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const bandeau = (el.closest('header, aside') as HTMLElement).getBoundingClientRect();
      let n = 0;
      for (const fx of [0.05, 0.5, 0.95]) for (const fy of [0.1, 0.5, 0.9]) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        const vu = document.elementFromPoint(x, y);
        if (vu && el.contains(vu) && x >= bandeau.left && x <= bandeau.right && y >= bandeau.top && y <= bandeau.bottom) n++;
      }
      return n;
    });
    expect(dedans).toBe(9);
    // Une seule ligne de libellé : le bouton garde sa hauteur de cible.
    expect((await bouton.boundingBox())!.height).toBeLessThanOrEqual(50);

    await bouton.click();
    const panneau = page.getByRole('dialog', { name: /thème/i });
    await expect(panneau).toBeVisible();
    // Position de repos : on attend la fin du fondu d'ouverture (il glisse de quelques pixels).
    await panneau.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const b = (await panneau.boundingBox())!;
    const v = page.viewportSize()!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(v.width);
    expect(b.y + b.height).toBeLessThanOrEqual(v.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await c.close();
  });
}

test('1280 px : quatre entrées dans l’en-tête, aucune barre latérale, cibles et focus', async ({ browser }) => {
  const c = await contexteAdmin(browser, 1280);
  const page = await c.newPage();
  await page.goto('/admin/membres');
  const nav = page.getByRole('navigation', { name: 'Sections du bureau' }).locator('visible=true');
  await expect(nav).toHaveCount(1, { timeout: 30_000 });
  await expect(nav.getByRole('link')).toHaveText(ENTREES.map((e) => new RegExp(`^${e}`)));
  await expect(nav.getByRole('link', { name: /^Membres/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('aside')).toHaveCount(0);
  // La navigation est en haut de l'écran.
  expect((await nav.boundingBox())!.y).toBeLessThan(70);

  // Aucune cible sous 44 px (le lien d'évitement, hors écran, mis à part).
  const petites = await page.evaluate(() =>
    [...document.querySelectorAll('a,button,input,select,summary')]
      .map((e) => ({ r: e.getBoundingClientRect(), t: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24) }))
      .filter(({ r }) => r.width > 2 && r.height > 2 && r.height < 43.5)
      .map(({ r, t }) => `${t} : ${Math.round(r.height)} px`),
  );
  expect(petites).toEqual([]);

  // Au clavier, un lien de navigation porte l'anneau corail, pas le contour du navigateur.
  await nav.getByRole('link', { name: /^Activité/ }).focus();
  await page.keyboard.press('Tab');
  const style = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement!);
    return { ombre: cs.boxShadow, contour: cs.outlineStyle };
  });
  expect(style.ombre).toContain('232, 99, 74');
  expect(style.contour).toBe('none');
  await c.close();
});

test('390 px : quatre onglets en bas, qui ne recouvrent pas la liste', async ({ browser }) => {
  const c = await contexteAdmin(browser, 390);
  const page = await c.newPage();
  await page.goto('/admin/membres');
  const nav = page.getByRole('navigation', { name: 'Sections du bureau' }).locator('visible=true');
  await expect(nav).toHaveCount(1, { timeout: 30_000 });
  await expect(nav.getByRole('link')).toHaveCount(4);
  const v = page.viewportSize()!;
  const b = (await nav.boundingBox())!;
  expect(Math.round(b.y + b.height)).toBe(v.height);
  for (const lien of await nav.getByRole('link').all()) expect((await lien.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // La zone de liste s'arrête au-dessus des onglets.
  const zone = (await page.getByRole('region', { name: 'Liste des membres' }).boundingBox())!;
  expect(zone.y + zone.height).toBeLessThanOrEqual(b.y + 0.5);
  await c.close();
});

test('Outils mène aux pages existantes, et les anciennes adresses répondent toujours', async ({ browser }) => {
  const c = await contexteAdmin(browser, 1280);
  const page = await c.newPage();
  await page.goto('/admin/outils');
  await expect(page.getByRole('heading', { level: 1, name: 'Outils' })).toBeVisible({ timeout: 30_000 });
  const attendus = ['/admin/logs', '/admin/square', '/admin/circle/alerts', '/admin/journal', '/admin/features', '/admin/appearance', '/admin/rate-limits', '/admin/retention'];
  const liens = await page.getByRole('main').getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(liens.sort()).toEqual([...attendus].sort());
  await expect(page.getByRole('navigation', { name: 'Sections du bureau' }).locator('visible=true').getByRole('link', { name: /^Outils/ })).toHaveAttribute('aria-current', 'page');
  await page.goto('/admin/logs');
  await expect(page.getByRole('navigation', { name: 'Sections du bureau' }).locator('visible=true').getByRole('link', { name: /^Outils/ })).toHaveAttribute('aria-current', 'page');
  await c.close();
});
