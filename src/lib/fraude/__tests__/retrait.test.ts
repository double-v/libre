import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUnique = vi.fn();
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ user: { findUnique } }) }));

const { refusSiRetrait } = await import('../retrait');

beforeEach(() => findUnique.mockReset());

describe('refusSiRetrait (#444)', () => {
  it('403 verification_requise pour un compte en retrait', async () => {
    findUnique.mockResolvedValue({ retraitAt: new Date() });
    const res = await refusSiRetrait('u1');
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: 'verification_requise' });
  });

  it('rien pour un compte ordinaire', async () => {
    findUnique.mockResolvedValue({ retraitAt: null });
    expect(await refusSiRetrait('u1')).toBeNull();
  });

  it('ne lit que le champ utile', async () => {
    findUnique.mockResolvedValue({ retraitAt: null });
    await refusSiRetrait('u1');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { retraitAt: true } });
  });
});
