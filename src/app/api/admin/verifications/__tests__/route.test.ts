/**
 * GET /api/admin/verifications (#423) — la file de vérification est une liste :
 * l'e-mail y part masqué, comme sur la liste des membres.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { findUnique: vi.fn() },
  verificationRequest: { findMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('../route');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'admin', email: 'admin@x.fr', role: 'ADMIN' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
});

describe('GET /api/admin/verifications', () => {
  it("masque l'e-mail du membre dans la file", async () => {
    fakeDb.verificationRequest.findMany.mockResolvedValue([
      {
        id: 'v1',
        status: 'pending',
        selfieUrl: 'https://r2/selfie.jpg',
        createdAt: new Date('2026-01-01'),
        user: { id: 'u1', displayName: 'Paul', email: 'paul.durand@example.org', profile: null, _count: { verificationRequests: 1 } },
      },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/admin/verifications'));
    const texte = await res.text();
    expect(texte).not.toContain('paul.durand@example.org');
    expect(texte).not.toContain('paul.durand');

    const body = JSON.parse(texte);
    expect(body.verifications[0].user).toEqual({ id: 'u1', displayName: 'Paul', emailMasque: 'pa***@ex***.org', photos: [] });
    expect(body.verifications[0].selfieUrl).toBe('https://r2/selfie.jpg');
  });
});

describe('GET /api/admin/verifications — file comparée (#436)', () => {
  it('donne le geste, les photos du profil et le nombre de tentatives', async () => {
    fakeDb.verificationRequest.findMany.mockResolvedValue([
      {
        id: 'v2',
        status: 'rejected',
        selfieUrl: '/api/photos/u1%2Fverif%2Fs.jpg',
        challenge: 'pouce',
        rejectReason: 'geste_invisible',
        createdAt: new Date('2026-09-24'),
        user: {
          id: 'u1', displayName: 'Camille', email: 'camille@example.org',
          profile: { photos: ['u1/a.jpg', 'u1/b.jpg'] },
          _count: { verificationRequests: 2 },
        },
      },
    ]);
    const res = await GET(new NextRequest('http://localhost/api/admin/verifications?status=rejected'));
    const [v] = (await res.json()).verifications;
    expect(v.geste).toBe('Pouce levé, sous ton menton');
    expect(v.motif).toBe('Le geste demandé ne se voit pas sur la photo.');
    expect(v.tentatives).toBe(2);
    expect(v.user.photos).toEqual(['/api/photos/u1%2Fa.jpg', '/api/photos/u1%2Fb.jpg']);
    expect(v.challenge).toBeUndefined();
    expect(v.rejectReason).toBeUndefined();
  });

  it('une demande antérieure au geste n’a pas de geste', async () => {
    fakeDb.verificationRequest.findMany.mockResolvedValue([
      {
        id: 'v0', status: 'pending', selfieUrl: '/api/photos/u1%2Fs.jpg', challenge: null, rejectReason: null,
        createdAt: new Date('2026-01-01'),
        user: { id: 'u1', displayName: 'A', email: 'a@b.fr', profile: null, _count: { verificationRequests: 1 } },
      },
    ]);
    const [v] = (await (await GET(new NextRequest('http://localhost/api/admin/verifications'))).json()).verifications;
    expect(v.geste).toBeNull();
    expect(v.motif).toBeNull();
  });
});

