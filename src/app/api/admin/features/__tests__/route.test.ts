// @vitest-environment node
/**
 * #418 — les interrupteurs côté admin : lecture, écriture validée, journal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  siteConfig: { findUnique: vi.fn(), upsert: vi.fn() },
  moderationLog: { create: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET, PUT } = await import('@/app/api/admin/features/route');
const { invaliderFeatures, getFeatures } = await import('@/lib/features-server');

const ADMIN = '11111111-1111-1111-1111-111111111111';
const put = (body: unknown) =>
  PUT(new NextRequest('http://x/api/admin/features', { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => {
  vi.clearAllMocks();
  invaliderFeatures();
  mockGetServerSession.mockResolvedValue({ user: { id: ADMIN, email: 'a@x.fr' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: [] });
  fakeDb.siteConfig.upsert.mockImplementation(async ({ update }: { update: { featuresDisabled: string[] } }) => ({ featuresDisabled: update.featuresDisabled }));
  fakeDb.moderationLog.create.mockResolvedValue({});
});

describe('/api/admin/features', () => {
  it('GET renvoie l’état des trois interrupteurs', async () => {
    fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: ['square'] });
    await expect((await GET()).json()).resolves.toEqual({ checkin: true, crossings: true, square: false });
  });

  it('PUT écrit la liste de ce qui est coupé, journalise, et invalide le cache', async () => {
    await getFeatures(); // amorce le cache
    const res = await put({ checkin: false, crossings: true, square: false });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ checkin: false, crossings: true, square: false });

    const ecrit = fakeDb.siteConfig.upsert.mock.calls[0][0];
    expect(ecrit.update.featuresDisabled).toEqual(['checkin', 'square']);
    expect(ecrit.create.featuresDisabled).toEqual(['checkin', 'square']);
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ adminId: ADMIN, targetUserId: ADMIN, action: 'SET_FEATURES', reason: 'coupees: checkin, square' }),
    });

    fakeDb.siteConfig.findUnique.mockResolvedValue({ featuresDisabled: ['checkin', 'square'] });
    expect((await getFeatures()).checkin).toBe(false);
  });

  it('PUT refuse un corps qui ne porte pas les trois booléens', async () => {
    expect((await put({ square: 'non' })).status).toBe(400);
    expect((await put({ checkin: true, crossings: true })).status).toBe(400);
    expect(fakeDb.siteConfig.upsert).not.toHaveBeenCalled();
  });

  it('refuse un non-admin (404, route cachée)', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect((await GET()).status).toBe(404);
    expect((await put({ checkin: true, crossings: true, square: true })).status).toBe(404);
  });
});
