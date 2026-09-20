/**
 * Garde — le nom de ville saisi à la main ne sort jamais vers autrui (#402,
 * spec 004, SC-003).
 *
 * `cityLabel` et `positionSource` sont privés : « le nom de ta ville n'est
 * visible que par toi » est une promesse affichée, donc adossée à un test par
 * route (corollaire #328, constitution III). Chaque route lue par un autre
 * membre est montée avec une base factice dont **tous** les profils portent une
 * sentinelle ; la réponse sérialisée ne doit pas la contenir.
 *
 * La base factice honore `select` comme Prisma : une route qui sélectionne
 * explicitement ses champs est protégée par construction, une route qui
 * renvoie un profil entier ne l'est que si son whitelist tient.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

const SENTINEL = 'SENTINELLE-VILLE';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: {
    discover: { limit: 60, windowMs: 60_000 },
    geoloc: { limit: 60, windowMs: 60_000 },
  },
}));

// --- Base factice qui applique `select` / `include` comme Prisma ------------

type Args = { select?: Record<string, unknown>; include?: Record<string, unknown> };

function shape(row: unknown, args?: Args): unknown {
  if (row === null || row === undefined || typeof row !== 'object') return row;
  if (Array.isArray(row)) return row.map((r) => shape(r, args));
  const obj = row as Record<string, unknown>;
  if (args?.select) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args.select)) {
      if (v === true) out[k] = obj[k];
      else if (v && typeof v === 'object') out[k] = shape(obj[k], v as Args);
    }
    return out;
  }
  if (args?.include) {
    const out: Record<string, unknown> = { ...obj };
    for (const [k, v] of Object.entries(args.include)) {
      if (v && typeof v === 'object') out[k] = shape(obj[k], v as Args);
    }
    return out;
  }
  return obj;
}

const table = (rows: () => unknown[]) => ({
  findMany: vi.fn(async (args?: Args) => shape(rows(), args)),
  findUnique: vi.fn(async (args?: Args) => shape(rows()[0] ?? null, args)),
  findFirst: vi.fn(async (args?: Args) => shape(rows()[0] ?? null, args)),
});

const ME_ID = randomUUID();
const OTHER_ID = randomUUID();

function profileOf(userId: string, user: Record<string, unknown>) {
  return {
    userId,
    bio: 'Salut',
    birthDate: new Date('1994-01-01'),
    genderIdentity: 'femme',
    orientation: ['bi'],
    relationshipType: ['libre'],
    interests: ['Randonnée'],
    practices: [],
    practicesVisibility: 'everyone',
    photos: [],
    invisibleMode: false,
    photoSensitivityOptIn: false,
    searchGenders: [],
    searchOrientations: [],
    searchInterests: [],
    ageMin: 18,
    ageMax: 99,
    maxDistanceKm: 50,
    searchDistanceKm: null,
    lastKnownLat: 48.86,
    lastKnownLng: 2.35,
    lastGeolocAt: new Date(),
    // Les champs privés, sur TOUS les profils : ville (#402) et avancement du
    // parcours d'accueil (spec 005).
    positionSource: 'city',
    cityLabel: SENTINEL,
    onboardingStep: 1,
    user,
  };
}

function userOf(id: string, name: string) {
  const user: Record<string, unknown> = {
    id,
    displayName: name,
    isVerified: true,
    isBanned: false,
    lastActive: new Date(),
    userKey: null,
    userKeyHistory: [],
  };
  user.profile = profileOf(id, user);
  return user;
}

const me = userOf(ME_ID, 'Moi');
const other = userOf(OTHER_ID, 'Camille');

const encounter = {
  id: randomUUID(),
  userA: ME_ID,
  userB: OTHER_ID,
  latitude: 48.86,
  longitude: 2.35,
  distanceM: 300,
  happenedAt: new Date(),
  userARel: me,
  userBRel: other,
};

const match = {
  id: randomUUID(),
  userA: ME_ID,
  userB: OTHER_ID,
  createdAt: new Date(),
  userARel: me,
  userBRel: other,
  conversation: { id: randomUUID() },
};

const fakeDb = {
  user: table(() => [other]),
  // findUnique = « mon » profil ; findMany = les autres.
  profile: {
    ...table(() => [other.profile]),
    findUnique: vi.fn(async (args?: Args) => shape(me.profile, args)),
  },
  block: table(() => []),
  like: table(() => []),
  match: table(() => [match]),
  encounter: table(() => [encounter]),
  photoModeration: table(() => []),
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
});

async function bodyText(res: Response): Promise<string> {
  expect(res.status).toBe(200);
  return res.text();
}

describe('cityLabel / positionSource / onboardingStep ne sortent jamais vers autrui (#402, spec 005)', () => {
  it('GET /api/users/[id]', async () => {
    const { GET } = await import('@/app/api/users/[id]/route');
    const text = await bodyText(
      await GET(new Request(`http://localhost/api/users/${OTHER_ID}`), { params: Promise.resolve({ id: OTHER_ID }) }),
    );
    expect(text).toContain('Camille');
    expect(text).not.toContain(SENTINEL);
    expect(text).not.toContain('positionSource');
    expect(text).not.toContain('onboardingStep');
  });

  it('GET /api/discover (tab all, nearby, et filtre de distance)', async () => {
    const { GET } = await import('@/app/api/discover/route');
    for (const q of ['', '?tab=nearby', '?distance=50']) {
      const text = await bodyText(await GET(new NextRequest(`http://localhost/api/discover${q}`)));
      expect(text, q).toContain('Camille');
      expect(text, q).not.toContain(SENTINEL);
      expect(text, q).not.toContain('positionSource');
      expect(text, q).not.toContain('onboardingStep');
    }
  });

  it('GET /api/geoloc/nearby', async () => {
    const { GET } = await import('@/app/api/geoloc/nearby/route');
    const text = await bodyText(await GET());
    expect(text).toContain('Camille');
    expect(text).not.toContain(SENTINEL);
    expect(text).not.toContain('positionSource');
    expect(text).not.toContain('onboardingStep');
  });

  it('GET /api/geoloc/crossings', async () => {
    const { GET } = await import('@/app/api/geoloc/crossings/route');
    const text = await bodyText(await GET());
    expect(text).toContain('Camille');
    expect(text).not.toContain(SENTINEL);
    expect(text).not.toContain('positionSource');
    expect(text).not.toContain('onboardingStep');
  });

  it('GET /api/matches', async () => {
    const { GET } = await import('@/app/api/matches/route');
    const text = await bodyText(await GET());
    expect(text).toContain('Camille');
    expect(text).not.toContain(SENTINEL);
    expect(text).not.toContain('positionSource');
    expect(text).not.toContain('onboardingStep');
  });
});
