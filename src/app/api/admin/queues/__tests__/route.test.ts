/**
 * Tests — GET /api/admin/queues (#391, spec 003 US3, T032).
 *
 * Le contrat (contracts/api.md) : 404 pour un non-admin SANS aucun comptage
 * (on ne dépense rien pour quelqu'un qui n'a rien à voir), trois compteurs
 * pour un admin, chacun sur le filtre `status` du data-model — pas un
 * `count()` nu qui compterait aussi les signalements traités.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { findUnique: vi.fn(), findMany: vi.fn(async () => []) },
  report: { count: vi.fn() },
  verificationRequest: { count: vi.fn() },
  feedback: { count: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('../route');

beforeEach(() => {
  vi.clearAllMocks();
});

function session(role: string | null) {
  if (role === null) {
    mockGetServerSession.mockResolvedValue(null);
    return;
  }
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1', email: 'a@x.fr', role } });
  fakeDb.user.findUnique.mockResolvedValue({ role });
}

describe('GET /api/admin/queues', () => {
  it('renvoie 404 à un non-admin, sans lancer aucun comptage', async () => {
    session('USER');
    const res = await GET();
    expect(res.status).toBe(404);
    expect(fakeDb.report.count).not.toHaveBeenCalled();
    expect(fakeDb.verificationRequest.count).not.toHaveBeenCalled();
    expect(fakeDb.feedback.count).not.toHaveBeenCalled();
    expect(fakeDb.user.findMany).not.toHaveBeenCalled();
  });

  it('renvoie 404 sans session', async () => {
    session(null);
    expect((await GET()).status).toBe(404);
    expect(fakeDb.report.count).not.toHaveBeenCalled();
  });

  it('renvoie les trois compteurs à un admin, chacun sur son filtre de statut', async () => {
    session('ADMIN');
    fakeDb.report.count.mockResolvedValue(2);
    fakeDb.verificationRequest.count.mockResolvedValue(0);
    fakeDb.feedback.count.mockResolvedValue(5);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reports: 2, verifications: 0, feedback: 5, profils: 0 });

    expect(fakeDb.report.count).toHaveBeenCalledWith({ where: { status: 'pending' } });
    expect(fakeDb.verificationRequest.count).toHaveBeenCalledWith({ where: { status: 'pending' } });
    expect(fakeDb.feedback.count).toHaveBeenCalledWith({ where: { status: 'open' } });
  });
});
