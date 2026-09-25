/**
 * Tests — filtre par type de relation (#409)
 *
 * Le critère est poussé dans le `where` Prisma comme les autres filtres
 * (#147), jamais appliqué après coup sur une page déjà découpée. Absent =
 * aucune restriction : un profil sans type déclaré reste visible tant que le
 * filtre n'est pas actif.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  profile: { findUnique: vi.fn(), findMany: vi.fn() },
  block: { findMany: vi.fn() },
  like: { findMany: vi.fn() },
  match: { findMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { discover: { limit: 60, windowMs: 60_000 } },
}));

const { GET } = await import('../route');

const ME_ID = randomUUID();

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/discover?${query}`);
}

/** `where` reçu par le premier `profile.findMany` (la page du feed). */
function capturedWhere(): Record<string, unknown> {
  const call = fakeDb.profile.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
  return call.where;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  fakeDb.block.findMany.mockResolvedValue([]);
  fakeDb.like.findMany.mockResolvedValue([]);
  fakeDb.match.findMany.mockResolvedValue([]);
  fakeDb.profile.findMany.mockResolvedValue([]);
  // La lectrice a dit ce qu'elle cherche : sans ça, le filtre est ignoré
  // (intention en miroir, spec 008) — cas couvert par `intention-never-leaks`.
  fakeDb.profile.findUnique.mockResolvedValue({ userId: ME_ID, lastKnownLat: null, lastKnownLng: null, relationshipType: ['sérieux'] });
});

describe('GET /api/discover — filtre type de relation (#409)', () => {
  it('pousse `relationshipType hasSome` dans le where quand le paramètre est fourni', async () => {
    const res = await GET(makeRequest('tab=all&relationshipType=libre,poly'));
    expect(res.status).toBe(200);
    expect(capturedWhere()).toMatchObject({
      relationshipType: { hasSome: ['libre', 'poly'] },
    });
  });

  it('ne restreint pas sur le type de relation quand le paramètre est absent', async () => {
    const res = await GET(makeRequest('tab=all'));
    expect(res.status).toBe(200);
    expect(capturedWhere()).not.toHaveProperty('relationshipType');
  });

  it('ignore un paramètre vide (`relationshipType=`) comme une absence', async () => {
    const res = await GET(makeRequest('tab=all&relationshipType='));
    expect(res.status).toBe(200);
    expect(capturedWhere()).not.toHaveProperty('relationshipType');
  });

  it('se cumule avec les autres filtres au lieu de les remplacer', async () => {
    const res = await GET(makeRequest('tab=all&orientation=bi&relationshipType=casual'));
    expect(res.status).toBe(200);
    expect(capturedWhere()).toMatchObject({
      orientation: { hasSome: ['bi'] },
      relationshipType: { hasSome: ['casual'] },
    });
  });
});
