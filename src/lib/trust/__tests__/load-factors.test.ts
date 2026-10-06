/**
 * Tests — `loadFactors`, filtre du signalement actif (#509).
 *
 * La modération écrit `dismissed` quand elle classe un signalement sans suite
 * (`PUT /api/admin/reports/[id]`). Le filtre excluait `rejected`, un statut
 * que rien n'écrit : un signalement classé pénalisait donc à vie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const reportFindFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({
    user: {
      findUniqueOrThrow: async () => ({ emailVerified: new Date(), isBanned: false, createdAt: new Date() }),
    },
    verificationRequest: { findFirst: async () => null },
    squareReaction: { findFirst: async () => null },
    match: { count: async () => 0 },
    trustContact: { findFirst: async () => null },
    report: { findFirst: reportFindFirst },
  }),
}));

const { loadFactors } = await import('../compute-level');

beforeEach(() => {
  reportFindFirst.mockReset().mockResolvedValue(null);
});

describe('loadFactors — signalement actif', () => {
  it('ignore les signalements classés sans suite par la modération', async () => {
    await loadFactors('u1');
    expect(reportFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reportedId: 'u1', status: { not: 'dismissed' } } }),
    );
  });

  it('compte un signalement en attente ou retenu', async () => {
    reportFindFirst.mockResolvedValue({ id: 'r1' });
    expect((await loadFactors('u1')).hasActiveReport).toBe(true);
  });
});
