import type { Browser, BrowserContext } from '@playwright/test';

/**
 * E2E du bureau (spec 012, lot 2). Ils visent une app servie sur une base
 * jetable chargée avec `prisma/seed-bureau-012.sql`, jamais Neon.
 * `E2E_ADMIN_SESSION` porte un jeton de session NextAuth du compte factice
 * « Toi », signé avec le `NEXTAUTH_SECRET` du serveur de test. Sans lui, les
 * tests sont sautés (ils ne peuvent pas se connecter en admin autrement).
 */
export const SESSION_ADMIN = process.env.E2E_ADMIN_SESSION ?? '';
export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export const ID = {
  julien: '00000000-0000-4000-8000-000000000010',
  marc: '00000000-0000-4000-8000-000000000011',
  ines: '00000000-0000-4000-8000-000000000016',
  ines2: '00000000-0000-4000-8000-000000000017',
  groupe: '00000000-0000-4000-8000-000000000030',
};

export async function contexteAdmin(browser: Browser, largeur: number): Promise<BrowserContext> {
  const c = await browser.newContext({ viewport: { width: largeur, height: largeur < 900 ? 780 : 900 }, baseURL: BASE });
  const domaine = new URL(BASE).hostname;
  await c.addCookies([{ name: 'next-auth.session-token', value: SESSION_ADMIN, domain: domaine, path: '/' }]);
  await c.addInitScript(() => {
    try { localStorage.setItem('libre_cookie_consent', JSON.stringify({ accepted: true, date: new Date().toISOString() })); } catch { /* sans stockage */ }
  });
  return c;
}

/**
 * Nombre de points d'un élément réellement peints à l'écran, sur une grille
 * de 3 × 2 : un élément coupé par un parent ou recouvert en partie n'a pas ses
 * six points. Jamais le seul centre (règle de mesure du dépôt).
 */
export const POINTS_PEINTS = `(el) => {
  const r = el.getBoundingClientRect();
  let n = 0;
  for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.2, 0.8]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy;
    const vu = document.elementFromPoint(x, y);
    if (vu && el.contains(vu)) n++;
  }
  return n;
}`;
