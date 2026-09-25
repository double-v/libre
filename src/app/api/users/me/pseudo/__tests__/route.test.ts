/**
 * Tests — renommage du pseudo (#459).
 *
 * Même règle qu'à l'inscription, côté serveur. Un renommage valide lève
 * l'obligation posée par la migration (`mustRenameDisplayName`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const ME = randomUUID();

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { pseudo: { limit: 5, windowMs: 3_600_000 } },
}));

const update = vi.fn();
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ user: { update } }) }));

const req = (body: unknown) =>
  new Request('http://localhost/api/users/me/pseudo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 4, resetAt: Date.now() + 1000 });
  update.mockResolvedValue({ displayName: 'Camille L.' });
});

describe('PATCH /api/users/me/pseudo', () => {
  it('exige une session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { PATCH } = await import('../route');
    expect((await PATCH(req({ displayName: 'Camille' }))).status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuse un pseudo hors règle avec le motif et le message', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(req({ displayName: 'camille@gmail.com' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/e-mail/);
    expect(update).not.toHaveBeenCalled();
  });

  it('enregistre la forme normalisée et lève l\'obligation de renommer', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(req({ displayName: '  Camille   L. ' }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ME },
        data: { displayName: 'Camille L.', mustRenameDisplayName: false },
      }),
    );
    expect(await res.json()).toEqual({ displayName: 'Camille L.' });
  });

  it('limite le débit', async () => {
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 1000 });
    const { PATCH } = await import('../route');
    expect((await PATCH(req({ displayName: 'Camille' }))).status).toBe(429);
    expect(update).not.toHaveBeenCalled();
  });

  it('ignore tout autre champ du corps (pas d\'affectation de masse)', async () => {
    const { PATCH } = await import('../route');
    await PATCH(req({ displayName: 'Camille', role: 'ADMIN', isVerified: true }));
    const data = update.mock.calls[0][0].data;
    expect(Object.keys(data).sort()).toEqual(['displayName', 'mustRenameDisplayName']);
  });
});
