/**
 * /api/admin/retention (#427) — état de la purge et lancement manuel.
 *
 * Le bouton admin est le filet de la purge par le trafic : quand personne ne
 * visite, l'état dit « en retard » et l'admin peut lancer à la main. Chaque
 * lancement manuel laisse une trace dans le journal de modération.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  retentionState: { findUnique: vi.fn(), update: vi.fn(async () => ({})) },
  moderationLog: { create: vi.fn(async () => ({})) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const mockPurger = vi.fn();
const mockEnregistrer = vi.fn(async () => {});
vi.mock('@/lib/retention/purge', () => ({ __esModule: true, purgerRetention: mockPurger, enregistrerBilan: mockEnregistrer }));

const { GET, POST } = await import('../route');
const ADMIN = randomUUID();

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ADMIN, email: 'a@x.fr' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  fakeDb.retentionState.findUnique.mockResolvedValue(null);
  mockPurger.mockResolvedValue({ encounters: 3, reports: { erreur: 'boom' } });
});

describe('GET /api/admin/retention', () => {
  it('sans témoin : jamais tournée, donc en retard, et liste les règles', async () => {
    const data = await (await GET()).json();
    expect(data).toMatchObject({ lastRunAt: null, lastReport: null, enRetard: true });
    expect(data.regles.map((r: { id: string }) => r.id)).toContain('encounters');
  });

  it('un passage récent n’est pas en retard ; un passage de plus de 48 h l’est', async () => {
    fakeDb.retentionState.findUnique.mockResolvedValue({ lastRunAt: new Date(Date.now() - 3600_000), lastReport: { encounters: 1 } });
    expect((await (await GET()).json()).enRetard).toBe(false);
    fakeDb.retentionState.findUnique.mockResolvedValue({ lastRunAt: new Date(Date.now() - 49 * 3600_000), lastReport: null });
    expect((await (await GET()).json()).enRetard).toBe(true);
  });

  it('refuse un non-admin (404 : la route n’existe pas pour lui)', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect((await GET()).status).toBe(404);
    expect((await POST()).status).toBe(404);
  });
});

describe('POST /api/admin/retention', () => {
  it('purge, enregistre le bilan, avance lastRunAt, journalise avec les règles en échec', async () => {
    fakeDb.retentionState.findUnique.mockResolvedValue({ lastRunAt: new Date(), lastReport: { encounters: 3 } });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockPurger).toHaveBeenCalledTimes(1);
    expect(mockEnregistrer).toHaveBeenCalledWith({ encounters: 3, reports: { erreur: 'boom' } }, expect.any(Date));
    expect(fakeDb.retentionState.update).toHaveBeenCalledWith({ where: { id: 'singleton' }, data: { lastRunAt: expect.any(Date) } });
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: { adminId: ADMIN, targetUserId: ADMIN, action: 'RUN_RETENTION', reason: 'manuel ; en echec: reports' },
    });
    expect((await res.json()).enRetard).toBe(false);
  });
});
