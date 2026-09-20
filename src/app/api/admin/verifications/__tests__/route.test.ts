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
        user: { id: 'u1', displayName: 'Paul', email: 'paul.durand@example.org' },
      },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/admin/verifications'));
    const texte = await res.text();
    expect(texte).not.toContain('paul.durand@example.org');
    expect(texte).not.toContain('paul.durand');

    const body = JSON.parse(texte);
    expect(body.verifications[0].user).toEqual({ id: 'u1', displayName: 'Paul', emailMasque: 'pa***@ex***.org' });
    expect(body.verifications[0].selfieUrl).toBe('https://r2/selfie.jpg');
  });
});
