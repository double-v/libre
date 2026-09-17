/**
 * Tests — POST /api/likes, branche match (#392, T053).
 *
 * Sur un like réciproque, les deux comptes sont prévenus hors de l'app
 * (charge utile `match`, sans nom ni photo — le Pusher in-app, lui, porte le
 * profil pour la célébration). Le push est planifié après la réponse et
 * best-effort : une panne ne change pas le 201. Un like sans réciproque ne
 * pousse rien (pas de « quelqu'un t'a liké » : la charte l'interdit).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const fakeDb = {
  block: { findFirst: vi.fn() },
  like: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  match: { create: vi.fn() },
  user: { findUnique: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const mockTrigger = vi.fn();
vi.mock('@/lib/pusher', () => ({
  __esModule: true,
  pusher: { trigger: mockTrigger },
  getUserChannel: (id: string) => `private-user-${id}`,
}));

const mockSendPushToUser = vi.fn();
vi.mock('@/lib/push/server', () => ({
  __esModule: true,
  sendPushToUser: (...a: unknown[]) => mockSendPushToUser(...a),
  buildPayload: (kind: string) => ({ kind, title: 'Nouveau match', url: '/messages', tag: 'match' }),
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
const OTHER = 'e99f0fc5-211a-4b01-8603-b409be15adb4';

/** Le like réciproque existe (OTHER → ME) ; le doublon (ME → OTHER), non. */
function reciprocal() {
  fakeDb.like.findUnique.mockImplementation(async ({ where }: { where: { likerId_likedId: { likerId: string } } }) =>
    where.likerId_likedId.likerId === OTHER ? { likerId: OTHER, likedId: ME } : null,
  );
}

function req(likedId = OTHER) {
  return new Request('http://localhost/api/likes', { method: 'POST', body: JSON.stringify({ likedId }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  afterTasks = [];
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
  fakeDb.block.findFirst.mockResolvedValue(null);
  fakeDb.like.count.mockResolvedValue(0);
  fakeDb.like.create.mockResolvedValue({});
  fakeDb.like.findUnique.mockResolvedValue(null);
  fakeDb.match.create.mockResolvedValue({ id: 'match-1', conversation: { id: 'conv-1' } });
  fakeDb.user.findUnique.mockResolvedValue({ displayName: 'Camille', profile: { photos: ['p.jpg'] } });
  mockTrigger.mockResolvedValue({});
  mockSendPushToUser.mockResolvedValue(undefined);
});

describe('POST /api/likes — push sur match', () => {
  it('sans réciproque : like créé, aucun push', async () => {
    const res = await POST(req());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ liked: true, match: false });
    expect(mockAfter).not.toHaveBeenCalled();
    expect(mockSendPushToUser).not.toHaveBeenCalled();
  });

  it('sur match : push planifié après la réponse pour les DEUX comptes, charge `match` sans nom', async () => {
    reciprocal();
    const res = await POST(req());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ liked: true, match: true, matchId: 'match-1' });

    await vi.waitFor(() => expect(mockSendPushToUser).toHaveBeenCalledTimes(2));
    const targets = mockSendPushToUser.mock.calls.map((c) => c[0]).sort();
    expect(targets).toEqual([ME, OTHER].sort());
    for (const [, payload] of mockSendPushToUser.mock.calls) {
      expect(payload.kind).toBe('match');
      expect(JSON.stringify(payload)).not.toContain('Camille');
      expect(JSON.stringify(payload)).not.toContain('p.jpg');
    }
  });

  it('une panne du push laisse le 201, le Pusher in-app intact, et la tâche after ne rejette pas', async () => {
    reciprocal();
    mockSendPushToUser.mockRejectedValue(new Error('vapid'));
    const res = await POST(req());
    expect(res.status).toBe(201);
    expect(mockTrigger).toHaveBeenCalledTimes(2);
    // Une tâche after() qui rejette finirait en « unhandled rejection » côté Next :
    // le contrat, c'est que la panne est avalée DANS la tâche.
    await expect(Promise.all(afterTasks)).resolves.toBeDefined();
  });
});
