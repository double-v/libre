// @vitest-environment node
/**
 * #418 — `GET /api/features`, lu par l'app pour masquer ce qui est coupé.
 * Public : l'état d'un interrupteur n'est pas un secret, et la nav de la home
 * connectée en a besoin avant toute autre requête.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = { siteConfig: { findUnique: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

vi.mock('@/lib/retention/purge', () => ({ __esModule: true, ensureRetentionFresh: vi.fn(async () => ({ executee: false })) }));
vi.mock('next/server', async (importOriginal) => {
  const mod = await importOriginal<typeof import('next/server')>();
  return { ...mod, after: vi.fn() };
});

const { GET } = await import('@/app/api/features/route');
const { invaliderFeatures } = await import('@/lib/features-server');

beforeEach(() => {
  vi.clearAllMocks();
  invaliderFeatures();
});

describe('GET /api/features', () => {
  it('renvoie les trois booléens, sans cache HTTP', async () => {
    fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: ['crossings'] });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toMatch(/no-store/);
    await expect(res.json()).resolves.toEqual({ checkin: true, crossings: false, square: true });
  });
});

describe('GET /api/features — purge de rétention paresseuse (#427)', () => {
  it('planifie la purge après la réponse, sans en dépendre', async () => {
    const { ensureRetentionFresh } = await import('@/lib/retention/purge');
    const { after } = await import('next/server');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(after).toHaveBeenCalledTimes(1);
    // On exécute ce que `after` a reçu : c'est bien la purge, et elle n'a pas
    // besoin d'attendre pour que la réponse parte.
    await (vi.mocked(after).mock.calls[0][0] as () => Promise<unknown>)();
    expect(ensureRetentionFresh).toHaveBeenCalledTimes(1);
  });
});
