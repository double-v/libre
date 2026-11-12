// @vitest-environment node
/**
 * Toute route sous `src/app/api/admin` refuse une requête sans session admin,
 * avant de lire la moindre donnée (#552).
 *
 * On ne cherche pas `requireAdmin` dans le texte (un commentaire suffirait à
 * tromper la recherche) : on importe chaque route, on appelle chacune de ses
 * méthodes sans session, et on exige un refus. La base factice lève une erreur
 * au premier accès : une route qui lirait avant de vérifier l'identité échoue
 * ici au lieu de répondre.
 */
import { describe, it, expect, vi } from 'vitest';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: vi.fn(async () => null) }));
vi.mock('next-auth/jwt', () => ({ __esModule: true, getToken: vi.fn(async () => null) }));

const accesBase = new Proxy({}, {
  get(_cible, propriete) {
    throw new Error(`accès à la base avant la garde : ${String(propriete)}`);
  },
});
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => accesBase }));
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn(async () => ({ success: true })),
  limits: new Proxy({}, { get: () => ({ limit: 100, windowMs: 60000 }) }),
}));

const RACINE = path.resolve(__dirname, '../app/api/admin');
const METHODES = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function routes(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : routes(chemin);
    return nom === 'route.ts' ? [chemin] : [];
  });
}

const fichiers = routes(RACINE);

describe('routes /api/admin sans session', () => {
  it('le dossier contient bien des routes (garde contre un test vide)', () => {
    expect(fichiers.length).toBeGreaterThan(30);
  });

  it.each(fichiers.map((f) => [path.relative(RACINE, f)]))('%s refuse chaque méthode', async (relatif) => {
    const mod = (await import(path.join(RACINE, relatif))) as Record<string, unknown>;
    const exportees = METHODES.filter((m) => typeof mod[m] === 'function');
    expect(exportees.length).toBeGreaterThan(0);
    for (const methode of exportees) {
      const req = new NextRequest(`http://x/api/admin/${relatif}`, {
        method: methode,
        ...(methode === 'GET' ? {} : { body: '{}' }),
      });
      const params = { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000', userId: '00000000-0000-0000-0000-000000000000' }) };
      const res = (await (mod[methode] as (r: NextRequest, p: unknown) => Promise<Response>)(req, params)) as Response;
      expect([401, 403, 404], `${methode} ${relatif} a répondu ${res.status}`).toContain(res.status);
    }
  });
});
