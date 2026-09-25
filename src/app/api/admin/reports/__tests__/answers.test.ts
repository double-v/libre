/**
 * Tests — les réponses du profil signalé accompagnent le signalement
 * (spec 009, US3, FR-009).
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/admin', () => ({
  __esModule: true,
  requireAdmin: vi.fn().mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' }),
  isAdminSession: () => true,
}));
const report = { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ report }) }));

describe('GET /api/admin/reports — réponses du profil signalé', () => {
  it('inclut les réponses publiées du profil signalé, sans les retirées', async () => {
    const { GET } = await import('../route');
    await GET(new NextRequest('http://x/api/admin/reports?page=1&perPage=20'));
    const include = report.findMany.mock.calls[0][0].include;
    expect(include.reported.select.profileAnswers).toEqual({
      where: { status: 'published' },
      select: { id: true, questionKey: true, choices: true, text: true },
    });
  });
});
