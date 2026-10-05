/**
 * GET /api/admin/users (#423) — la liste ne sérialise jamais une adresse
 * e-mail entière : elle part masquée du serveur, sous un autre nom de champ,
 * pour qu'aucune page ne puisse l'afficher par accident.
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
  user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  profileSignal: { findMany: vi.fn(async () => [] as unknown[]) },
  profileReview: { findMany: vi.fn(async () => [] as unknown[]) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('../route');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'admin', email: 'admin@x.fr', role: 'ADMIN' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
});

const ADRESSE = 'julie.martin@example.fr';

describe('GET /api/admin/users', () => {
  it("renvoie l'e-mail masqué et jamais l'adresse complète", async () => {
    fakeDb.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        displayName: 'Julie',
        email: ADRESSE,
        role: 'USER',
        isBanned: false,
        isVerified: true,
        createdAt: new Date('2026-01-01'),
        lastActive: null,
        profile: { photos: ['a.jpg'] },
      },
    ]);
    fakeDb.user.count.mockResolvedValue(1);

    const res = await GET(new NextRequest('http://localhost/api/admin/users?search=julie'));
    expect(res.status).toBe(200);
    const texte = await res.text();
    expect(texte).not.toContain(ADRESSE);
    expect(texte).not.toContain('julie.martin');

    const body = JSON.parse(texte);
    expect(body.users[0].emailMasque).toBe('ju***@ex***.fr');
    expect(body.users[0]).not.toHaveProperty('email');
    expect(body.users[0].photoCount).toBe(1);
  });

  it("cherche en base sur l'adresse entière", async () => {
    fakeDb.user.findMany.mockResolvedValue([]);
    fakeDb.user.count.mockResolvedValue(0);
    await GET(new NextRequest(`http://localhost/api/admin/users?search=${ADRESSE}`));
    const where = fakeDb.user.findMany.mock.calls[0][0].where;
    // La recherche est le premier terme du AND ; le second, le filtre de niveau (spec 010).
    expect(where.AND[0].OR).toContainEqual({ email: { contains: ADRESSE, mode: 'insensitive' } });
  });
});

describe('GET /api/admin/users — indice de fiabilité (spec 010, US3)', () => {
  const ligne = (id: string, createdAt = '2026-10-01') => ({
    id, displayName: id, email: `${id}@example.test`, role: 'USER', isBanned: false, isVerified: false,
    createdAt: new Date(createdAt), lastActive: null, profile: { photos: [] },
  });
  const get = (qs: string) => GET(new NextRequest(`http://localhost/api/admin/users?${qs}`));

  beforeEach(() => {
    fakeDb.profileSignal.findMany.mockResolvedValue([
      { userId: 'douteux', type: 'lexique_arnaque', force: 'fort', createdAt: new Date('2026-10-05') },
      { userId: 'surveille', type: 'appareil_partage', force: 'faible', createdAt: new Date('2026-10-05') },
    ]);
    fakeDb.profileReview.findMany.mockResolvedValue([]);
    // Premier findMany utilisateur : les comptes vérifiés parmi les signalés.
    fakeDb.user.findMany.mockImplementation(async ({ where, select }: { where: Record<string, unknown>; select: Record<string, unknown> }) => {
      if (where?.isVerified) return [];
      if (select && Object.keys(select).length === 2) return [ligne('fiable', '2026-10-03'), ligne('douteux'), ligne('surveille', '2026-10-02')];
      const ids = (where?.id as { in?: string[] } | undefined)?.in;
      return (ids ?? ['fiable', 'douteux', 'surveille']).map((id) => ligne(id));
    });
    fakeDb.user.count.mockResolvedValue(1);
  });

  it('chaque ligne porte son niveau et le nombre de signaux non tranchés', async () => {
    const body = await (await get('')).json();
    const parId = Object.fromEntries(body.users.map((u: { id: string; niveau: string; signauxRecents: number }) => [u.id, [u.niveau, u.signauxRecents]]));
    expect(parId).toEqual({ fiable: ['fiable', 0], douteux: ['douteux', 1], surveille: ['a_surveiller', 1] });
  });

  it('filtre « douteux » : la base ne cherche que les comptes de ce niveau', async () => {
    await get('niveau=douteux');
    const appel = fakeDb.user.findMany.mock.calls.find((c) => !c[0].where?.isVerified)![0];
    expect(appel.where.AND[1]).toEqual({ id: { in: ['douteux'] } });
  });

  it('filtre « fiable » : exclut les comptes signalés qui pèsent encore', async () => {
    await get('niveau=fiable');
    const appel = fakeDb.user.findMany.mock.calls.find((c) => !c[0].where?.isVerified)![0];
    expect(appel.where.AND[1]).toEqual({ id: { notIn: ['douteux', 'surveille'] } });
  });

  it('tri par fiabilité : douteux, puis à surveiller, puis fiables', async () => {
    const body = await (await get('tri=fiabilite')).json();
    expect(body.users.map((u: { id: string }) => u.id)).toEqual(['douteux', 'surveille', 'fiable']);
    expect(body.total).toBe(3);
  });

  it('400 sur une valeur inconnue', async () => {
    expect((await get('niveau=suspect')).status).toBe(400);
    expect((await get('tri=nom')).status).toBe(400);
  });
});
