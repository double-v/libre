// @vitest-environment node
/**
 * GET /api/admin/verifications (#423, #436, spec 012) — la file comparée.
 *
 * L'e-mail part masqué ; le code attendu, la lecture automatique, le rang de
 * tentative et le refus précédent sont donnés à la modération (FR-006) ; les
 * demandes au geste gardent leur geste (FR-008). La base factice honore
 * `where` et `select` : un champ ou un filtre oublié se voit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

type Demande = {
  id: string; userId: string; status: string; selfieUrl: string; createdAt: Date; resolvedAt: Date | null;
  challenge: string | null; rejectReason: string | null; codeAttendu: string | null; codeLu: string | null;
  tentative: number; sansDonneesAppareil: boolean | null;
};
let demandes: Demande[];
const users: Record<string, { id: string; displayName: string; email: string; profile: { photos: string[] } | null }> = {
  u1: { id: 'u1', displayName: 'Camille', email: 'camille.durand@example.org', profile: { photos: ['u1/a.jpg'] } },
  u2: { id: 'u2', displayName: 'Sam', email: 'sam@example.org', profile: null },
};

const fakeDb = {
  user: { findUnique: async () => ({ role: 'ADMIN', isBanned: false }) },
  verificationRequest: {
    findMany: async ({ where, select, include }: {
      where: { status?: string; userId?: { in: string[] } };
      select?: Record<string, boolean>;
      include?: unknown;
    }) => demandes
      .filter((d) => (!where.status || d.status === where.status) && (!where.userId || where.userId.in.includes(d.userId)))
      .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0))
      .map((d) => {
        if (select) return Object.fromEntries(Object.entries(d).filter(([k]) => select[k]));
        return include ? { ...d, user: users[d.userId] } : d;
      }),
  },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('../route');
const lire = async (q = '') => (await (await GET(new NextRequest(`http://localhost/api/admin/verifications${q}`))).json()).verifications;

function demande(d: Partial<Demande>): Demande {
  return {
    id: 'v', userId: 'u1', status: 'pending', selfieUrl: '/api/photos/s.jpg', createdAt: new Date('2026-11-10'),
    resolvedAt: null, challenge: null, rejectReason: null, codeAttendu: null, codeLu: null, tentative: 1,
    sansDonneesAppareil: null, ...d,
  };
}

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } });
  demandes = [];
});

describe('GET /api/admin/verifications', () => {
  it('e-mail masqué, jamais l’adresse entière', async () => {
    demandes = [demande({ id: 'v1', codeAttendu: '7358' })];
    const res = await GET(new NextRequest('http://localhost/api/admin/verifications'));
    const texte = await res.text();
    expect(texte).not.toContain('camille.durand');
    expect(JSON.parse(texte).verifications[0].user).toEqual({
      id: 'u1', displayName: 'Camille', emailMasque: 'ca***@ex***.org', photos: ['/api/photos/u1%2Fa.jpg'],
    });
  });

  it('demande au code : code attendu, lecture, indice d’appareil ; pas d’ancien geste', async () => {
    demandes = [demande({ id: 'v1', codeAttendu: '4926', codeLu: '4962', sansDonneesAppareil: true, challenge: 'pouce' })];
    const [v] = await lire();
    expect(v).toMatchObject({ codeAttendu: '4926', codeLu: '4962', sansDonneesAppareil: true, ancienGeste: null, tentative: 1, refusPrecedent: null });
    expect(v.challenge).toBeUndefined();
  });

  it('FR-008 : demande au geste encore en file, son geste est lisible', async () => {
    demandes = [demande({ id: 'v0', challenge: 'pouce' })];
    expect((await lire())[0]).toMatchObject({ codeAttendu: null, ancienGeste: 'Pouce levé, sous ton menton' });
  });

  it('2e tentative : le refus précédent de ce membre, pas celui d’un autre', async () => {
    demandes = [
      demande({ id: 'r-autre', userId: 'u2', status: 'rejected', rejectReason: 'ecran', resolvedAt: new Date('2026-11-09T10:00:00Z'), createdAt: new Date('2026-11-09') }),
      demande({ id: 'r1', status: 'rejected', rejectReason: 'visage', resolvedAt: new Date('2026-11-08T10:00:00Z'), createdAt: new Date('2026-11-08') }),
      demande({ id: 'v2', codeAttendu: '2345', tentative: 2, createdAt: new Date('2026-11-10') }),
    ];
    const [v] = await lire();
    expect(v.id).toBe('v2');
    expect(v.refusPrecedent).toEqual({ motif: 'Visage peu visible', at: '2026-11-08T10:00:00.000Z' });
  });

  it('deux membres en 2e tentative dans la file : chacun son propre refus précédent', async () => {
    demandes = [
      demande({ id: 'r2', userId: 'u2', status: 'rejected', rejectReason: 'ecran', resolvedAt: new Date('2026-11-09T10:00:00Z'), createdAt: new Date('2026-11-09') }),
      demande({ id: 'r1', status: 'rejected', rejectReason: 'visage', resolvedAt: new Date('2026-11-08T10:00:00Z'), createdAt: new Date('2026-11-08') }),
      demande({ id: 'v1', codeAttendu: '2345', tentative: 2, createdAt: new Date('2026-11-10') }),
      demande({ id: 'v2', userId: 'u2', codeAttendu: '3456', tentative: 2, createdAt: new Date('2026-11-11') }),
    ];
    const file = await lire();
    const par = Object.fromEntries(file.map((v: { id: string; refusPrecedent: unknown }) => [v.id, v.refusPrecedent]));
    expect(par).toEqual({
      v1: { motif: 'Visage peu visible', at: '2026-11-08T10:00:00.000Z' },
      v2: { motif: 'Écran, retouche ou image générée', at: '2026-11-09T10:00:00.000Z' },
    });
  });

  it('demande refusée : motif tel que lu par le membre', async () => {
    demandes = [demande({ id: 'v3', status: 'rejected', rejectReason: 'code', resolvedAt: new Date() })];
    expect((await lire('?status=rejected'))[0].motif).toBe('Le code n’est pas écrit à la main, pas lisible ou pas exact.');
  });

  it('statut inconnu dans l’adresse : on retombe sur la file en attente', async () => {
    demandes = [demande({ id: 'p' }), demande({ id: 'a', status: 'approved' })];
    expect((await lire('?status=%7B%22not%22%3A1%7D')).map((v: { id: string }) => v.id)).toEqual(['p']);
  });
});
