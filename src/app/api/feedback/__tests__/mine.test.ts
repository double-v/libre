/**
 * #477 — « Mes retours » côté membre : la liste ne sort que les retours de la
 * personne, par liste blanche ; le marquage lu est séparé de la lecture ; le
 * non-lu est un booléen, jamais un nombre (spec 003).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const fakeDb = {
  feedback: { findMany: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET: LIST } = await import('@/app/api/feedback/mine/route');
const { POST: READ } = await import('@/app/api/feedback/mine/read/route');
const { GET: UNREAD } = await import('@/app/api/feedback/mine/unread/route');

const connecte = () => mockGetServerSession.mockResolvedValue({ user: { id: 'u-1' } });

beforeEach(() => {
  vi.clearAllMocks();
  fakeDb.feedback.updateMany.mockResolvedValue({ count: 1 });
});

describe('GET /api/feedback/mine', () => {
  it('401 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await LIST()).status).toBe(401);
    expect(fakeDb.feedback.findMany).not.toHaveBeenCalled();
  });

  it('ne lit que les retours de la personne, par liste blanche de colonnes', async () => {
    connecte();
    fakeDb.feedback.findMany.mockResolvedValue([]);
    await LIST();
    const arg = fakeDb.feedback.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: 'u-1' });
    expect(Object.keys(arg.select).sort()).toEqual(
      ['category', 'createdAt', 'id', 'message', 'repliedAt', 'reply', 'replyReadAt'].sort(),
    );
  });

  it('marque une réponse non lue, jamais un retour sans réponse', async () => {
    connecte();
    const d = new Date('2026-10-04T10:00:00Z');
    fakeDb.feedback.findMany.mockResolvedValue([
      { id: 'a', category: 'question', message: 'm', createdAt: d, reply: 'r', repliedAt: d, replyReadAt: null },
      { id: 'b', category: 'bug', message: 'm', createdAt: d, reply: 'r', repliedAt: d, replyReadAt: d },
      { id: 'c', category: 'suggestion', message: 'm', createdAt: d, reply: null, repliedAt: null, replyReadAt: null },
    ]);
    const { items } = await (await LIST()).json();
    expect(items.map((i: { unread: boolean }) => i.unread)).toEqual([true, false, false]);
    expect(Object.keys(items[0])).not.toContain('replyReadAt');
  });
});

describe('POST /api/feedback/mine/read', () => {
  it('401 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await READ()).status).toBe(401);
  });

  it('pose replyReadAt sur les seules réponses non lues de la personne', async () => {
    connecte();
    await READ();
    const arg = fakeDb.feedback.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: 'u-1', reply: { not: null }, replyReadAt: null });
    expect(arg.data.replyReadAt).toBeInstanceOf(Date);
  });
});

describe('GET /api/feedback/mine/unread', () => {
  it('un booléen, sans jamais compter', async () => {
    connecte();
    fakeDb.feedback.findFirst.mockResolvedValue({ id: 'a' });
    expect(await (await UNREAD()).json()).toEqual({ hasUnreadReply: true });
    fakeDb.feedback.findFirst.mockResolvedValue(null);
    expect(await (await UNREAD()).json()).toEqual({ hasUnreadReply: false });
    expect(fakeDb.feedback.count).not.toHaveBeenCalled();
  });

  it('sans session : faux, sans lecture', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect(await (await UNREAD()).json()).toEqual({ hasUnreadReply: false });
    expect(fakeDb.feedback.findFirst).not.toHaveBeenCalled();
  });
});
