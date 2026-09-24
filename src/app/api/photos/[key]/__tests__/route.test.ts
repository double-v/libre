/**
 * Tests d'intégration — GET /api/photos/[key]
 *
 * Vérifie le contrôle d'accès (issue #143) :
 * - 401 sans session
 * - avatar (photos[0]) public : 307 même sans match
 * - 403 sur une photo NON-avatar de user B sans match
 * - 200 + redirect si user A accède à sa propre photo
 * - 200 + redirect si user A accède à une photo non-avatar de user B (match)
 * - 404 si la clé n'existe pas dans le profil
 * - Rate limit : 429 si trop de requêtes
 * - Headers de sécurité présents sur la redirect response
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

// === Mocks ===

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const mockGetPhotoSignedUrl = vi.fn();
const mockIsR2Configured = vi.fn();
vi.mock('@/lib/r2', () => ({
  __esModule: true,
  getPhotoSignedUrl: mockGetPhotoSignedUrl,
  isR2Configured: mockIsR2Configured,
}));

const fakeDb = {
  match: {
    findFirst: vi.fn(),
  },
  profile: {
    findUnique: vi.fn(),
  },
  // verifyAdmin() relit le rôle en base — dérogation ADMIN (#323).
  user: {
    findUnique: vi.fn(),
  },
  // Sensibilité des photos (#330) : le proxy consulte la table de
  // classification. Pas de ligne = photo ordinaire = comportement d'origine.
  photoModeration: {
    findUnique: vi.fn(),
  },
  moderationLog: {
    create: vi.fn(),
  },
  // Selfies de vérification (#436) : servis hors `profile.photos`.
  verificationRequest: {
    findFirst: vi.fn(),
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
  limits: { api: { limit: 60, windowMs: 60_000 } },
  rateLimitHeaders: (result: { remaining: number; resetAt: number }, limit: number) => ({
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }),
}));

// Imports après les mocks
const { GET } = await import('../route');

const ALICE_ID = randomUUID();
const BOB_ID = randomUUID();
const ALICE_PHOTO = `${ALICE_ID}/${randomUUID()}.jpg`;
const BOB_AVATAR = `${BOB_ID}/${randomUUID()}.jpg`; // photos[0] = avatar public
const BOB_PHOTO = `${BOB_ID}/${randomUUID()}.jpg`; // photo secondaire = match-gated

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
  mockIsR2Configured.mockReturnValue(true);
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  mockGetPhotoSignedUrl.mockResolvedValue('https://r2.example.com/signed-url');
  fakeDb.photoModeration.findUnique.mockResolvedValue(null);
  // Par défaut : viewer non-admin (le rôle relu en base fait foi).
  fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
  fakeDb.moderationLog.create.mockResolvedValue({});
});

// NextRequest requires a `headers` property + dynamic route params
function makeNextRequest(key: string): [Request, { params: Promise<{ key: string }> }] {
  return [
    new NextRequest(`http://localhost/api/photos/${encodeURIComponent(key)}`),
    { params: Promise.resolve({ key: encodeURIComponent(key) }) },
  ];
}

import { NextRequest } from 'next/server';

describe('GET /api/photos/[key] — contrôle d\'accès (issue #143)', () => {
  it('renvoie 401 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const [req, ctx] = makeNextRequest(ALICE_PHOTO);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(401);
  });

  it('avatar public : 307 quand user A accède à l\'avatar (photos[0]) de user B sans match', async () => {
    fakeDb.match.findFirst.mockResolvedValue(null); // pas de match
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_AVATAR, BOB_PHOTO] });

    const [req, ctx] = makeNextRequest(BOB_AVATAR);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('https://r2.example.com/signed-url');
  });

  it('renvoie 403 si user A accède à une photo NON-avatar de user B sans match', async () => {
    fakeDb.match.findFirst.mockResolvedValue(null); // pas de match
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_AVATAR, BOB_PHOTO] });

    const [req, ctx] = makeNextRequest(BOB_PHOTO); // index 1 = non-avatar
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(403);
    // Non-régression : aucune trace de modération pour un simple 403.
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });

  it('renvoie 200 (redirect) si user A accède à sa propre photo', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [ALICE_PHOTO] });

    const [req, ctx] = makeNextRequest(ALICE_PHOTO);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('https://r2.example.com/signed-url');
  });

  it('renvoie 200 (redirect) si user A accède à une photo non-avatar de user B (ils sont match)', async () => {
    fakeDb.match.findFirst.mockResolvedValue({ userA: ALICE_ID, userB: BOB_ID });
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_AVATAR, BOB_PHOTO] });

    const [req, ctx] = makeNextRequest(BOB_PHOTO);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('https://r2.example.com/signed-url');
  });

  it('renvoie 404 si la clé n\'existe pas dans le profil owner', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({ photos: ['some-other-key.jpg'] });

    const [req, ctx] = makeNextRequest(ALICE_PHOTO);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(404);
  });

  it('renvoie 429 si rate limit dépassé', async () => {
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 60_000 });

    const [req, ctx] = makeNextRequest(ALICE_PHOTO);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
  });

  it('inclut les headers de sécurité sur la redirect', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [ALICE_PHOTO] });

    const [req, ctx] = makeNextRequest(ALICE_PHOTO);
    const res = await GET(req as NextRequest, ctx);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});

/**
 * Dérogation ADMIN (#323) — sans elle, un admin non matché reçoit 403 sur
 * toute photo autre que l'avatar, et la galerie de modération n'affiche que
 * des vignettes cassées : aucune modération photo n'est alors possible.
 */
describe('GET /api/photos/[key] — dérogation ADMIN (#323)', () => {
  function adminViewer() {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  }

  it('laisse un admin non matché voir une photo privée', async () => {
    adminViewer();
    fakeDb.match.findFirst.mockResolvedValue(null);
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_AVATAR, BOB_PHOTO] });

    const [req, ctx] = makeNextRequest(BOB_PHOTO);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(307);
  });

  it('journalise le franchissement de la garde', async () => {
    adminViewer();
    fakeDb.match.findFirst.mockResolvedValue(null);
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_AVATAR, BOB_PHOTO] });

    const [req, ctx] = makeNextRequest(BOB_PHOTO);
    await GET(req as NextRequest, ctx);

    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: {
        adminId: ALICE_ID,
        targetUserId: BOB_ID,
        action: 'VIEW_PRIVATE_PHOTO',
        reason: BOB_PHOTO,
      },
    });
  });

  it('ne journalise pas l\'avatar : il est public, le tracer noierait le journal', async () => {
    adminViewer();
    fakeDb.match.findFirst.mockResolvedValue(null);
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_AVATAR, BOB_PHOTO] });

    const [req, ctx] = makeNextRequest(BOB_AVATAR);
    const res = await GET(req as NextRequest, ctx);

    expect(res.status).toBe(307);
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });

  it('un échec d\'écriture du journal ne casse pas l\'affichage', async () => {
    adminViewer();
    fakeDb.match.findFirst.mockResolvedValue(null);
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_AVATAR, BOB_PHOTO] });
    fakeDb.moderationLog.create.mockRejectedValue(new Error('DB down'));

    const [req, ctx] = makeNextRequest(BOB_PHOTO);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(307);
  });
});
/**
 * Selfie de vérification (#436) — rangé sous `<userId>/verif/`, hors des
 * photos du profil. Il ne sert qu'à la modération : ni un match, ni l'avatar
 * public, ni personne d'autre que son auteur et un admin ne l'obtient.
 */
describe('GET /api/photos/[key] — selfie de vérification (#436)', () => {
  const SELFIE = `${BOB_ID}/verif/${randomUUID()}.jpg`;
  const demande = () => fakeDb.verificationRequest.findFirst.mockResolvedValue({ id: 'v1' });

  it('son auteur le voit', async () => {
    demande();
    mockGetServerSession.mockResolvedValue({ user: { id: BOB_ID } });
    const [req, ctx] = makeNextRequest(SELFIE);
    const res = await GET(req as NextRequest, ctx);
    expect(res.status).toBe(307);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(fakeDb.verificationRequest.findFirst).toHaveBeenCalledWith({
      where: { userId: BOB_ID, selfieUrl: `/api/photos/${encodeURIComponent(SELFIE)}` },
      select: { id: true },
    });
  });

  it('un admin le voit', async () => {
    demande();
    fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    const [req, ctx] = makeNextRequest(SELFIE);
    expect((await GET(req as NextRequest, ctx)).status).toBe(307);
  });

  it('un autre membre, même matché, ne le voit pas', async () => {
    demande();
    fakeDb.match.findFirst.mockResolvedValue({ id: 'm1' });
    const [req, ctx] = makeNextRequest(SELFIE);
    expect((await GET(req as NextRequest, ctx)).status).toBe(404);
    expect(mockGetPhotoSignedUrl).not.toHaveBeenCalled();
  });

  it('404 si aucune demande ne le référence, même pour son auteur', async () => {
    fakeDb.verificationRequest.findFirst.mockResolvedValue(null);
    mockGetServerSession.mockResolvedValue({ user: { id: BOB_ID } });
    const [req, ctx] = makeNextRequest(SELFIE);
    expect((await GET(req as NextRequest, ctx)).status).toBe(404);
  });

  it('ne consulte jamais les photos du profil pour un selfie', async () => {
    demande();
    mockGetServerSession.mockResolvedValue({ user: { id: BOB_ID } });
    const [req, ctx] = makeNextRequest(SELFIE);
    await GET(req as NextRequest, ctx);
    expect(fakeDb.profile.findUnique).not.toHaveBeenCalled();
  });
});
