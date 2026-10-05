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
      .mockResolvedValueOnce({ id: 'u-1', reportsReceived: [], verificationRequests: [], profileSignals: [] });

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
        profileSignals: [],
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

describe('GET /api/admin/users/[id] — indice de fiabilité (spec 010)', () => {
  it('le niveau et chaque indice, avec la mention « peut être légitime » pour le contexte', async () => {
    fakeDb.user.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce({
        id: 'u-1',
        isVerified: false,
        reportsReceived: [],
        verificationRequests: [],
        verifInviteeAt: new Date('2026-10-05'),
        profileReview: null,
        profileSignals: [
          { type: 'likes_rafale', force: 'fort', createdAt: new Date('2026-10-05'), extrait: null, autreUserId: null },
          { type: 'appareil_partage', force: 'faible', createdAt: new Date('2026-10-04'), extrait: null, autreUserId: 'u-2' },
        ],
      });
    const res = await GET(new NextRequest('http://x/api/admin/users/u-1'), { params: Promise.resolve({ id: 'u-1' }) });
    const body = await res.json();
    expect(body.fiabilite.niveau).toBe('douteux');
    expect(body.fiabilite.invitation).toEqual({ depuis: '2026-10-05T00:00:00.000Z' });
    expect(body.fiabilite.indices.map((i: { type: string; legitimePossible: boolean }) => [i.type, i.legitimePossible])).toEqual([
      ['likes_rafale', false],
      ['appareil_partage', true],
    ]);
    // Les champs bruts ne doublent pas le bloc dérivé.
    expect(body.user.profileSignals).toBeUndefined();
    expect(body.user.verifInviteeAt).toBeUndefined();
  });
});
