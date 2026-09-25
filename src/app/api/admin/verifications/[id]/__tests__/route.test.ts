/**
 * PATCH /api/admin/verifications/[id] (#436) — trancher une demande de badge.
 *
 * Un refus porte un motif de la liste fermée : c'est ce que le membre lira.
 * Une demande déjà tranchée ne se re-tranche pas en silence.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn(), update: vi.fn() },
  verificationRequest: { findUnique: vi.fn(), update: vi.fn() },
  moderationLog: { create: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { PATCH } = await import('../route');

const trancher = (body: unknown) =>
  PATCH(new NextRequest('http://localhost/api/admin/verifications/v1', { method: 'PATCH', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: 'v1' }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'admin', email: 'admin@x.fr', role: 'ADMIN' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  fakeDb.verificationRequest.findUnique.mockResolvedValue({ id: 'v1', userId: 'u1', status: 'pending' });
});

describe('PATCH /api/admin/verifications/[id]', () => {
  it('valider : demande approuvée, profil vérifié, décision journalisée', async () => {
    const res = await trancher({ action: 'APPROVE_VERIFICATION' });
    expect(res.status).toBe(200);
    expect(fakeDb.verificationRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'v1' },
      data: expect.objectContaining({ status: 'approved', rejectReason: null, reviewedBy: 'admin' }),
    }));
    expect(fakeDb.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isVerified: true, retraitAt: null } });
    expect(fakeDb.moderationLog.create).toHaveBeenCalled();
  });

  it('refuser : le motif est obligatoire et enregistré', async () => {
    expect((await trancher({ action: 'REJECT_VERIFICATION' })).status).toBe(400);
    expect((await trancher({ action: 'REJECT_VERIFICATION', motif: 'inventé' })).status).toBe(400);
    const res = await trancher({ action: 'REJECT_VERIFICATION', motif: 'geste_invisible' });
    expect(res.status).toBe(200);
    expect(fakeDb.verificationRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'rejected', rejectReason: 'geste_invisible' }),
    }));
    expect(fakeDb.user.update).not.toHaveBeenCalled();
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'REJECT_VERIFICATION', reason: 'geste_invisible' }),
    });
  });

  it('409 sur une demande déjà tranchée', async () => {
    fakeDb.verificationRequest.findUnique.mockResolvedValue({ id: 'v1', userId: 'u1', status: 'approved' });
    expect((await trancher({ action: 'REJECT_VERIFICATION', motif: 'geste_invisible' })).status).toBe(409);
    expect(fakeDb.verificationRequest.update).not.toHaveBeenCalled();
  });
});
