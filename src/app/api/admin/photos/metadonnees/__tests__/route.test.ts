/**
 * /api/admin/photos/metadonnees (#441) — rattrapage des photos déjà stockées.
 *
 * Les photos téléversées avant #441 gardent leurs métadonnées (position GPS
 * possible). Le rattrapage avance par lots de profils, curseur en main, pour
 * tenir dans la durée d'une fonction serverless ; une photo en échec est
 * comptée et n'arrête pas le lot.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  profile: { findMany: vi.fn() },
  moderationLog: { create: vi.fn(async () => ({})) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const mockNettoyer = vi.fn();
vi.mock('@/lib/r2', () => ({ __esModule: true, nettoyerPhotoExistante: mockNettoyer }));

const { POST, TAILLE_LOT } = await import('../route');
const ADMIN = randomUUID();

const req = (body?: unknown) =>
  new Request('http://x/api/admin/photos/metadonnees', { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ADMIN, email: 'a@x.fr' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
});

describe('POST /api/admin/photos/metadonnees', () => {
  it('nettoie chaque photo du lot, compte, et rend le curseur suivant', async () => {
    const profils = Array.from({ length: TAILLE_LOT }, (_, i) => ({ userId: `u${i}`, photos: [`u${i}/a.jpg`] }));
    profils[0].photos.push('u0/b.png');
    fakeDb.profile.findMany.mockResolvedValue(profils);
    mockNettoyer.mockImplementation(async (k: string) => (k === 'u0/b.png' ? 'propre' : k === 'u1/a.jpg' ? Promise.reject(new Error('boom')) : 'nettoyee'));

    const data = await (await POST(req())).json();

    expect(fakeDb.profile.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: TAILLE_LOT, orderBy: { userId: 'asc' } }));
    expect(data).toEqual({
      profils: TAILLE_LOT,
      nettoyees: TAILLE_LOT - 1,
      propres: 1,
      erreurs: 1,
      curseur: `u${TAILLE_LOT - 1}`,
    });
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'STRIP_PHOTO_METADATA', adminId: ADMIN, targetUserId: ADMIN }),
    });
  });

  it('reprend après le curseur donné, et rend null au dernier lot', async () => {
    fakeDb.profile.findMany.mockResolvedValue([{ userId: 'u9', photos: ['u9/a.jpg'] }]);
    mockNettoyer.mockResolvedValue('propre');

    const data = await (await POST(req({ curseur: 'u8' }))).json();

    const arg = fakeDb.profile.findMany.mock.calls[0][0];
    expect(arg.cursor).toEqual({ userId: 'u8' });
    expect(arg.skip).toBe(1);
    expect(data.curseur).toBeNull();
  });

  it('ne journalise rien d’un lot où rien n’a changé', async () => {
    fakeDb.profile.findMany.mockResolvedValue([]);
    const data = await (await POST(req())).json();
    expect(data).toEqual({ profils: 0, nettoyees: 0, propres: 0, erreurs: 0, curseur: null });
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });

  it('refuse un non-admin (404 : la route n’existe pas pour lui)', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect((await POST(req())).status).toBe(404);
    expect(mockNettoyer).not.toHaveBeenCalled();
  });
});
