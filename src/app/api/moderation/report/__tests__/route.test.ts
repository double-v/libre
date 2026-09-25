/**
 * Tests — POST /api/moderation/report, push admin (#393, T068).
 *
 * Après persistance, les admins abonnés sont prévenus hors de l'app — sans
 * motif, sans identité du signalé ni du signalant (SC-006) : « un signalement
 * attend », rien d'autre. Planifié après la réponse, best-effort.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const fakeDb = { report: { create: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const enregistrerSignal = vi.fn(async () => true);
vi.mock('@/lib/fraude/signaux', () => ({ __esModule: true, enregistrerSignal }));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { report: { limit: 5, windowMs: 3_600_000 } },
}));

const mockSendPushToAdmins = vi.fn();
vi.mock('@/lib/push/server', () => ({
  __esModule: true,
  sendPushToAdmins: (...a: unknown[]) => mockSendPushToAdmins(...a),
  buildPayload: (kind: string) => ({ kind, title: 'Nouveau signalement', body: 'Un signalement attend.', url: '/admin/reports', tag: 'admin-reports' }),
}));
// Les tâches after() sont collectées : un test peut exiger qu'elles résolvent
// (une rejection y serait, côté Next, une « unhandled rejection » silencieuse).
let afterTasks: Promise<unknown>[] = [];
const mockAfter = vi.fn((task: () => unknown) => { afterTasks.push(Promise.resolve().then(task)); });
vi.mock('next/server', async (importOriginal) => {
  const orig = await importOriginal<typeof import('next/server')>();
  return { ...orig, after: (task: () => unknown) => mockAfter(task) };
});

const { POST } = await import('../route');

const ME = '3a69ed48-0577-4bb9-88d9-d2154263db9b';
const REPORTED = 'e99f0fc5-211a-4b01-8603-b409be15adb4';

function req(body: unknown) {
  return new Request('http://localhost/api/moderation/report', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  afterTasks = [];
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
  mockRateLimit.mockResolvedValue({ success: true });
  fakeDb.report.create.mockResolvedValue({ id: 'r1', reporterId: ME, reportedId: REPORTED, reason: 'harassment', status: 'pending' });
  mockSendPushToAdmins.mockResolvedValue(undefined);
});

describe('POST /api/moderation/report — push admin', () => {
  it('après persistance, planifie un push admin sans motif ni identités', async () => {
    const res = await POST(req({ reportedId: REPORTED, reason: 'harassment', description: 'il insiste lourdement' }));
    expect(res.status).toBe(201);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(mockSendPushToAdmins).toHaveBeenCalledTimes(1));
    const json = JSON.stringify(mockSendPushToAdmins.mock.calls[0][0]);
    expect(mockSendPushToAdmins.mock.calls[0][0].kind).toBe('admin-report');
    for (const leak of ['harassment', 'insiste', ME, REPORTED]) expect(json).not.toContain(leak);
    // Persisté AVANT d'être planifié
    expect(fakeDb.report.create.mock.invocationCallOrder[0]).toBeLessThan(mockAfter.mock.invocationCallOrder[0]);
  });

  it('une panne du push ne change pas le 201, et la tâche after ne rejette pas', async () => {
    mockSendPushToAdmins.mockRejectedValue(new Error('vapid'));
    const res = await POST(req({ reportedId: REPORTED, reason: 'spam' }));
    expect(res.status).toBe(201);
    await expect(Promise.all(afterTasks)).resolves.toBeDefined();
  });

  it('rien de planifié si le signalement n’est pas persisté (400)', async () => {
    const res = await POST(req({ reportedId: 'not-a-uuid', reason: 'spam' }));
    expect(res.status).toBe(400);
    expect(mockAfter).not.toHaveBeenCalled();
  });
});

describe('POST /api/moderation/report — signal de faux profil (spec 006, #443)', () => {
  it('un signalement « faux profil » devient un signal fort, dédupliqué par signalement', async () => {
    fakeDb.report.create.mockResolvedValue({ id: 'r42', reporterId: ME, reportedId: REPORTED, reason: 'fake', status: 'pending' });
    const res = await POST(req({ reportedId: REPORTED, reason: 'fake' }));
    expect(res.status).toBe(201);
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: REPORTED, type: 'signalement_faux', force: 'fort', cle: 'r42' });
  });

  it('un autre motif ne lève aucun signal', async () => {
    await POST(req({ reportedId: REPORTED, reason: 'harassment' }));
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });
});

describe('POST /api/moderation/report — « semble avoir moins de 18 ans » (#437)', () => {
  it('motif accepté, signal fort pour la file, aucun retrait automatique', async () => {
    fakeDb.report.create.mockResolvedValue({ id: 'r7', reporterId: ME, reportedId: REPORTED, reason: 'minor', status: 'pending' });
    const res = await POST(req({ reportedId: REPORTED, reason: 'minor' }));
    expect(res.status).toBe(201);
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: REPORTED, type: 'signalement_mineur', force: 'fort', cle: 'r7' });
    expect(JSON.stringify(fakeDb)).not.toContain('retraitAt');
  });
});
