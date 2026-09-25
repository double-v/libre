/**
 * Tests — mes réponses aux questions (spec 009, US1).
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
  limits: { answers: { limit: 120, windowMs: 3_600_000 } },
}));

const profileAnswer = { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ profileAnswer }) }));

const req = (method: string, body?: unknown, qs = '') =>
  new Request(`http://localhost/api/users/me/answers${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 100, resetAt: Date.now() + 1000 });
  profileAnswer.findMany.mockResolvedValue([]);
  profileAnswer.findUnique.mockResolvedValue(null);
  profileAnswer.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({ id: 'a1', status: 'published', ...create }));
  profileAnswer.deleteMany.mockResolvedValue({ count: 1 });
});

describe('/api/users/me/answers', () => {
  it('exige une session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { GET, PUT, DELETE } = await import('../route');
    expect((await GET()).status).toBe(401);
    expect((await PUT(req('PUT', { key: 'fait-rire', text: 'a' }))).status).toBe(401);
    expect((await DELETE(req('DELETE', undefined, '?key=fait-rire'))).status).toBe(401);
  });

  it('GET renvoie mes réponses, retirées comprises', async () => {
    profileAnswer.findMany.mockResolvedValue([
      { id: 'a1', questionKey: 'fait-rire', choices: [], text: 'Les chats.', status: 'removed' },
    ]);
    const { GET } = await import('../route');
    const body = await (await GET()).json();
    expect(profileAnswer.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: ME } }));
    expect(body.answers[0]).toMatchObject({ key: 'fait-rire', text: 'Les chats.', status: 'removed' });
  });

  it('PUT enregistre une réponse valide, normalisée, et la republie', async () => {
    const { PUT } = await import('../route');
    const res = await PUT(req('PUT', { key: 'cafe-the', choices: ['the', 'tisane'], text: '  Vert.  ' }));
    expect(res.status).toBe(200);
    const arg = profileAnswer.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ userId_questionKey: { userId: ME, questionKey: 'cafe-the' } });
    expect(arg.create).toEqual({ userId: ME, questionKey: 'cafe-the', choices: ['the', 'tisane'], text: 'Vert.' });
    expect(arg.update).toEqual({ choices: ['the', 'tisane'], text: 'Vert.', status: 'published' });
  });

  it.each([
    [{ key: 'inconnue', text: 'a' }, 'question'],
    [{ key: 'matin-ou-soir', choices: ['le-matin', 'le-soir'] }, 'choix'],
    [{ key: 'fait-rire', text: 'insta @cam' }, 'contact'],
    [{ key: 'fait-rire' }, 'texte-requis'],
  ])('PUT refuse %j (%s)', async (body, motif) => {
    const { PUT } = await import('../route');
    const res = await PUT(req('PUT', body));
    expect(res.status).toBe(400);
    expect((await res.json()).motif).toBe(motif);
    expect(profileAnswer.upsert).not.toHaveBeenCalled();
  });

  it('PUT ignore tout autre champ du corps', async () => {
    const { PUT } = await import('../route');
    await PUT(req('PUT', { key: 'fait-rire', text: 'Oui.', status: 'published', userId: 'autre', id: 'x' }));
    const arg = profileAnswer.upsert.mock.calls[0][0];
    expect(Object.keys(arg.create).sort()).toEqual(['choices', 'questionKey', 'text', 'userId']);
    expect(arg.create.userId).toBe(ME);
  });

  it('PUT et DELETE limitent le débit', async () => {
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 1000 });
    const { PUT, DELETE } = await import('../route');
    expect((await PUT(req('PUT', { key: 'fait-rire', text: 'a' }))).status).toBe(429);
    expect((await DELETE(req('DELETE', undefined, '?key=fait-rire'))).status).toBe(429);
  });

  it('DELETE retire ma réponse, idempotent', async () => {
    profileAnswer.deleteMany.mockResolvedValue({ count: 0 });
    const { DELETE } = await import('../route');
    const res = await DELETE(req('DELETE', undefined, '?key=fait-rire'));
    expect(res.status).toBe(204);
    expect(profileAnswer.deleteMany).toHaveBeenCalledWith({ where: { userId: ME, questionKey: 'fait-rire' } });
  });
});
