// @vitest-environment node
/**
 * Invitation manuelle à la vérification : même effet que l'automate de la
 * spec 010 — `verifInviteeAt` posé, jamais `retraitAt` — mais journalisée au
 * nom de l'admin.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn(), update: vi.fn((a: { data: Record<string, unknown> }) => a) },
  moderationLog: { create: vi.fn((a: { data: Record<string, unknown> }) => a) },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { POST } = await import('../route');

const ADMIN = '11111111-1111-1111-1111-111111111111';
const U1 = '22222222-2222-2222-2222-222222222222';

const inviter = (id: string) =>
  POST(new NextRequest(`http://x/api/admin/users/${id}/invitation`, { method: 'POST' }), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ADMIN, email: 'a@x.fr' } });
});

describe('POST /api/admin/users/[id]/invitation', () => {
  it('pose l\'invitation sans mise en retrait et journalise au nom de l\'admin', async () => {
    fakeDb.user.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce({ isVerified: false, verifInviteeAt: null });

    const res = await inviter(U1);

    expect(res.status).toBe(200);
    const data = fakeDb.user.update.mock.calls[0][0].data;
    expect(data.verifInviteeAt).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty('retraitAt');
    expect(fakeDb.moderationLog.create.mock.calls[0][0].data).toMatchObject({
      adminId: ADMIN,
      targetUserId: U1,
      action: 'INVITE_VERIFICATION',
    });
  });

  it('garde la date d\'une invitation déjà posée', async () => {
    const avant = new Date('2026-10-01');
    fakeDb.user.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce({ isVerified: false, verifInviteeAt: avant });

    const res = await inviter(U1);

    expect((await res.json()).invitation.depuis).toBe(avant.toISOString());
    expect(fakeDb.user.update).not.toHaveBeenCalled();
  });

  it('refuse un profil déjà vérifié', async () => {
    fakeDb.user.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce({ isVerified: true, verifInviteeAt: null });

    expect((await inviter(U1)).status).toBe(409);
    expect(fakeDb.user.update).not.toHaveBeenCalled();
  });

  it('cache la route à un non-admin (404, comme toute l\'admin)', async () => {
    fakeDb.user.findUnique.mockResolvedValueOnce({ role: 'USER' });
    expect((await inviter(U1)).status).toBe(404);
  });
});
