/**
 * Tests d'intégration — DELETE /api/users/me (suppression de compte)
 *
 * La route exige la confirmation du mot de passe. Le formulaire des paramètres
 * appelait `fetch(..., { method: 'DELETE' })` **sans corps** : la validation
 * échouait en 400 et la suppression ne marchait jamais, derrière un message
 * générique. Ces tests figent les quatre cas qui comptent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const mockCompare = vi.fn();
vi.mock('bcryptjs', () => ({
  __esModule: true,
  default: { compare: (...args: unknown[]) => mockCompare(...args) },
}));

const mockDeletePhoto = vi.fn();
const mockIsR2Configured = vi.fn();
vi.mock('@/lib/r2', () => ({
  __esModule: true,
  deletePhoto: mockDeletePhoto,
  isR2Configured: mockIsR2Configured,
}));

const fakeDb = {
  user: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

const { DELETE, GET } = await import('../route');

const ALICE_ID = randomUUID();
const PHOTO_KEY = `${ALICE_ID}/${randomUUID()}.jpg`;

function deleteRequest(body?: unknown) {
  return new Request('http://localhost/api/users/me', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
  mockIsR2Configured.mockReturnValue(true);
  fakeDb.user.delete.mockResolvedValue({ id: ALICE_ID });
});

describe('DELETE /api/users/me', () => {
  it('supprime le compte quand le mot de passe est le bon', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      passwordHash: 'hash',
      profile: { photos: [] },
    });
    mockCompare.mockResolvedValue(true);

    const res = await DELETE(deleteRequest({ confirmPassword: 'Motdepasse1' }));

    expect(res.status).toBe(204);
    expect(fakeDb.user.delete).toHaveBeenCalledWith({ where: { id: ALICE_ID } });
  });

  it('refuse en 403 sur un mot de passe faux, sans rien supprimer', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      passwordHash: 'hash',
      profile: { photos: [] },
    });
    mockCompare.mockResolvedValue(false);

    const res = await DELETE(deleteRequest({ confirmPassword: 'mauvais' }));

    expect(res.status).toBe(403);
    expect(fakeDb.user.delete).not.toHaveBeenCalled();
  });

  it('refuse en 400 quand le mot de passe manque', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      passwordHash: 'hash',
      profile: { photos: [] },
    });

    const res = await DELETE(deleteRequest());

    expect(res.status).toBe(400);
    expect(fakeDb.user.delete).not.toHaveBeenCalled();
  });

  it('supprime un compte OAuth sans mot de passe à confirmer', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      passwordHash: null,
      profile: { photos: [] },
    });

    const res = await DELETE(deleteRequest({}));

    expect(res.status).toBe(204);
    expect(mockCompare).not.toHaveBeenCalled();
    expect(fakeDb.user.delete).toHaveBeenCalled();
  });

  it('efface aussi les photos R2, hors cascade SQL', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      passwordHash: 'hash',
      profile: { photos: [PHOTO_KEY] },
    });
    mockCompare.mockResolvedValue(true);
    mockDeletePhoto.mockResolvedValue(undefined);

    const res = await DELETE(deleteRequest({ confirmPassword: 'Motdepasse1' }));

    expect(res.status).toBe(204);
    expect(mockDeletePhoto).toHaveBeenCalledWith(PHOTO_KEY);
  });

  it('supprime quand même le compte si R2 est en panne', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      passwordHash: 'hash',
      profile: { photos: [PHOTO_KEY] },
    });
    mockCompare.mockResolvedValue(true);
    mockDeletePhoto.mockRejectedValue(new Error('R2 down'));

    const res = await DELETE(deleteRequest({ confirmPassword: 'Motdepasse1' }));

    expect(res.status).toBe(204);
    expect(fakeDb.user.delete).toHaveBeenCalled();
  });

  it('refuse un appel non authentifié', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await DELETE(deleteRequest({ confirmPassword: 'x' }));

    expect(res.status).toBe(401);
    expect(fakeDb.user.delete).not.toHaveBeenCalled();
  });
});

describe('GET /api/users/me', () => {
  it('dit si le compte a un mot de passe, sans jamais renvoyer le hash', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      email: 'alice@example.com',
      displayName: 'Alice',
      passwordHash: 'hash',
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.hasPassword).toBe(true);
    expect(body.passwordHash).toBeUndefined();
  });

  it('renvoie hasPassword=false pour un compte OAuth', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      email: 'bob@example.com',
      displayName: 'Bob',
      passwordHash: null,
    });

    const body = await (await GET()).json();

    expect(body.hasPassword).toBe(false);
  });
});
