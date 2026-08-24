/**
 * Tests — route cron de reset (#13).
 *
 * Le secret de cron a été posé en prod le 2026-08-24 : ce chemin redevient
 * actif après des mois de 401 silencieux. Il faut donc qu'il **partage le
 * témoin** du reset paresseux — sinon le cron purge à 2h sans le poser, et le
 * premier visiteur du jour repurge derrière lui, effaçant le message d'accueil
 * que le cron venait d'écrire.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ensureSquareFresh = vi.fn();
vi.mock('@/lib/square/reset', () => ({
  __esModule: true,
  ensureSquareFresh: (...args: unknown[]) => ensureSquareFresh(...args),
}));

const { GET } = await import('@/app/api/square/reset/route');

function appel(secret?: string) {
  const headers = secret ? { authorization: `Bearer ${secret}` } : undefined;
  return GET(new NextRequest('http://localhost/api/square/reset', { headers }));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'secret-de-test';
  ensureSquareFresh.mockResolvedValue({ reset: true, deletedMessages: 4, deletedReactions: 1 });
});

describe('GET /api/square/reset', () => {
  it('refuse sans le bon secret', async () => {
    expect((await appel()).status).toBe(401);
    expect((await appel('mauvais')).status).toBe(401);
    expect(ensureSquareFresh).not.toHaveBeenCalled();
  });

  it('refuse quand le secret n’est pas configuré, plutôt que d’ouvrir la route', async () => {
    delete process.env.CRON_SECRET;
    expect((await appel('nimporte-quoi')).status).toBe(401);
  });

  it('passe par le témoin partagé, pas par une purge directe', async () => {
    const res = await appel('secret-de-test');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ reset: true, deletedMessages: 4 });
    expect(ensureSquareFresh).toHaveBeenCalledTimes(1);
  });

  it('rend 200 sans rien purger quand le trafic a déjà tourné la page', async () => {
    ensureSquareFresh.mockResolvedValue({ reset: false, deletedMessages: 0, deletedReactions: 0 });

    const res = await appel('secret-de-test');

    // Un cron qui ne trouve rien à faire n'est pas un cron en échec : le
    // signaler comme tel remplirait le journal Vercel de fausses alertes.
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, reset: false });
  });
});
