/**
 * Tests — service d'une photo classée sensible (#330).
 *
 * Ce qui est vérifié ici n'est pas un rendu mais un **octet** : quelle clé R2
 * part réellement dans l'URL signée. Un test qui se contenterait de constater
 * un 307 ne verrait pas la différence entre l'original et le flou, et c'est
 * précisément là que se joue la garantie.
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

const mockGetPhotoSignedUrl = vi.fn();
const mockIsR2Configured = vi.fn();
vi.mock('@/lib/r2', () => ({
  __esModule: true,
  getPhotoSignedUrl: mockGetPhotoSignedUrl,
  isR2Configured: mockIsR2Configured,
}));

const fakeDb = {
  match: { findFirst: vi.fn() },
  profile: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  photoModeration: { findUnique: vi.fn() },
  moderationLog: { create: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { api: { limit: 60, windowMs: 60_000 } },
  rateLimitHeaders: () => ({}),
}));

const { GET } = await import('../route');

const ALICE_ID = randomUUID(); // le lecteur
const BOB_ID = randomUUID(); // le propriétaire
const BOB_AVATAR = `${BOB_ID}/${randomUUID()}.jpg`;
const BOB_BLUR = `${BOB_ID}/flou.blur.jpg`;

/** Clé réellement demandée à R2 — c'est elle qui prouve ce qui a été servi. */
function servedKey(): string {
  return mockGetPhotoSignedUrl.mock.calls[0][0];
}

function call(key: string, query = '') {
  const url = `http://localhost/api/photos/${encodeURIComponent(key)}${query}`;
  return GET(new NextRequest(url), { params: Promise.resolve({ key: encodeURIComponent(key) }) });
}

/** Seuil du lecteur ; `profile.findUnique` sert aussi à lire les photos du
 *  propriétaire, d'où l'aiguillage sur l'identifiant demandé. */
function withViewerThreshold(threshold: string) {
  fakeDb.profile.findUnique.mockImplementation(({ where }: { where: { userId: string } }) =>
    Promise.resolve(
      where.userId === BOB_ID
        ? { photos: [BOB_AVATAR] }
        : { photoSensitivityOptIn: threshold },
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
  mockIsR2Configured.mockReturnValue(true);
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  mockGetPhotoSignedUrl.mockResolvedValue('https://r2.example.com/signed');
  fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
  fakeDb.moderationLog.create.mockResolvedValue({});
  fakeDb.photoModeration.findUnique.mockResolvedValue({
    sensitivity: 'explicit',
    blurredKey: BOB_BLUR,
  });
  withViewerThreshold('none');
});

describe('GET /api/photos/[key] — photo classée (#330)', () => {
  it('sert le dérivé flouté, pas l\'original, à un lecteur qui n\'a rien demandé', async () => {
    const res = await call(BOB_AVATAR);

    expect(res.status).toBe(307);
    expect(servedKey()).toBe(BOB_BLUR);
    expect(servedKey()).not.toBe(BOB_AVATAR);
  });

  it('sert l\'original sur ?reveal=1 — le clic « Voir » est le consentement', async () => {
    await call(BOB_AVATAR, '?reveal=1');
    expect(servedKey()).toBe(BOB_AVATAR);
  });

  it('sert l\'original au lecteur dont le seuil couvre le niveau', async () => {
    withViewerThreshold('explicit');
    await call(BOB_AVATAR);
    expect(servedKey()).toBe(BOB_AVATAR);
  });

  it('floute encore une photo explicite pour un seuil « suggestive »', async () => {
    withViewerThreshold('suggestive');
    await call(BOB_AVATAR);
    expect(servedKey()).toBe(BOB_BLUR);
  });

  it('sert l\'original d\'une photo suggestive à un seuil « suggestive »', async () => {
    fakeDb.photoModeration.findUnique.mockResolvedValue({
      sensitivity: 'suggestive',
      blurredKey: BOB_BLUR,
    });
    withViewerThreshold('suggestive');
    await call(BOB_AVATAR);
    expect(servedKey()).toBe(BOB_AVATAR);
  });

  it('sert l\'original au propriétaire, quel que soit son propre seuil', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: BOB_ID } });
    await call(BOB_AVATAR);
    expect(servedKey()).toBe(BOB_AVATAR);
  });

  it('sert l\'original à un admin : il ne peut pas modérer ce qu\'il ne voit pas', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    await call(BOB_AVATAR);
    expect(servedKey()).toBe(BOB_AVATAR);
  });

  it('ferme sur un niveau inconnu en base', async () => {
    fakeDb.photoModeration.findUnique.mockResolvedValue({
      sensitivity: 'nimportequoi',
      blurredKey: BOB_BLUR,
    });
    withViewerThreshold('suggestive');
    await call(BOB_AVATAR);
    expect(servedKey()).toBe(BOB_BLUR);
  });

  it('ne consulte pas le seuil quand la photo n\'est pas classée', async () => {
    fakeDb.photoModeration.findUnique.mockResolvedValue(null);
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_AVATAR] });

    await call(BOB_AVATAR);

    expect(servedKey()).toBe(BOB_AVATAR);
    // Un seul appel : celui qui lit les photos du propriétaire.
    expect(fakeDb.profile.findUnique).toHaveBeenCalledTimes(1);
  });
});
