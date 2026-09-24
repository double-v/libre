/**
 * /api/admin/photos/recherche (spec 006 · US1, #442) — recherche d'image
 * inversée en un clic.
 *
 * C'est le geste qui a démasqué le compte banni le 2026-09-24 (photo volée
 * d'une instagrameuse). C'est aussi le seul chemin par lequel une photo sort
 * vers un tiers : il exige un admin, ne vise que l'original d'une photo de
 * profil, et laisse une trace au journal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  profile: { findFirst: vi.fn() },
  moderationLog: { create: vi.fn(async () => ({})) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const mockSigned = vi.fn(async (k: string) => `https://r2.example/${k}?X-Amz-Signature=abc&X-Amz-Expires=900`);
vi.mock('@/lib/r2', () => ({ __esModule: true, getPhotoSignedUrl: mockSigned }));

const { GET } = await import('../route');
const ADMIN = randomUUID();
const MEMBRE = randomUUID();
const CLE = `${MEMBRE}/photo-1.jpg`;

const req = (q: Record<string, string>) =>
  new Request(`http://x/api/admin/photos/recherche?${new URLSearchParams(q)}`);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ADMIN, email: 'a@x.fr' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  fakeDb.profile.findFirst.mockResolvedValue({ userId: MEMBRE });
});

describe('GET /api/admin/photos/recherche', () => {
  const signee = encodeURIComponent(`https://r2.example/${CLE}?X-Amz-Signature=abc&X-Amz-Expires=900`);

  it.each([
    ['lens', `https://lens.google.com/uploadbyurl?url=${signee}`],
    ['yandex', `https://yandex.com/images/search?rpt=imageview&url=${signee}`],
    ['tineye', `https://tineye.com/search?url=${signee}`],
  ])('%s : 302 vers le moteur avec l’URL signée de l’original, encodée', async (moteur, attendu) => {
    const res = await GET(req({ cle: CLE, moteur }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(attendu);
    expect(mockSigned).toHaveBeenCalledWith(CLE);
  });

  it('journalise SEARCH_PHOTO avec le membre propriétaire et moteur:clé', async () => {
    await GET(req({ cle: CLE, moteur: 'tineye' }));
    expect(fakeDb.profile.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { photos: { has: CLE } } }));
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: { adminId: ADMIN, targetUserId: MEMBRE, action: 'SEARCH_PHOTO', reason: `tineye:${CLE}` },
    });
  });

  it('400 sur un moteur inconnu, sans rien signer ni journaliser', async () => {
    const res = await GET(req({ cle: CLE, moteur: 'bing' }));
    expect(res.status).toBe(400);
    expect(mockSigned).not.toHaveBeenCalled();
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });

  it('404 sur une clé absente des photos de profil : ni selfie, ni dérivé flouté, ni clé inventée', async () => {
    fakeDb.profile.findFirst.mockResolvedValue(null);
    for (const cle of [`${MEMBRE}/verif/s.jpg`, `${MEMBRE}/photo-1.blur.jpg`, '']) {
      const res = await GET(req({ cle, moteur: 'lens' }));
      expect(res.status).toBe(404);
    }
    expect(mockSigned).not.toHaveBeenCalled();
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });

  it('refuse un non-admin (404 : la route n’existe pas pour lui), sans rien signer', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect((await GET(req({ cle: CLE, moteur: 'lens' }))).status).toBe(404);
    mockGetServerSession.mockResolvedValue(null);
    expect([401, 404]).toContain((await GET(req({ cle: CLE, moteur: 'lens' }))).status);
    expect(mockSigned).not.toHaveBeenCalled();
  });

  it('n’ouvre pas de redirection si la journalisation échoue : pas de trace, pas de sortie', async () => {
    fakeDb.moderationLog.create.mockRejectedValueOnce(new Error('db'));
    const res = await GET(req({ cle: CLE, moteur: 'lens' }));
    expect(res.status).toBe(500);
    expect(res.headers.get('location')).toBeNull();
  });
});
