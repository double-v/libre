/**
 * Tests — POST /api/feedback, push admin (#393, T069).
 *
 * Même règle que le signalement : après persistance, « un retour attend »,
 * sans le message ni l'URL d'où il vient (SC-006). Un retour anonyme (sans
 * session) prévient aussi — c'est la file qui compte, pas qui l'a remplie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const fakeDb = { feedback: { create: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({ __esModule: true, rateLimit: mockRateLimit }));

const mockSendPushToAdmins = vi.fn();
vi.mock('@/lib/push/server', () => ({
  __esModule: true,
  sendPushToAdmins: (...a: unknown[]) => mockSendPushToAdmins(...a),
  buildPayload: (kind: string) => ({ kind, title: 'Nouveau retour', body: 'Un retour attend.', url: '/admin/feedback', tag: 'admin-feedback' }),
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

function req(body: unknown) {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'user-agent': 'UA/1' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  afterTasks = [];
  mockGetServerSession.mockResolvedValue({ user: { id: 'me' } });
  mockRateLimit.mockResolvedValue({ success: true });
  fakeDb.feedback.create.mockResolvedValue({ id: 'f1' });
  mockSendPushToAdmins.mockResolvedValue(undefined);
});

describe('POST /api/feedback — push admin', () => {
  it('après persistance, planifie un push admin sans message ni url', async () => {
    const res = await POST(req({ category: 'bug', message: 'le bouton ne marche pas', url: 'https://libre.example/profile/42' }));
    expect(res.status).toBe(201);
    await vi.waitFor(() => expect(mockSendPushToAdmins).toHaveBeenCalledTimes(1));
    const payload = mockSendPushToAdmins.mock.calls[0][0];
    expect(payload.kind).toBe('admin-feedback');
    const json = JSON.stringify(payload);
    for (const leak of ['bouton', 'profile/42', 'me']) expect(json).not.toContain(leak);
    expect(fakeDb.feedback.create.mock.invocationCallOrder[0]).toBeLessThan(mockAfter.mock.invocationCallOrder[0]);
  });

  it('un retour anonyme prévient aussi', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(req({ message: 'suggestion : un mode nuit' }));
    expect(res.status).toBe(201);
    await vi.waitFor(() => expect(mockSendPushToAdmins).toHaveBeenCalledTimes(1));
  });

  it('une panne du push ne change pas le 201, et la tâche after ne rejette pas', async () => {
    mockSendPushToAdmins.mockRejectedValue(new Error('vapid'));
    expect((await POST(req({ message: 'ça plante parfois' }))).status).toBe(201);
    await expect(Promise.all(afterTasks)).resolves.toBeDefined();
  });

  it('rien de planifié sous rate limit (429)', async () => {
    mockRateLimit.mockResolvedValue({ success: false });
    expect((await POST(req({ message: 'encore un retour' }))).status).toBe(429);
    expect(mockAfter).not.toHaveBeenCalled();
  });
});
