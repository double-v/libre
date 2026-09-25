/**
 * Garde — l'intention d'autrui ne sort jamais vers une lectrice qui n'a pas dit
 * la sienne (spec 008, #452 ; FR-001, FR-014, SC-001).
 *
 * « Tu vois ce que tu montres » est une promesse affichée : elle est adossée à
 * un test **par route** qui sérialise l'intention d'une autre personne
 * (corollaire #328, constitution III). Même base factice que
 * `city-label-never-leaks` : elle honore `select`, et l'intention de la
 * personne lue porte une sentinelle qu'on cherche dans le JSON.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

const SENTINEL = 'SENTINELLE-INTENTION';

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
    relationshipType: [SENTINEL],
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

let viewerMissing = false;

const fakeDb = {
  user: table(() => [other]),
  // findUnique = « mon » profil ; findMany = les autres.
  profile: {
    ...table(() => [other.profile]),
    findUnique: vi.fn(async (args?: Args) => (viewerMissing ? null : shape(me.profile, args))),
  },
  block: table(() => []),
  like: table(() => []),
  match: table(() => [match]),
  encounter: table(() => [encounter]),
  photoModeration: table(() => []),
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

/** Intention de la lectrice (« moi ») pour le test en cours. */
function viewerIntention(list: string[]) {
  (me.profile as Record<string, unknown>).relationshipType = list;
}

beforeEach(() => {
  viewerIntention([]);
  viewerMissing = false;
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
});

async function json(res: Response): Promise<{ text: string; body: unknown }> {
  expect(res.status).toBe(200);
  const text = await res.text();
  return { text, body: JSON.parse(text) };
}

const ROUTES: Array<[string, () => Promise<Response>]> = [
  ['GET /api/users/[id]', async () => {
    const { GET } = await import('@/app/api/users/[id]/route');
    return GET(new Request(`http://localhost/api/users/${OTHER_ID}`), { params: Promise.resolve({ id: OTHER_ID }) });
  }],
  ['GET /api/geoloc/nearby', async () => {
    const { GET } = await import('@/app/api/geoloc/nearby/route');
    return GET();
  }],
  ['GET /api/geoloc/crossings', async () => {
    const { GET } = await import('@/app/api/geoloc/crossings/route');
    return GET();
  }],
];

describe("l'intention d'autrui est voilée pour une lectrice non déclarée (spec 008)", () => {
  for (const [name, call] of ROUTES) {
    it(`${name} — lectrice sans intention : voilée, avec marqueur`, async () => {
      const { text } = await json(await call());
      expect(text).toContain('Camille');
      expect(text).not.toContain(SENTINEL);
      expect(text).toContain('"relationshipTypeVeiled":true');
    });

    it(`${name} — lectrice déclarée : visible`, async () => {
      viewerIntention(['sérieux']);
      const { text } = await json(await call());
      expect(text).toContain(SENTINEL);
      expect(text).not.toContain('relationshipTypeVeiled');
    });

    it(`${name} — « je verrai en chemin » lève le voile`, async () => {
      viewerIntention(['je verrai en chemin']);
      const { text } = await json(await call());
      expect(text).toContain(SENTINEL);
    });

    it(`${name} — profil lectrice introuvable : voilée (fermé par défaut)`, async () => {
      viewerMissing = true;
      const res = await call();
      // « À proximité » répond déjà sans résultat quand la lectrice n'a pas de
      // profil : rien ne peut fuiter, c'est tout ce qu'on exige.
      const text = await res.text();
      expect(text).not.toContain(SENTINEL);
    });
  }

  it('GET /api/users/[id] — sa propre fiche n\'est jamais voilée', async () => {
    const { GET } = await import('@/app/api/users/[id]/route');
    const self = { ...other, id: ME_ID };
    fakeDb.user.findUnique.mockResolvedValueOnce(shape(self, undefined) as never);
    mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
    const { text } = await json(
      await GET(new Request(`http://localhost/api/users/${ME_ID}`), { params: Promise.resolve({ id: ME_ID }) }),
    );
    expect(text).toContain(SENTINEL);
    expect(text).not.toContain('relationshipTypeVeiled');
  });
});

describe('le filtre par intention ne sert pas à deviner (spec 008, research R3)', () => {
  const whereOf = () => {
    const calls = fakeDb.profile.findMany.mock.calls as unknown as Array<[{ where?: unknown }]>;
    return JSON.stringify(calls.at(-1)?.[0]?.where ?? {});
  };

  it('ignoré pour une lectrice sans intention', async () => {
    const { GET } = await import('@/app/api/discover/route');
    await json(await GET(new NextRequest('http://localhost/api/discover?relationshipType=libre')));
    expect(whereOf()).not.toContain('relationshipType');
  });

  it('appliqué pour une lectrice déclarée', async () => {
    viewerIntention(['libre']);
    const { GET } = await import('@/app/api/discover/route');
    await json(await GET(new NextRequest('http://localhost/api/discover?relationshipType=libre')));
    expect(whereOf()).toContain('relationshipType');
  });
});
