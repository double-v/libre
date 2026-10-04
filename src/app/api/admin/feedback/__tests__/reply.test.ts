/**
 * #477 — répondre à un retour depuis l'admin. On verrouille : l'accès ADMIN,
 * une seule réponse (409, y compris en course), le refus sur un retour
 * anonyme, et surtout que ni le push ni l'e-mail ne portent le texte.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  feedback: { findUnique: vi.fn(), updateMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const mockSendPushToUser = vi.fn();
vi.mock('@/lib/push/server', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/push/server')>();
  return { ...orig, sendPushToUser: mockSendPushToUser };
});
const mockSendEmail = vi.fn();
vi.mock('@/lib/email-send', () => ({ sendFeedbackReplyEmail: mockSendEmail }));

let afterTasks: Promise<unknown>[] = [];
vi.mock('next/server', async (importOriginal) => {
  const orig = await importOriginal<typeof import('next/server')>();
  return { ...orig, after: (task: () => unknown) => { afterTasks.push(Promise.resolve().then(task)); } };
});

const { POST } = await import('@/app/api/admin/feedback/[id]/reply/route');

const REPLY = 'Pousse le curseur de distance vers « partout ».';

function adminSession() {
  mockGetServerSession.mockResolvedValue({ user: { id: 'admin-1', email: 'a@x.fr', role: 'ADMIN' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
}

function req(body: unknown) {
  return new NextRequest('http://x/api/admin/feedback/f-1/reply', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}
const params = { params: Promise.resolve({ id: 'f-1' }) };

const OUVERT = { id: 'f-1', userId: 'u-1', reply: null, user: { email: 'membre@x.fr' } };

beforeEach(() => {
  vi.clearAllMocks();
  afterTasks = [];
  mockSendPushToUser.mockResolvedValue(undefined);
  mockSendEmail.mockResolvedValue(undefined);
  fakeDb.feedback.updateMany.mockResolvedValue({ count: 1 });
});

describe('POST /api/admin/feedback/[id]/reply', () => {
  it('404 pour un non-admin, sans rien lire ni écrire', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u-2', role: 'USER' } });
    fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
    const res = await POST(req({ reply: REPLY }), params);
    expect(res.status).toBe(404);
    expect(fakeDb.feedback.updateMany).not.toHaveBeenCalled();
  });

  it.each([[''], ['   '], ['x'.repeat(2001)]])('400 sur une réponse vide ou trop longue', async (reply) => {
    adminSession();
    const res = await POST(req({ reply }), params);
    expect(res.status).toBe(400);
  });

  it('404 sur un retour inconnu', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue(null);
    expect((await POST(req({ reply: REPLY }), params)).status).toBe(404);
  });

  it('422 sur un retour anonyme : personne à qui répondre', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue({ ...OUVERT, userId: null, user: null });
    expect((await POST(req({ reply: REPLY }), params)).status).toBe(422);
    expect(fakeDb.feedback.updateMany).not.toHaveBeenCalled();
  });

  it('409 si le retour a déjà une réponse', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue({ ...OUVERT, reply: 'déjà' });
    expect((await POST(req({ reply: REPLY }), params)).status).toBe(409);
    expect(fakeDb.feedback.updateMany).not.toHaveBeenCalled();
  });

  it('409 si un autre admin a répondu entre la lecture et l’écriture', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue(OUVERT);
    fakeDb.feedback.updateMany.mockResolvedValue({ count: 0 });
    expect((await POST(req({ reply: REPLY }), params)).status).toBe(409);
    await Promise.all(afterTasks);
    expect(mockSendPushToUser).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('écrit la réponse une seule fois (où reply est nul), passe en replied et note l’admin', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue(OUVERT);
    const res = await POST(req({ reply: `  ${REPLY}  ` }), params);
    expect(res.status).toBe(200);
    const arg = fakeDb.feedback.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'f-1', reply: null });
    expect(arg.data).toMatchObject({ reply: REPLY, status: 'replied', repliedBy: 'admin-1' });
    expect(arg.data.repliedAt).toBeInstanceOf(Date);
  });

  it('prévient l’auteur par push et par e-mail, sans le texte de la réponse', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue(OUVERT);
    await POST(req({ reply: REPLY }), params);
    await Promise.all(afterTasks);

    expect(mockSendPushToUser).toHaveBeenCalledTimes(1);
    const [userId, payload] = mockSendPushToUser.mock.calls[0];
    expect(userId).toBe('u-1');
    expect(payload.kind).toBe('feedback-reply');
    expect(JSON.stringify(payload)).not.toContain(REPLY);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const [to, url] = mockSendEmail.mock.calls[0];
    expect(to).toBe('membre@x.fr');
    expect(url).toMatch(/\/settings\/retours$/);
  });

  it('une panne du push ou de l’e-mail ne change pas la réponse, et after ne rejette pas', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue(OUVERT);
    mockSendPushToUser.mockRejectedValue(new Error('push'));
    mockSendEmail.mockRejectedValue(new Error('resend'));
    const res = await POST(req({ reply: REPLY }), params);
    expect(res.status).toBe(200);
    await expect(Promise.all(afterTasks)).resolves.toBeDefined();
  });
});
