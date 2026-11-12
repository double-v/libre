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
