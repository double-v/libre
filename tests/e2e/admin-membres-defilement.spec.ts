/**
 * La liste du hub Membres défile dans sa propre zone (#568).
 *
 * Sur la livraison de #557, la liste était coupée par une carte
 * `overflow-hidden` : cinq lignes peintes sur vingt à 1440 px, aucune molette
 * efficace, jamais de page suivante. Ces tests agissent comme un modérateur
 * (molette sur la liste) et mesurent des pixels, pas des classes.
 * Base : `prisma/seed-bureau-012.sql` (plus de vingt membres « À traiter »).
 */
import { test, expect, type Page } from '@playwright/test';
import { contexteAdmin, ID, POINTS_PEINTS, SESSION_ADMIN } from './admin-aide';

test.skip(!SESSION_ADMIN, 'E2E_ADMIN_SESSION absent : voir tests/e2e/admin-aide.ts');

/** Les lignes de membres : des boutons dont le texte porte « Inscrit … ». */
const lignes = (page: Page) => page.locator('button:visible', { hasText: /Inscrit / });

async function ouvrir(page: Page) {
  await page.goto('/admin/membres');
  await expect(lignes(page).first()).toBeVisible({ timeout: 30_000 });
}

/** Molette sur la liste jusqu'à ce que le nombre de lignes ne bouge plus. */
async function defilerJusquAuBout(page: Page): Promise<number> {
  // Le pointeur au milieu de la ligne courante si une fiche est ouverte (la
  // première ligne peut alors être passée sous la zone fixe), sinon de la première.
  const courante = page.locator('button[aria-current="true"]:visible');
  const boite = await ((await courante.count()) ? courante : lignes(page).first()).boundingBox();
  await page.mouse.move(boite!.x + boite!.width / 2, boite!.y + boite!.height / 2);
  let n = await lignes(page).count();
  for (let stable = 0, tour = 0; stable < 4 && tour < 60; tour++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(250);
    const k = await lignes(page).count();
    stable = k === n ? stable + 1 : 0;
    n = k;
  }
  return n;
}

for (const [largeur, hauteur] of [[1440, 900], [1080, 800], [390, 844]] as const) {
  test(`${largeur} px : la molette amène au dernier membre, sans faire défiler la fenêtre`, async ({ browser }) => {
    const c = await contexteAdmin(browser, largeur);
    const page = await c.newPage();
    await page.setViewportSize({ width: largeur, height: hauteur });
    await ouvrir(page);

    const recherche = page.getByRole('searchbox', { name: 'Chercher un membre' });
    const tri = page.getByRole('combobox', { name: 'Trier' });
    const avant = { recherche: (await recherche.boundingBox())!.y, tri: (await tri.boundingBox())!.y, n: await lignes(page).count() };
    expect(avant.n).toBe(20);

    const n = await defilerJusquAuBout(page);
    // La suite s'est chargée : la liste factice compte plus de vingt membres à traiter.
    expect(n).toBeGreaterThan(40);
    await expect(page.getByText(/^Fin de la liste · \d+ membres$/)).toBeVisible();

    // Le dernier membre est entièrement peint (six points, pas le centre seul).
    expect(await lignes(page).last().evaluate(eval(POINTS_PEINTS))).toBe(6);

    // La fenêtre n'a pas bougé ; recherche et tri sont restés en place.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect((await recherche.boundingBox())!.y).toBe(avant.recherche);
    expect((await tri.boundingBox())!.y).toBe(avant.tri);
    await expect(tri).toHaveValue('urgence');
    await expect(page).toHaveURL(/\/admin\/membres$/);
    await c.close();
  });
}

test('1440 px : chaque ligne chargée se laisse amener entière dans la liste', async ({ browser }) => {
  const c = await contexteAdmin(browser, 1440);
  const page = await c.newPage();
  await ouvrir(page);
  const boite = await lignes(page).first().boundingBox();
  await page.mouse.move(boite!.x + boite!.width / 2, boite!.y + boite!.height / 2);
  const total = await lignes(page).count();
  const vues = new Set<number>();
  // On avance à la molette, par pas d'une demi-zone, et on note chaque ligne
  // vue entière au moins une fois.
  for (let tour = 0; tour < 40 && vues.size < total; tour++) {
    const peintes = await lignes(page).evaluateAll((els, source) => {
      const mesurer = eval(source) as (el: Element) => number;
      return els.slice(0, 20).map((el, i) => (mesurer(el) === 6 ? i : -1)).filter((i) => i >= 0);
    }, POINTS_PEINTS);
    peintes.forEach((i) => vues.add(i));
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(120);
  }
  // Les vingt premières lignes ont toutes été visibles en entier.
  expect([...vues].filter((i) => i < 20).length).toBe(20);
  await c.close();
});

test('899 et 900 px : un seul seuil pour la coque et pour le hub', async ({ browser }) => {
  const c = await contexteAdmin(browser, 899);
  const page = await c.newPage();
  await page.setViewportSize({ width: 899, height: 900 });
  await page.goto(`/admin/membres?membre=${ID.julien}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Julien_84' })).toBeVisible({ timeout: 30_000 });
  // Sous 900 px : la fiche remplace la liste, la navigation est en onglets en bas.
  await expect(page.getByRole('searchbox', { name: 'Chercher un membre' })).toBeHidden();
  await expect(page.locator('aside:visible')).toHaveCount(0);
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(page.getByRole('searchbox', { name: 'Chercher un membre' })).toBeVisible();
  await expect(page.locator('aside:visible')).toHaveCount(0);
  await c.close();
});

test('390 px : « ← Membres » rend la liste là où on l’avait laissée', async ({ browser }) => {
  const c = await contexteAdmin(browser, 390);
  const page = await c.newPage();
  await ouvrir(page);
  const zone = page.getByRole('region', { name: 'Liste des membres' });
  const boite = await lignes(page).first().boundingBox();
  await page.mouse.move(boite!.x + 40, boite!.y + 20);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(300);
  const position = await zone.evaluate((el) => el.scrollTop);
  expect(position).toBeGreaterThan(300);
  // Une ligne entièrement visible, pour cliquer dans la zone et pas sous un bord.
  const cible = lignes(page).nth(Math.ceil(position / 80) + 2);
  await cible.click();
  await expect(page.getByRole('button', { name: '← Membres' })).toBeVisible();
  await page.getByRole('button', { name: '← Membres' }).click();
  await expect(lignes(page).first()).toBeVisible();
  await expect.poll(() => zone.evaluate((el) => el.scrollTop)).toBeGreaterThan(position - 3);
  expect(await zone.evaluate((el) => el.scrollTop)).toBeLessThan(position + 3);
  await c.close();
});

test('1440 px : un membre ouvert par un lien est amené dans la liste', async ({ browser }) => {
  const c = await contexteAdmin(browser, 1440);
  const page = await c.newPage();
  await page.goto(`/admin/membres?membre=${ID.julien}`);
  const ligne = page.locator('button[aria-current="true"]:visible');
  await expect(ligne).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => ligne.evaluate(eval(POINTS_PEINTS))).toBe(6);
  await c.close();
});

test('1440 px : une fiche ouverte ne ramène pas la liste en arrière quand la suite se charge', async ({ browser }) => {
  const c = await contexteAdmin(browser, 1440);
  const page = await c.newPage();
  await page.goto(`/admin/membres?membre=${ID.julien}`);
  const courante = page.locator('button[aria-current="true"]:visible');
  await expect(courante).toBeVisible({ timeout: 30_000 });
  const zone = page.getByRole('region', { name: 'Liste des membres' });
  const boite = (await zone.boundingBox())!;
  await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
  // On descend jusqu'à ce qu'une page de plus soit arrivée, puis on ne touche plus à rien.
  // On note la position la plus basse atteinte **avant** l'arrivée des lignes
  // suivantes : la lire après laisserait passer un retour en arrière déjà fait.
  let atteinte = 0;
  for (let tour = 0; tour < 30 && (await lignes(page).count()) === 20; tour++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(100);
    atteinte = Math.max(atteinte, await zone.evaluate((el) => el.scrollTop));
  }
  await expect.poll(() => lignes(page).count()).toBeGreaterThan(20);
  await page.waitForTimeout(600);
  expect(atteinte).toBeGreaterThan(900);
  // La liste est restée où le modérateur l'a laissée : le membre ouvert, plus
  // haut, n'a pas été ramené à l'écran par l'arrivée des lignes suivantes.
  expect(await zone.evaluate((el) => el.scrollTop)).toBeGreaterThanOrEqual(atteinte - 5);
  await c.close();
});
