/**
 * Tests — classement et déclassement d'une photo par la modération (#330).
 *
 * Le point non évident tient dans l'ordre des écritures : le dérivé flouté doit
 * exister **avant** que la classification soit enregistrée. L'inverse
 * produirait une ligne qui annonce « sensible » pendant que le proxy sert
 * toujours l'original — une garantie affichée sans rien derrière, exactement ce
 * que #328 a coûté.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

const mockRequireAdmin = vi.fn();
vi.mock('@/lib/admin', () => ({
  __esModule: true,
  requireAdmin: mockRequireAdmin,
  isAdminSession: (r: unknown) => !!r && typeof r === 'object' && 'userId' in (r as object),
}));

const mockGenerateBlurred = vi.fn();
const mockDeletePhoto = vi.fn();
vi.mock('@/lib/r2', () => ({
  __esModule: true,
  generateBlurredDerivative: mockGenerateBlurred,
  deletePhoto: mockDeletePhoto,
}));

const fakeDb = {
  profile: { findUnique: vi.fn() },
  photoModeration: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  moderationLog: { create: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { POST, DELETE } = await import('../route');

const ADMIN_ID = randomUUID();
const BOB_ID = randomUUID();
const BOB_PHOTO = `${BOB_ID}/${randomUUID()}.jpg`;
const BOB_BLUR = `${BOB_ID}/x.blur.jpg`;

function call(
  handler: typeof POST,
  body: unknown,
  method: 'POST' | 'DELETE' = 'POST',
) {
  const req = new NextRequest(`http://localhost/api/admin/users/${BOB_ID}/photos/sensitivity`, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  return handler(req, { params: Promise.resolve({ id: BOB_ID }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ userId: ADMIN_ID });
  fakeDb.profile.findUnique.mockResolvedValue({ photos: [BOB_PHOTO] });
  fakeDb.photoModeration.upsert.mockResolvedValue({});
  fakeDb.moderationLog.create.mockResolvedValue({});
  mockGenerateBlurred.mockResolvedValue(BOB_BLUR);
});

describe('POST — classer une photo', () => {
  it('génère le flou, enregistre la classification et journalise', async () => {
    const res = await call(POST, {
      photoKey: BOB_PHOTO,
      sensitivity: 'suggestive',
      reason: 'sous-vêtements sur l\'avatar',
    });

    expect(res.status).toBe(200);
    expect(mockGenerateBlurred).toHaveBeenCalledWith(BOB_PHOTO);
    expect(fakeDb.photoModeration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          key: BOB_PHOTO,
          sensitivity: 'suggestive',
          blurredKey: BOB_BLUR,
          classifiedBy: ADMIN_ID,
        }),
      }),
    );
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'CLASSIFY_PHOTO', targetUserId: BOB_ID }),
      }),
    );
  });

  it('ne classe PAS si le flou n\'a pas pu être généré', async () => {
    mockGenerateBlurred.mockRejectedValue(new Error('R2 down'));

    const res = await call(POST, {
      photoKey: BOB_PHOTO,
      sensitivity: 'explicit',
      reason: 'un motif valable',
    });

    expect(res.status).toBe(502);
    // Le cœur du test : aucune ligne écrite, donc aucune promesse invérifiable.
    expect(fakeDb.photoModeration.upsert).not.toHaveBeenCalled();
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });

  it('exige un motif', async () => {
    const res = await call(POST, { photoKey: BOB_PHOTO, sensitivity: 'explicit' });
    expect(res.status).toBe(400);
    expect(mockGenerateBlurred).not.toHaveBeenCalled();
  });

  it('refuse un niveau hors taxonomie', async () => {
    const res = await call(POST, {
      photoKey: BOB_PHOTO,
      sensitivity: 'nimportequoi',
      reason: 'un motif valable',
    });
    expect(res.status).toBe(400);
  });

  it('refuse une clé qui n\'appartient pas au profil visé', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({ photos: [] });

    const res = await call(POST, {
      photoKey: BOB_PHOTO,
      sensitivity: 'explicit',
      reason: 'un motif valable',
    });

    expect(res.status).toBe(404);
    expect(mockGenerateBlurred).not.toHaveBeenCalled();
  });

  it('refuse un non-admin', async () => {
    mockRequireAdmin.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 403 }),
    );

    const res = await call(POST, {
      photoKey: BOB_PHOTO,
      sensitivity: 'explicit',
      reason: 'un motif valable',
    });

    expect(res.status).toBe(403);
    expect(fakeDb.photoModeration.upsert).not.toHaveBeenCalled();
  });
});

describe('DELETE — déclasser une photo', () => {
  beforeEach(() => {
    fakeDb.photoModeration.findUnique.mockResolvedValue({
      key: BOB_PHOTO,
      ownerId: BOB_ID,
      blurredKey: BOB_BLUR,
    });
    fakeDb.photoModeration.delete.mockResolvedValue({});
    mockDeletePhoto.mockResolvedValue(undefined);
  });

  it('lève la classification, journalise et nettoie le dérivé', async () => {
    const res = await call(DELETE, { photoKey: BOB_PHOTO, reason: 'classée par erreur' }, 'DELETE');

    expect(res.status).toBe(200);
    expect(fakeDb.photoModeration.delete).toHaveBeenCalledWith({ where: { key: BOB_PHOTO } });
    expect(mockDeletePhoto).toHaveBeenCalledWith(BOB_BLUR);
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'DECLASSIFY_PHOTO' }) }),
    );
  });

  it('déclasse quand même si le dérivé ne peut pas être supprimé', async () => {
    // Best-effort dans ce sens-ci : un objet orphelin ne blesse personne, et
    // rouvrir l'accès ne doit pas dépendre de la disponibilité de R2.
    mockDeletePhoto.mockRejectedValue(new Error('R2 down'));

    const res = await call(DELETE, { photoKey: BOB_PHOTO, reason: 'classée par erreur' }, 'DELETE');

    expect(res.status).toBe(200);
    expect(fakeDb.photoModeration.delete).toHaveBeenCalled();
  });

  it('refuse de déclasser la photo d\'un autre profil', async () => {
    fakeDb.photoModeration.findUnique.mockResolvedValue({
      key: BOB_PHOTO,
      ownerId: randomUUID(),
      blurredKey: BOB_BLUR,
    });

    const res = await call(DELETE, { photoKey: BOB_PHOTO, reason: 'un motif valable' }, 'DELETE');

    expect(res.status).toBe(404);
    expect(fakeDb.photoModeration.delete).not.toHaveBeenCalled();
  });
});
