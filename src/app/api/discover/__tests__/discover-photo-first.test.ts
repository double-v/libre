/**
 * Tests — « Pour toi » montre les visages d'abord (spec 005, FR-022),
 * contrat `contracts/discover-feed-order.md`.
 *
 * Personne n'est masqué : un profil sans photo reste dans le feed, plus bas.
 * L'ordre tient sur les deux chemins de `tab=all` (sans et avec filtre de
 * distance) et survit à la pagination : la page 2 ne répète ni n'oublie
 * personne. FR-003 au passage : sans filtre d'âge, un profil sans date de
 * naissance n'est pas exclu par le `where`.
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
vi.mock('@/lib/photo-veil', () => ({ __esModule: true, veiledPhotoKeys: vi.fn(async () => []) }));

const { GET } = await import('../route');

const ME_ID = randomUUID();
const PARIS = { lat: 48.8566, lng: 2.3522 };
const T0 = Date.parse('2026-09-01T00:00:00Z');

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/discover?${query}`);
}

/** Profil i : photo si `withPhoto`, activité décroissante avec `ageMin`. */
function makeProfile(i: number, withPhoto: boolean, ageMin: number, birthDate: Date | null = new Date('1990-01-01')) {
  const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
  return {
    userId: id,
    bio: '',
    birthDate,
    genderIdentity: '',
    orientation: [],
    interests: [],
    practices: [],
    practicesVisibility: 'matches',
    photos: withPhoto ? [`p${i}.jpg`] : [],
    lastKnownLat: PARIS.lat,
    lastKnownLng: PARIS.lng,
    user: { id, displayName: `U${i}`, isVerified: false, lastActive: new Date(T0 - ageMin * 60_000) },
  };
}

async function ids(query: string): Promise<{ ids: string[]; nextCursor: string | null }> {
  const res = await GET(makeRequest(query));
  expect(res.status).toBe(200);
  const json = await res.json();
  return { ids: json.users.map((u: { userId: string }) => u.userId), nextCursor: json.nextCursor };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  fakeDb.block.findMany.mockResolvedValue([]);
  fakeDb.like.findMany.mockResolvedValue([]);
  fakeDb.match.findMany.mockResolvedValue([]);
  fakeDb.profile.findUnique.mockResolvedValue({
    userId: ME_ID, lastKnownLat: PARIS.lat, lastKnownLng: PARIS.lng, maxDistanceKm: 50, searchDistanceKm: null,
  });
});

// Sans photo mais très actif (1), avec photo et vieux (2), avec photo et
// récent (3), sans photo et vieux (4). Attendu : 3, 2, 1, 4.
const mixed = [makeProfile(1, false, 1), makeProfile(2, true, 100), makeProfile(3, true, 10), makeProfile(4, false, 200)];
const expectedOrder = [3, 2, 1, 4].map((i) => mixed[i - 1].userId);

describe('GET /api/discover?tab=all — les visages d’abord (FR-022)', () => {
  it.each([['sans filtre de distance', 'tab=all'], ['avec filtre de distance', 'tab=all&distance=50']])(
    '%s : photo avant sans photo, puis activité récente, sans masquer personne',
    async (_label, query) => {
      fakeDb.profile.findMany.mockResolvedValue(mixed);
      const page = await ids(query);
      expect(page.ids).toEqual(expectedOrder);
    },
  );

  it('la pagination respecte l’ordre : aucun doublon, aucun oubli sur deux pages', async () => {
    // 25 profils : 12 avec photo, 13 sans, activités entremêlées.
    const all = Array.from({ length: 25 }, (_, i) => makeProfile(i + 1, i % 2 === 0, (i * 7) % 25));
    fakeDb.profile.findMany.mockResolvedValue(all);
    const p1 = await ids('tab=all');
    expect(p1.ids).toHaveLength(20);
    expect(p1.nextCursor).toBeTruthy();
    const p2 = await ids(`tab=all&cursor=${encodeURIComponent(p1.nextCursor!)}`);
    expect(p2.ids).toHaveLength(5);
    expect(p2.nextCursor).toBeNull();

    const seen = [...p1.ids, ...p2.ids];
    expect(new Set(seen).size).toBe(25);
    // Tous les « avec photo » précèdent tous les « sans photo ».
    const withPhoto = new Set(all.filter((p) => p.photos.length > 0).map((p) => p.userId));
    const firstWithout = seen.findIndex((id) => !withPhoto.has(id));
    expect(seen.slice(firstWithout).some((id) => withPhoto.has(id))).toBe(false);
  });

  it('FR-003 : sans filtre d’âge, un profil sans date de naissance reste dans le feed', async () => {
    fakeDb.profile.findMany.mockResolvedValue([makeProfile(1, true, 1, null)]);
    const where = (await (async () => { await ids('tab=all'); return fakeDb.profile.findMany.mock.calls[0][0].where; })());
    expect(where).not.toHaveProperty('birthDate');
  });
});
