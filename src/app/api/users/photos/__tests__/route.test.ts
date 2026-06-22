/**
 * Tests d'intégration — DELETE /api/users/photos
 *
 * Vérifie que la suppression d'une photo supprime aussi l'objet R2
 * (cf. issue #142 — avant, seul le tableau profile.photos était mis à jour,
 * l'objet R2 restait accessible et s'accumulait comme stockage orphelin).
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

const mockUploadPhoto = vi.fn();
const mockDeletePhoto = vi.fn();
const mockIsR2Configured = vi.fn();
vi.mock('@/lib/r2', () => ({
  __esModule: true,
  uploadPhoto: mockUploadPhoto,
  deletePhoto: mockDeletePhoto,
  isR2Configured: mockIsR2Configured,
}));

const fakeDb = {
  profile: {
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 }),
  limits: { api: { limit: 60, windowMs: 60_000 } },
}));

// Imports après les mocks
const { DELETE } = await import('../route');

const ALICE_ID = randomUUID();
const PHOTO_KEY = `${ALICE_ID}/${randomUUID()}.jpg`;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
  mockIsR2Configured.mockReturnValue(true);
});

describe('DELETE /api/users/photos', () => {
  it('supprime la photo de la DB ET de R2', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      userId: ALICE_ID,
      photos: [PHOTO_KEY, 'other-key.jpg'],
    });
    fakeDb.profile.update.mockResolvedValue({
      userId: ALICE_ID,
      photos: ['other-key.jpg'],
    });
    mockDeletePhoto.mockResolvedValue(undefined);

    const request = new Request('http://localhost/api/users/photos', {
      method: 'DELETE',
      body: JSON.stringify({ photoKey: PHOTO_KEY }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await DELETE(request);

    expect(res.status).toBe(200);
    // DB updated to remove the key
    expect(fakeDb.profile.update).toHaveBeenCalledWith({
      where: { userId: ALICE_ID },
      data: { photos: ['other-key.jpg'] },
    });
    // R2 object deleted too (the fix for #142)
    expect(mockDeletePhoto).toHaveBeenCalledWith(PHOTO_KEY);
  });

  it('renvoie 404 si le profil n\'existe pas', async () => {
    fakeDb.profile.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/users/photos', {
      method: 'DELETE',
      body: JSON.stringify({ photoKey: PHOTO_KEY }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await DELETE(request);

    expect(res.status).toBe(404);
    expect(mockDeletePhoto).not.toHaveBeenCalled();
  });

  it('renvoie 401 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request('http://localhost/api/users/photos', {
      method: 'DELETE',
      body: JSON.stringify({ photoKey: PHOTO_KEY }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await DELETE(request);

    expect(res.status).toBe(401);
    expect(mockDeletePhoto).not.toHaveBeenCalled();
  });

  it('reste 200 même si R2 delete échoue (résilient, cf. #142)', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      userId: ALICE_ID,
      photos: [PHOTO_KEY],
    });
    fakeDb.profile.update.mockResolvedValue({
      userId: ALICE_ID,
      photos: [],
    });
    // R2 down — doit pas bloquer la suppression DB
    mockDeletePhoto.mockRejectedValue(new Error('R2 network error'));

    const request = new Request('http://localhost/api/users/photos', {
      method: 'DELETE',
      body: JSON.stringify({ photoKey: PHOTO_KEY }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await DELETE(request);

    expect(res.status).toBe(200);
    expect(mockDeletePhoto).toHaveBeenCalledWith(PHOTO_KEY);
  });
});