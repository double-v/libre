/**
 * Non-régression #321 — la fiche `/admin/users/[id]` lit
 * `r.reporter.displayName` et `r.description` sur chaque signalement reçu.
 * Le select ne remontait que `{ id, reason, createdAt, reporterId }`, ce qui
 * faisait jeter un TypeError à la page dès qu'un utilisateur avait un
 * signalement en attente — soit précisément le cas où un admin l'ouvre.
 *
 * Ce test verrouille le contrat côté API : tant que la page consomme ces
 * champs, la requête doit les demander.
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
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

const { GET } = await import('@/app/api/admin/users/[id]/route');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@x.fr', role: 'ADMIN' },
  });
});

describe('GET /api/admin/users/[id] — signalements reçus', () => {
  it('demande description et la relation reporter, pas seulement reporterId', async () => {
    // 1er appel : requireAdmin() vérifie le rôle. 2e : la requête de la fiche.
    fakeDb.user.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce({ id: 'u-1', reportsReceived: [], verificationRequests: [] });

    await GET(new NextRequest('http://x/api/admin/users/u-1'), {
      params: Promise.resolve({ id: 'u-1' }),
    });

    const select = fakeDb.user.findUnique.mock.calls[1][0].select.reportsReceived.select;
    expect(select.description).toBe(true);
    expect(select.reporter).toEqual({ select: { id: true, displayName: true } });
  });

  it('remonte le displayName du signalant jusqu\'à la réponse', async () => {
    fakeDb.user.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce({
        id: 'u-1',
        reportsReceived: [
          {
            id: 'r-1',
            reason: 'harcèlement',
            description: 'messages insistants',
            createdAt: new Date('2026-08-01'),
            reporter: { id: 'u-2', displayName: 'Camille' },
          },
        ],
        verificationRequests: [],
      });

    const res = await GET(new NextRequest('http://x/api/admin/users/u-1'), {
      params: Promise.resolve({ id: 'u-1' }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.reportsReceived[0].reporter.displayName).toBe('Camille');
    expect(data.user.reportsReceived[0].description).toBe('messages insistants');
  });
});
