/**
 * Tests — GET /api/admin/queues (#391 ; spec 012, T030).
 *
 * 404 pour un non-admin SANS aucun comptage ; pour un admin, les cas viennent
 * des compteurs du hub Membres (`compterCas`, prouvé sur PostgreSQL dans
 * `tests/integration/hub/liste.cas.ts`), les retours de leur statut.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Compteurs } from '@/lib/moderation/cas';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = { user: { findUnique: vi.fn() }, feedback: { count: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const compterCas = vi.fn<() => Promise<Compteurs>>();
vi.mock('@/lib/moderation/membres', () => ({ __esModule: true, compterCas: () => compterCas() }));

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
  fakeDb.user.findUnique.mockResolvedValue({ role, isBanned: false });
}

describe('GET /api/admin/queues', () => {
  it('renvoie 404 à un non-admin, sans lancer aucun comptage', async () => {
    session('USER');
    expect((await GET()).status).toBe(404);
    expect(compterCas).not.toHaveBeenCalled();
    expect(fakeDb.feedback.count).not.toHaveBeenCalled();
  });

  it('renvoie 404 sans session', async () => {
    session(null);
    expect((await GET()).status).toBe(404);
    expect(compterCas).not.toHaveBeenCalled();
  });

  it('rend les cas du hub et les retours ouverts', async () => {
    session('ADMIN');
    compterCas.mockResolvedValue({ atraiter: 9, verif: 3, report: 2, photo: 1, reponse: 1, indice: 2 });
    fakeDb.feedback.count.mockResolvedValue(5);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ atraiter: 9, reports: 2, verifications: 3, profils: 4, feedback: 5 });
    expect(fakeDb.feedback.count).toHaveBeenCalledWith({ where: { status: 'open' } });
  });

  it('cas en panne : 0 pour les cas, les retours restent justes', async () => {
    session('ADMIN');
    compterCas.mockRejectedValue(new Error('db down'));
    fakeDb.feedback.count.mockResolvedValue(2);
    expect(await (await GET()).json()).toEqual({ atraiter: 0, reports: 0, verifications: 0, profils: 0, feedback: 2 });
  });
});
