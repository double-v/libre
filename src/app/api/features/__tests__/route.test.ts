// @vitest-environment node
/**
 * #418 — `GET /api/features`, lu par l'app pour masquer ce qui est coupé.
 * Public : l'état d'un interrupteur n'est pas un secret, et la nav de la home
 * connectée en a besoin avant toute autre requête.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = { siteConfig: { findUnique: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

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
