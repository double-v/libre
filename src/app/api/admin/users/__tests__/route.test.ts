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
    expect(where.OR).toContainEqual({ email: { contains: ADRESSE, mode: 'insensitive' } });
  });
});
