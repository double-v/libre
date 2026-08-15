/**
 * Tests — filtre de distance et distance affichée (#327)
 *
 * Deux exigences que le reste de la suite ne couvre pas :
 * - le filtre distance mord aussi sur le feed « Pour toi » (tab=all), sans
 *   casser la pagination — et il est poussé en SQL via une bounding box, pas
 *   appliqué après coup sur une page déjà découpée (le piège de #147) ;
 * - hors segment « À proximité », l'API ne laisse sortir qu'une TRANCHE. Un
 *   kilométrage précis dans le JSON serait lisible dans l'onglet réseau et
 *   viderait de son sens la garde anti-trilatération, quel que soit l'affichage.
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
const PARIS = { lat: 48.8566, lng: 2.3522 };

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/discover?${query}`);
}

/** Profil situé à `deltaLng` degrés à l'est de Paris (~73 km par degré). */
function makeProfile(
  id: string,
  opts: { deltaLng?: number; lat?: number; lng?: number; lastActive?: Date } = {},
) {
  return {
    userId: id,
    bio: '',
    birthDate: null,
    genderIdentity: '',
    orientation: [],
    interests: [],
    practices: [],
    photos: [],
    lastKnownLat: opts.lat ?? PARIS.lat,
    lastKnownLng: opts.lng ?? PARIS.lng + (opts.deltaLng ?? 0),
    user: {
      id,
      displayName: `U-${id.slice(0, 4)}`,
      isVerified: false,
      lastActive: opts.lastActive ?? new Date(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  fakeDb.block.findMany.mockResolvedValue([]);
  fakeDb.like.findMany.mockResolvedValue([]);
  fakeDb.profile.findMany.mockResolvedValue([]);
  fakeDb.profile.findUnique.mockResolvedValue({
    userId: ME_ID,
    lastKnownLat: PARIS.lat,
    lastKnownLng: PARIS.lng,
    maxDistanceKm: 50,
    searchDistanceKm: null,
  });
});

describe('GET /api/discover?tab=all&distance= (#327)', () => {
  it('pousse une bounding box dans le where SQL au lieu de tout charger', async () => {
    await GET(makeRequest('tab=all&distance=25'));

    const where = fakeDb.profile.findMany.mock.calls[0][0].where;
    expect(where.lastKnownLat.gte).toBeLessThan(PARIS.lat);
    expect(where.lastKnownLat.lte).toBeGreaterThan(PARIS.lat);
    expect(where.lastKnownLng.gte).toBeLessThan(PARIS.lng);
    expect(where.lastKnownLng.lte).toBeGreaterThan(PARIS.lng);
    // Les profils sans géoloc restent exclus : 0/0 est la sentinelle du repo.
    expect(where.lastKnownLat.not).toBe(0);
  });

  it('écarte un profil hors du rayon même s\'il est dans la bounding box', async () => {
    const proche = randomUUID();
    const coin = randomUUID();
    fakeDb.profile.findMany.mockResolvedValue([
      makeProfile(proche, { deltaLng: 0.05 }), // ~3,7 km
      // Coin de la bbox : dans le rectangle, hors du disque de 25 km.
      makeProfile(coin, { lat: PARIS.lat + 0.2, lng: PARIS.lng + 0.3 }), // ~34 km
    ]);

    const res = await GET(makeRequest('tab=all&distance=25'));
    const body = await res.json();

    expect(body.users.map((u: { userId: string }) => u.userId)).toEqual([proche]);
  });

  it('renvoie une tranche, jamais un kilométrage précis', async () => {
    const id = randomUUID();
    fakeDb.profile.findMany.mockResolvedValue([makeProfile(id, { deltaLng: 0.05 })]);

    const res = await GET(makeRequest('tab=all&distance=25'));
    const body = await res.json();

    expect(body.users[0].distanceBucket).toBe('3-5');
    expect(body.users[0].distanceKm).toBeUndefined();
    // Aucune coordonnée ne doit fuir non plus.
    expect(JSON.stringify(body)).not.toContain('lastKnownLat');
  });

  it('signale empty_feed quand le filtre vide le feed', async () => {
    fakeDb.profile.findMany.mockResolvedValue([makeProfile(randomUUID(), { deltaLng: 5 })]);

    const res = await GET(makeRequest('tab=all&distance=10'));
    const body = await res.json();

    expect(body.users).toHaveLength(0);
    expect(body.reason).toBe('empty_feed');
  });

  it('sans géoloc du viewer : ne filtre pas le feed principal, mais le dit', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      userId: ME_ID,
      lastKnownLat: 0,
      lastKnownLng: 0,
      maxDistanceKm: 50,
      searchDistanceKm: null,
    });
    fakeDb.profile.findMany.mockResolvedValue([makeProfile(randomUUID(), { deltaLng: 5 })]);

    const res = await GET(makeRequest('tab=all&distance=10'));
    const body = await res.json();

    // Vider le feed principal parce que la géoloc manque serait une punition ;
    // on rend la liste complète et l'UI explique pourquoi le filtre dort.
    expect(body.users).toHaveLength(1);
    expect(body.reason).toBe('geoloc_required');
    expect(body.users[0].distanceBucket).toBeUndefined();
  });

  it('pagine sans doublon ni trou sur le feed filtré par distance', async () => {
    const base = Date.now();
    const profiles = Array.from({ length: 25 }, (_, i) =>
      makeProfile(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, {
        deltaLng: 0.001 * (i + 1),
        lastActive: new Date(base - i * 60_000), // activité décroissante
      }),
    );
    fakeDb.profile.findMany.mockResolvedValue(profiles);

    const page1 = await (await GET(makeRequest('tab=all&distance=50'))).json();
    expect(page1.users).toHaveLength(20);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await (
      await GET(makeRequest(`tab=all&distance=50&cursor=${encodeURIComponent(page1.nextCursor)}`))
    ).json();
    expect(page2.users).toHaveLength(5);
    expect(page2.nextCursor).toBeNull();

    const ids = [...page1.users, ...page2.users].map((u: { userId: string }) => u.userId);
    expect(new Set(ids).size).toBe(25);
  });
});

describe('GET /api/discover?tab=all — distance affichée sans filtre (#327)', () => {
  it('affiche la tranche dès que les deux profils sont géolocalisés', async () => {
    fakeDb.profile.findMany.mockResolvedValue([
      makeProfile(randomUUID(), { deltaLng: 0.005 }), // < 1 km
      makeProfile(randomUUID(), { deltaLng: 2 }), // ~146 km
    ]);

    const res = await GET(makeRequest('tab=all'));
    const body = await res.json();

    expect(body.users[0].distanceBucket).toBe('lt1');
    expect(body.users[1].distanceBucket).toBe('gt50');
    // Chemin historique conservé : pagination par curseur Prisma.
    expect(fakeDb.profile.findMany.mock.calls[0][0].take).toBe(21);
  });

  it('n\'affiche rien quand l\'autre profil n\'a pas de géoloc', async () => {
    fakeDb.profile.findMany.mockResolvedValue([
      makeProfile(randomUUID(), { lat: 0, lng: 0 }),
    ]);

    const res = await GET(makeRequest('tab=all'));
    const body = await res.json();

    expect(body.users[0].distanceBucket).toBeUndefined();
    expect(body.users[0].distanceKm).toBeUndefined();
  });

  it('n\'affiche rien quand c\'est le viewer qui n\'a pas de géoloc', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      userId: ME_ID,
      lastKnownLat: 0,
      lastKnownLng: 0,
      maxDistanceKm: 50,
      searchDistanceKm: null,
    });
    fakeDb.profile.findMany.mockResolvedValue([makeProfile(randomUUID(), { deltaLng: 0.01 })]);

    const res = await GET(makeRequest('tab=all'));
    const body = await res.json();

    expect(body.users[0].distanceBucket).toBeUndefined();
  });
});

describe('GET /api/discover?tab=nearby — précision conservée (#327)', () => {
  it('garde le kilométrage sur le segment « À proximité »', async () => {
    fakeDb.profile.findMany.mockResolvedValue([makeProfile(randomUUID(), { deltaLng: 0.05 })]);

    const res = await GET(makeRequest('tab=nearby'));
    const body = await res.json();

    expect(body.users[0].distanceKm).toBe(4);
    expect(body.users[0].distanceBucket).toBeUndefined();
  });

  it('utilise le filtre de la requête comme rayon quand il est fourni', async () => {
    fakeDb.profile.findMany.mockResolvedValue([makeProfile(randomUUID(), { deltaLng: 0.5 })]); // ~36 km

    const large = await (await GET(makeRequest('tab=nearby&distance=50'))).json();
    expect(large.users).toHaveLength(1);

    const serre = await (await GET(makeRequest('tab=nearby&distance=10'))).json();
    expect(serre.users).toHaveLength(0);
  });

  it('retombe sur searchDistanceKm puis maxDistanceKm quand la requête ne dit rien', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      userId: ME_ID,
      lastKnownLat: PARIS.lat,
      lastKnownLng: PARIS.lng,
      maxDistanceKm: 50,
      searchDistanceKm: 10,
    });
    fakeDb.profile.findMany.mockResolvedValue([makeProfile(randomUUID(), { deltaLng: 0.5 })]); // ~36 km

    const body = await (await GET(makeRequest('tab=nearby'))).json();
    expect(body.users).toHaveLength(0); // 36 km > searchDistanceKm=10
  });
});
