/**
 * Tests — retrait d'une réponse par la modération (spec 009, US3).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireAdmin = vi.fn();
vi.mock('@/lib/admin', () => ({
  __esModule: true,
  requireAdmin: mockRequireAdmin,
  isAdminSession: (r: unknown) => typeof r === 'object' && r !== null && 'userId' in r && 'role' in r,
}));

const profileAnswer = { findUnique: vi.fn(), update: vi.fn() };
const moderationLog = { create: vi.fn() };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ profileAnswer, moderationLog }) }));

const call = async (body: unknown, id = 'a1') => {
  const { PATCH } = await import('../route');
  return PATCH(new Request(`http://x/api/admin/answers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
  profileAnswer.findUnique.mockResolvedValue({ id: 'a1', userId: 'u-2', questionKey: 'fait-rire', text: 'TEXTE-SECRET', status: 'published' });
  profileAnswer.update.mockResolvedValue({});
  moderationLog.create.mockResolvedValue({});
});

describe('PATCH /api/admin/answers/[id]', () => {
  it('retire la réponse et journalise la clé de question, jamais le texte', async () => {
    const res = await call({ status: 'removed' });
    expect(res.status).toBe(200);
    expect(profileAnswer.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'removed' } });
    const log = moderationLog.create.mock.calls[0][0].data;
    expect(log).toEqual({ adminId: 'admin-1', targetUserId: 'u-2', action: 'REMOVE_ANSWER', reason: 'fait-rire' });
    expect(JSON.stringify(moderationLog.create.mock.calls)).not.toContain('TEXTE-SECRET');
  });

  it('refuse un autre statut', async () => {
    expect((await call({ status: 'published' })).status).toBe(400);
    expect(profileAnswer.update).not.toHaveBeenCalled();
  });

  it('répond 404 pour une réponse inconnue', async () => {
    profileAnswer.findUnique.mockResolvedValue(null);
    expect((await call({ status: 'removed' })).status).toBe(404);
  });

  it('cache la route aux non-admins', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    expect((await call({ status: 'removed' })).status).toBe(404);
    expect(profileAnswer.update).not.toHaveBeenCalled();
  });
});
