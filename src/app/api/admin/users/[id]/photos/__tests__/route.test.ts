/**
 * Issue #323 — retrait d'une photo par la modération.
 *
 * Jusqu'ici, face à un avatar hors charte, les seuls leviers étaient bannir ou
 * supprimer le compte. Ces tests verrouillent la sanction proportionnée :
 * retrait ciblé, motif obligatoire, trace au journal, promotion d'avatar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { findUnique: vi.fn() },
  profile: { findUnique: vi.fn(), update: vi.fn() },
  moderationLog: { create: vi.fn() },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

const deletePhotoMock = vi.fn();
vi.mock('@/lib/r2', () => ({
  __esModule: true,
  deletePhoto: (...args: unknown[]) => deletePhotoMock(...args),
}));

const { DELETE } = await import('@/app/api/admin/users/[id]/photos/route');

function adminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@x.fr', role: 'ADMIN' },
  });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
}

function nonAdminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'user-1', email: 'u@x.fr', role: 'USER' },
  });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
}

function req(body: unknown) {
  return new NextRequest('http://x/api/admin/users/u-1/photos', {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const params = { params: Promise.resolve({ id: 'u-1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  deletePhotoMock.mockResolvedValue(undefined);
});

describe('DELETE /api/admin/users/[id]/photos', () => {
  it('renvoie 404 à un non-admin', async () => {
    nonAdminSession();
    const res = await DELETE(req({ photoKey: 'u-1/a.jpg', reason: 'nudité' }), params);
    expect(res.status).toBe(404);
    expect(fakeDb.profile.update).not.toHaveBeenCalled();
  });

  it('exige un motif — un retrait sans motif est indéfendable', async () => {
    adminSession();
    const res = await DELETE(req({ photoKey: 'u-1/a.jpg' }), params);
    expect(res.status).toBe(400);
    expect(fakeDb.profile.update).not.toHaveBeenCalled();
  });

  it('refuse une clé absente du profil', async () => {
    adminSession();
    fakeDb.profile.findUnique.mockResolvedValue({ photos: ['u-1/a.jpg'] });
    const res = await DELETE(req({ photoKey: 'u-1/autre.jpg', reason: 'hors charte' }), params);
    expect(res.status).toBe(404);
    expect(fakeDb.profile.update).not.toHaveBeenCalled();
  });

  it('retire la photo, trace le motif et supprime l\'objet R2', async () => {
    adminSession();
    fakeDb.profile.findUnique.mockResolvedValue({ photos: ['u-1/a.jpg', 'u-1/b.jpg'] });
    fakeDb.profile.update.mockResolvedValue({ photos: ['u-1/a.jpg'] });

    const res = await DELETE(req({ photoKey: 'u-1/b.jpg', reason: 'hors charte' }), params);

    expect(res.status).toBe(200);
    expect(fakeDb.profile.update).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
      data: { photos: ['u-1/a.jpg'] },
    });
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        targetUserId: 'u-1',
        action: 'REMOVE_PHOTO',
        reason: 'hors charte',
      },
    });
    expect(deletePhotoMock).toHaveBeenCalledWith('u-1/b.jpg');
  });

  it('retirer l\'avatar promeut la photo suivante', async () => {
    adminSession();
    fakeDb.profile.findUnique.mockResolvedValue({
      photos: ['u-1/avatar.jpg', 'u-1/b.jpg', 'u-1/c.jpg'],
    });
    fakeDb.profile.update.mockResolvedValue({ photos: ['u-1/b.jpg', 'u-1/c.jpg'] });

    const res = await DELETE(req({ photoKey: 'u-1/avatar.jpg', reason: 'nudité' }), params);
    const data = await res.json();

    // L'ordre est préservé : b devient le nouvel index 0, donc le nouvel avatar.
    expect(data.photos[0]).toBe('u-1/b.jpg');
  });

  it('un échec R2 n\'annule pas le retrait déjà acté en base', async () => {
    adminSession();
    fakeDb.profile.findUnique.mockResolvedValue({ photos: ['u-1/a.jpg'] });
    fakeDb.profile.update.mockResolvedValue({ photos: [] });
    deletePhotoMock.mockRejectedValue(new Error('R2 down'));

    const res = await DELETE(req({ photoKey: 'u-1/a.jpg', reason: 'hors charte' }), params);

    expect(res.status).toBe(200);
    expect(fakeDb.moderationLog.create).toHaveBeenCalled();
  });
});
