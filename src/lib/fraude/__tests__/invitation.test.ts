import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUnique = vi.fn();
const update = vi.fn();
const logCreate = vi.fn();
const transaction = vi.fn(async (ops: unknown[]) => ops);
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => ({ user: { findUnique, update }, moderationLog: { create: logCreate }, $transaction: transaction }),
}));

const { evaluerCompte } = await import('../invitation');

const compte = (o: Record<string, unknown> = {}) => ({
  isVerified: false,
  isBanned: false,
  retraitAt: null,
  verifInviteeAt: null,
  profileReview: null,
  profileSignals: [{ type: 'likes_rafale', force: 'fort', createdAt: new Date('2026-10-05') }],
  ...o,
});

beforeEach(() => {
  [findUnique, update, logCreate, transaction].forEach((m) => m.mockClear());
});

describe('evaluerCompte (FR-017, FR-020)', () => {
  it('invite un compte douteux non vérifié et journalise sans auteur humain', async () => {
    findUnique.mockResolvedValue(compte());
    expect(await evaluerCompte('u1')).toBe(true);
    expect(update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { verifInviteeAt: expect.any(Date) } });
    expect(logCreate).toHaveBeenCalledWith({ data: { adminId: null, targetUserId: 'u1', action: 'INVITE_VERIFICATION', reason: 'likes_rafale' } });
  });

  it.each([
    ['vérifié', { isVerified: true }],
    ['déjà invité', { verifInviteeAt: new Date() }],
    ['déjà en retrait', { retraitAt: new Date() }],
    ['banni', { isBanned: true }],
    ['seulement un indice de contexte', { profileSignals: [{ type: 'appareil_partage', force: 'faible', createdAt: new Date() }] }],
    ['signal tranché par « rien à signaler »', { profileReview: { decidedAt: new Date('2026-10-06') } }],
  ])("n'invite pas un compte %s", async (_l, o) => {
    findUnique.mockResolvedValue(compte(o));
    expect(await evaluerCompte('u1')).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('reste muet si le compte a disparu ou si la base répond mal', async () => {
    findUnique.mockResolvedValue(null);
    expect(await evaluerCompte('u1')).toBe(false);
    findUnique.mockRejectedValue(new Error('panne'));
    expect(await evaluerCompte('u1')).toBe(false);
  });
});
