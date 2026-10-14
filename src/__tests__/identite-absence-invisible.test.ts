/**
 * Garde — l'absence de genre/orientation reste invisible au JSON public (#517).
 *
 * Une clé omise dit « rien à lire » ; une chaîne vide dirait « demandé et
 * refusé ». Même patron que le voile d'intention (spec 008) : la fiche
 * publique (`/api/users/[id]`) et le feed (`/api/discover`) omettent les
 * champs vides d'autrui ; pour la propriétaire, `/api/users/profile` les
 * porte tels quels.
 *
 * Routes sérialisant l'identité d'autrui : ajoutez-y toute sérialisation de
 * `genderIdentity`/`orientation` vue par un autre membre.
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
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { discover: { limit: 60, windowMs: 60_000 }, geoloc: { limit: 60, windowMs: 60_000 } },
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

const ME_ID = randomUUID();
const OTHER_ID = randomUUID();

/** Le profil d'« autre » : par défaut silencieux (les deux champs vides). */
function profilSilencieux(userId: string) {
  return {
    userId,
    bio: 'Salut',
    birthDate: new Date('1994-01-01'),
    genderIdentity: '',
    orientation: [],
    relationshipType: ['libre'],
    interests: [],
    practices: [],
    practicesVisibility: 'matches',
    photos: [],
    invisibleMode: false,
    photoSensitivityOptIn: 'none',
    searchGenders: [],
    searchOrientations: [],
    searchInterests: [],
    searchRelationshipTypes: [],
    searchDistanceKm: null,
    lastKnownLat: 48.86,
    lastKnownLng: 2.35,
    lastGeolocAt: new Date(),
    positionSource: null,
    cityLabel: null,
    onboardingStep: 3,
  };
}

beforeEach(() => {
  mockGetServerSession.mockReset();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true });
});

// Le module testé est importé par un `doMock` frais à chaque cas : sans
// `resetModules`, le mock du cas précédent persiste dans le cache.
beforeEach(() => vi.resetModules());

// --- /api/users/[id] : la fiche publique — l'omission de clé ---------------

describe('GET /api/users/[id] — absence invisible (#517)', () => {
  it('un profil silencieux ne porte ni la clé genderIdentity ni orientation', async () => {
    const other = profilSilencieux(OTHER_ID);
    vi.doMock('@/lib/db', () => ({
      getDb: () => ({
        user: {
          findUnique: vi.fn(async () => ({
            id: OTHER_ID, isVerified: true, lastActive: new Date(), isBanned: false, ...other,
            userKey: null, userKeyHistory: [],
          })),
        },
        profile: { findUnique: vi.fn(async () => null) },
      }),
    }));
    const { GET } = await import('../app/api/users/[id]/route');
    const res = await GET(new NextRequest(`http://localhost/api/users/${OTHER_ID}`), { params: Promise.resolve({ id: OTHER_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty('genderIdentity');
    expect(body).not.toHaveProperty('orientation');
    expect('genderIdentity' in (body.profile ?? body)).toBe(false);
  });
});

// --- /api/discover : le feed — même omission --------------------------------

describe('GET /api/discover — absence invisible au feed (#517)', () => {
  it('un profil silencieux du feed ne porte ni la clé', async () => {
    const other = profilSilencieux(OTHER_ID);
    vi.doMock('@/lib/db', () => ({
      getDb: () => ({
        profile: {
          findUnique: vi.fn(async () => null),
          findMany: vi.fn(async () => [{ ...other, user: { id: OTHER_ID, displayName: 'Camille', isVerified: false, lastActive: new Date() } }]),
        },
        block: { findMany: vi.fn(async () => []) },
        like: { findMany: vi.fn(async () => []) },
        match: { findMany: vi.fn(async () => []) },
      }),
    }));
    const { GET } = await import('../app/api/discover/route');
    const res = await GET(new NextRequest('http://localhost/api/discover?tab=all'));
    expect(res.status).toBe(200);
    const body = await res.json();
    const profil = body.users[0];
    expect(profil).not.toHaveProperty('genderIdentity');
    expect(profil).not.toHaveProperty('orientation');
  });

  it('un profil déclaré porte ses valeurs — la promesse d\'affichage reste', async () => {
    const other = { ...profilSilencieux(OTHER_ID), genderIdentity: 'femme', orientation: ['hétéro'] };
    vi.doMock('@/lib/db', () => ({
      getDb: () => ({
        profile: {
          findUnique: vi.fn(async () => null),
          findMany: vi.fn(async () => [{ ...other, user: { id: OTHER_ID, displayName: 'Camille', isVerified: false, lastActive: new Date() } }]),
        },
        block: { findMany: vi.fn(async () => []) },
        like: { findMany: vi.fn(async () => []) },
        match: { findMany: vi.fn(async () => []) },
      }),
    }));
    const { GET } = await import('../app/api/discover/route');
    const res = await GET(new NextRequest('http://localhost/api/discover?tab=all'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users[0]).toMatchObject({ genderIdentity: 'femme', orientation: ['hétéro'] });
  });
});