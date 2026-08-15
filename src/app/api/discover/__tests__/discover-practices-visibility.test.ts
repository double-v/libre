/**
 * Tests de non-régression — les pratiques ne fuitent plus dans le feed (#328).
 *
 * C'est le test qui manquait : `/profil` promettait « ne s'affichent que pour
 * vos matches » pendant que cette route renvoyait `practices` à tout compte
 * connecté, sur les trois onglets, et que ProfileCard les affichait en tags.
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
const OTHER_ID = randomUUID();

function profileOf(id: string, visibility: string) {
  return {
    userId: id,
    bio: '',
    birthDate: null,
    genderIdentity: '',
    orientation: [],
    interests: ['Randonnée'],
    practices: ['Massage', 'Slow sex'],
    practicesVisibility: visibility,
    photos: [],
    lastKnownLat: 0,
    lastKnownLng: 0,
    user: { id, displayName: 'Camille', isVerified: false, lastActive: new Date() },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  fakeDb.block.findMany.mockResolvedValue([]);
  fakeDb.like.findMany.mockResolvedValue([]);
  fakeDb.match.findMany.mockResolvedValue([]);
  fakeDb.profile.findUnique.mockResolvedValue({
    userId: ME_ID,
    lastKnownLat: 0,
    lastKnownLng: 0,
    maxDistanceKm: 50,
    searchDistanceKm: null,
  });
});

describe.each(['all', 'nearby', 'online'])('GET /api/discover?tab=%s — pratiques (#328)', (tab) => {
  // Le segment « À proximité » exige une géoloc : on la fournit pour ce tab.
  const geo = tab === 'nearby';

  beforeEach(() => {
    if (geo) {
      fakeDb.profile.findUnique.mockResolvedValue({
        userId: ME_ID,
        lastKnownLat: 48.8566,
        lastKnownLng: 2.3522,
        maxDistanceKm: 50,
        searchDistanceKm: null,
      });
    }
  });

  function withGeo(p: ReturnType<typeof profileOf>) {
    return geo ? { ...p, lastKnownLat: 48.86, lastKnownLng: 2.36 } : p;
  }

  it('n\'expose pas les pratiques d\'un profil « matches » à un non-match', async () => {
    fakeDb.profile.findMany.mockResolvedValue([withGeo(profileOf(OTHER_ID, 'matches'))]);

    const res = await GET(new NextRequest(`http://localhost/api/discover?tab=${tab}`));
    const body = await res.json();

    expect(body.users).toHaveLength(1);
    // Clé absente, pas tableau vide : « pas d'accès » ≠ « aucune pratique ».
    expect(body.users[0]).not.toHaveProperty('practices');
    expect(JSON.stringify(body)).not.toContain('Massage');
    // Le reste du profil passe normalement.
    expect(body.users[0].interests).toEqual(['Randonnée']);
  });

  it('expose les pratiques d\'un profil « public »', async () => {
    fakeDb.profile.findMany.mockResolvedValue([withGeo(profileOf(OTHER_ID, 'public'))]);

    const res = await GET(new NextRequest(`http://localhost/api/discover?tab=${tab}`));
    const body = await res.json();

    expect(body.users[0].practices).toEqual(['Massage', 'Slow sex']);
  });

  it('expose les pratiques d\'un profil « matches » à un match', async () => {
    fakeDb.match.findMany.mockResolvedValue([{ userA: ME_ID, userB: OTHER_ID }]);
    fakeDb.profile.findMany.mockResolvedValue([withGeo(profileOf(OTHER_ID, 'matches'))]);

    const res = await GET(new NextRequest(`http://localhost/api/discover?tab=${tab}`));
    const body = await res.json();

    expect(body.users[0].practices).toEqual(['Massage', 'Slow sex']);
  });

  it('ferme sur une valeur de visibilité inconnue', async () => {
    fakeDb.profile.findMany.mockResolvedValue([withGeo(profileOf(OTHER_ID, ''))]);

    const res = await GET(new NextRequest(`http://localhost/api/discover?tab=${tab}`));
    const body = await res.json();

    expect(body.users[0]).not.toHaveProperty('practices');
  });
});

describe('GET /api/discover — sens de la relation de match (#328)', () => {
  it('reconnaît le match quel que soit le côté (userA ou userB)', async () => {
    fakeDb.match.findMany.mockResolvedValue([{ userA: OTHER_ID, userB: ME_ID }]);
    fakeDb.profile.findMany.mockResolvedValue([profileOf(OTHER_ID, 'matches')]);

    const res = await GET(new NextRequest('http://localhost/api/discover?tab=all'));
    const body = await res.json();

    expect(body.users[0].practices).toEqual(['Massage', 'Slow sex']);
  });

  it('n\'ouvre pas sur le match d\'un tiers', async () => {
    const tiers = randomUUID();
    fakeDb.match.findMany.mockResolvedValue([{ userA: ME_ID, userB: tiers }]);
    fakeDb.profile.findMany.mockResolvedValue([profileOf(OTHER_ID, 'matches')]);

    const res = await GET(new NextRequest('http://localhost/api/discover?tab=all'));
    const body = await res.json();

    expect(body.users[0]).not.toHaveProperty('practices');
  });
});
