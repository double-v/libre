import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = { user: { findUnique: vi.fn(), delete: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const deletePhoto = vi.fn();
vi.mock('@/lib/r2', () => ({ __esModule: true, deletePhoto, isR2Configured: () => true }));
const { effacerCompte, cleR2DepuisSelfieUrl } = await import('../suppression-compte');

beforeEach(() => vi.clearAllMocks());

describe('effacerCompte (#437)', () => {
  it('efface photos, floutés et selfies sur R2, puis la ligne', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      profile: { photos: ['u/a.jpg', 'u/b.jpg'] },
      photoModerations: [{ blurredKey: 'u/a.blur.jpg' }],
      verificationRequests: [{ selfieUrl: '/api/photos/u%2Fverif%2Fs.jpg' }, { selfieUrl: '/api/photos/u/a.jpg' }],
    });
    await effacerCompte('u');
    expect(deletePhoto.mock.calls.map((c) => c[0]).sort()).toEqual(['u/a.blur.jpg', 'u/a.jpg', 'u/b.jpg', 'u/verif/s.jpg']);
    expect(fakeDb.user.delete).toHaveBeenCalledWith({ where: { id: 'u' } });
  });

  it('une panne R2 ne retient pas le compte', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ profile: { photos: ['u/a.jpg'] }, photoModerations: [], verificationRequests: [] });
    deletePhoto.mockRejectedValue(new Error('R2'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await effacerCompte('u');
    expect(fakeDb.user.delete).toHaveBeenCalled();
    err.mockRestore();
  });

  it('compte déjà parti : rien', async () => {
    fakeDb.user.findUnique.mockResolvedValue(null);
    await effacerCompte('u');
    expect(fakeDb.user.delete).not.toHaveBeenCalled();
  });

  it('cleR2DepuisSelfieUrl', () => {
    expect(cleR2DepuisSelfieUrl('https://x/api/photos/u/p.jpg?v=1')).toBe('u/p.jpg');
    expect(cleR2DepuisSelfieUrl('/autre')).toBeNull();
  });
});
