// @vitest-environment node
/**
 * Toute route sous `src/app/api/admin` refuse une requête qui n'est pas celle
 * d'un admin, avant de lire la moindre donnée (#552).
 *
 * On ne cherche pas `requireAdmin` dans le texte (un commentaire suffirait à
 * tromper la recherche) : on importe chaque route et on appelle chacune de ses
 * méthodes HTTP, dans deux cas :
 *   1. sans session : refus, et **aucun** accès à la base ;
 *   2. session d'un membre ordinaire (rôle USER en base) : 404, et aucun accès
 *      à la base hormis la relecture du rôle par la garde.
 * Les accès sont **enregistrés** par la base factice. On ne se fie pas au seul
 * code de réponse : une route qui lirait avant la garde puis rattraperait
 * l'erreur en 404 serait quand même prise.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

let session: { user: { id: string; role?: string } } | null = null;
const acces: string[] = [];

vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: vi.fn(async () => session) }));
vi.mock('next-auth/jwt', () => ({ __esModule: true, getToken: vi.fn(async () => (session ? { sub: session.user.id, role: session.user.role } : null)) }));

/**
 * Base factice : seule la relecture du rôle par la garde (`user.findUnique`
 * sur le compte de la session) répond. Tout autre accès est enregistré, puis
 * lève une erreur.
 */
function baseFactice(): unknown {
  return new Proxy({}, {
    get(_c, modele) {
      return new Proxy({}, {
        get(_m, operation) {
          return async (args: { where?: { id?: string }; select?: Record<string, boolean> }) => {
            const garde = modele === 'user' && operation === 'findUnique'
              && session && args?.where?.id === session.user.id
              && args.select && Object.keys(args.select).every((k) => k === 'role' || k === 'isBanned');
            if (garde) return { role: 'USER', isBanned: false };
            acces.push(`${String(modele)}.${String(operation)}`);
            throw new Error(`accès à la base avant la garde : ${String(modele)}.${String(operation)}`);
          };
        },
      });
    },
  });
}
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => baseFactice() }));
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn(async () => ({ success: true })),
  limits: new Proxy({}, { get: () => ({ limit: 100, windowMs: 60000 }) }),
}));

const RACINE = path.resolve(__dirname, '../app/api/admin');
const VERBES = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

function routes(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : routes(chemin);
    return nom === 'route.ts' ? [chemin] : [];
  });
}

const fichiers = routes(RACINE).map((f) => path.relative(RACINE, f));

async function appeler(relatif: string): Promise<Array<{ methode: string; status: number }>> {
  const mod = (await import(path.join(RACINE, relatif))) as Record<string, unknown>;
  const methodes = Object.keys(mod).filter((k) => VERBES.has(k) && typeof mod[k] === 'function');
  expect(methodes.length, `${relatif} n'exporte aucune méthode HTTP`).toBeGreaterThan(0);
  const resultats: Array<{ methode: string; status: number }> = [];
  for (const methode of methodes) {
    const req = new NextRequest(`http://x/api/admin/${relatif}`, {
      method: methode,
      ...(['GET', 'HEAD', 'OPTIONS'].includes(methode) ? {} : { body: '{}' }),
    });
    const id = '00000000-0000-0000-0000-000000000000';
    const params = { params: Promise.resolve({ id, userId: id }) };
    const res = await (mod[methode] as (r: NextRequest, p: unknown) => Promise<Response>)(req, params);
    resultats.push({ methode, status: res.status });
  }
  return resultats;
}

beforeEach(() => {
  session = null;
  acces.length = 0;
});

describe('routes /api/admin', () => {
  it('le dossier contient bien des routes (garde contre un test vide)', () => {
    expect(fichiers.length).toBeGreaterThan(30);
  });

  it.each(fichiers.map((f) => [f]))('%s : sans session, refus et aucune lecture', async (relatif) => {
    for (const { methode, status } of await appeler(relatif)) {
      expect([401, 403, 404], `${methode} ${relatif} a répondu ${status}`).toContain(status);
    }
    expect(acces, `${relatif} a lu la base avant la garde`).toEqual([]);
  });

  it.each(fichiers.map((f) => [f]))('%s : membre ordinaire, 404 et aucune lecture hors garde', async (relatif) => {
    session = { user: { id: 'membre-factice', role: 'ADMIN' } }; // jeton qui ment : la base dit USER
    for (const { methode, status } of await appeler(relatif)) {
      expect(status, `${methode} ${relatif} a répondu ${status} à un membre ordinaire`).toBe(404);
    }
    expect(acces, `${relatif} a lu la base avant la garde`).toEqual([]);
  });
});
