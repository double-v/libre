/**
 * Tests — onglet nearby de /api/discover (issue #137)
 *
 * Vérifie que l'API distingue 3 cas au lieu de renvoyer systématiquement
 * une liste vide sans explication :
 * - géoloc jamais activée -> reason: 'geoloc_required'
 * - géoloc activée mais aucun profil dans le rayon -> reason: 'empty_feed'
 * - géoloc activée + profils trouvés -> feed normal, pas de reason
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
  profile: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  block: {
    findMany: vi.fn(),
  },
  like: {
    findMany: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { discover: { limit: 60, windowMs: 60_000 } },
}));

// Import après les mocks
const { GET } = await import('../route');

const ME_ID = randomUUID();
const OTHER_ID = randomUUID();

function makeRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/discover?tab=nearby${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  fakeDb.block.findMany.mockResolvedValue([]);
  fakeDb.like.findMany.mockResolvedValue([]);
  fakeDb.profile.findMany.mockResolvedValue([]);
});

describe('GET /api/discover?tab=nearby (issue #137)', () => {
  it('renvoie reason "geoloc_required" quand le profil n\'existe pas encore', async () => {
    fakeDb.profile.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ users: [], nextCursor: null, reason: 'geoloc_required' });
  });

  it('renvoie reason "geoloc_required" quand lastKnownLat/Lng valent 0 (jamais activée)', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      userId: ME_ID,
      lastKnownLat: 0,
      lastKnownLng: 0,
      maxDistanceKm: 50,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ users: [], nextCursor: null, reason: 'geoloc_required' });
  });

  it('renvoie reason "empty_feed" quand la géoloc est active mais 0 profil dans le rayon', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      userId: ME_ID,
      lastKnownLat: 48.85,
      lastKnownLng: 2.35,
      maxDistanceKm: 50,
    });
    // Un profil existe en base mais bien au-delà du rayon (Marseille depuis Paris, ~660km)
    fakeDb.profile.findMany.mockResolvedValue([
      {
        userId: OTHER_ID,
        bio: '',
        birthDate: null,
        genderIdentity: '',
        orientation: [],
        interests: [],
        practices: [],
        photos: [],
        lastKnownLat: 43.3,
        lastKnownLng: 5.4,
        user: { id: OTHER_ID, displayName: 'Loin', isVerified: false, lastActive: new Date() },
      },
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ users: [], nextCursor: null, reason: 'empty_feed' });
  });

  it('renvoie le feed normal sans reason quand des profils sont dans le rayon', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      userId: ME_ID,
      lastKnownLat: 48.85,
      lastKnownLng: 2.35,
      maxDistanceKm: 50,
    });
    fakeDb.profile.findMany.mockResolvedValue([
      {
        userId: OTHER_ID,
        bio: 'Salut',
        birthDate: null,
        genderIdentity: '',
        orientation: [],
        interests: [],
        practices: [],
        photos: [],
        lastKnownLat: 48.86,
        lastKnownLng: 2.36,
        user: { id: OTHER_ID, displayName: 'Proche', isVerified: false, lastActive: new Date() },
      },
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reason).toBeUndefined();
    expect(body.users).toHaveLength(1);
    expect(body.users[0].userId).toBe(OTHER_ID);
    expect(body.nextCursor).toBeNull();
  });
});
