// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));
const fakeDb = { user: { findUnique: vi.fn(), findMany: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const lirePhoto = vi.fn();
vi.mock('@/lib/r2', () => ({ __esModule: true, lirePhoto, isR2Configured: () => true }));
const analyserPhoto = vi.fn();
const analyserTexteProfil = vi.fn();
vi.mock('@/lib/fraude/analyse', () => ({ __esModule: true, analyserPhoto, analyserTexteProfil }));

const { POST } = await import('../route');
const lancer = (body: unknown = {}) => POST(new NextRequest('http://x/api/admin/profils-a-verifier/analyse', { method: 'POST', body: JSON.stringify(body) }));
const compte = (id: string, photos: string[] = []) => ({ id, displayName: `M${id}`, profile: { bio: 'Salut', photos } });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'admin', email: 'a@x.fr' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  lirePhoto.mockResolvedValue(Buffer.from('img'));
});

describe('POST /api/admin/profils-a-verifier/analyse (#444, FR-011)', () => {
  it('404 pour un non-admin, sans rien lire', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect((await lancer()).status).toBe(404);
    expect(fakeDb.user.findMany).not.toHaveBeenCalled();
  });

  it('analyse texte et photos d’un lot, et rend le curseur suivant sur un lot plein', async () => {
    fakeDb.user.findMany.mockResolvedValue(Array.from({ length: 10 }, (_, i) => compte(`u${i}`, i === 0 ? ['p/a.webp', 'p/b.webp'] : [])));
    const body = await (await lancer()).json();
    expect(body).toEqual({ profils: 10, photos: 2, echecs: 0, suivant: 'u9' });
    expect(analyserTexteProfil).toHaveBeenCalledTimes(10);
    expect(analyserPhoto).toHaveBeenCalledWith({ userId: 'u0', photoKey: 'p/a.webp', buffer: Buffer.from('img') });
  });

  it('reprend après le curseur, et clôt le tour sur un lot court', async () => {
    fakeDb.user.findMany.mockResolvedValue([compte('u10')]);
    const body = await (await lancer({ apres: 'u9' })).json();
    expect(fakeDb.user.findMany.mock.calls[0][0].where.id).toEqual({ gt: 'u9' });
    expect(body.suivant).toBeNull();
  });

  it('une photo absente de R2 compte un échec sans arrêter le lot', async () => {
    fakeDb.user.findMany.mockResolvedValue([compte('u1', ['p/x.webp', 'p/y.webp'])]);
    lirePhoto.mockRejectedValueOnce(new Error('NoSuchKey'));
    const body = await (await lancer()).json();
    expect(body).toMatchObject({ photos: 1, echecs: 1 });
  });
});
