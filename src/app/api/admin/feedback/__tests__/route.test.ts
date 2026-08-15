/**
 * Issue #321 — les retours envoyés depuis FeedbackButton n'avaient aucune
 * sortie côté admin. Ces tests verrouillent la lecture (filtres, pagination,
 * retour anonyme) et le classement, ainsi que le contrôle d'accès ADMIN.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { findUnique: vi.fn() },
  feedback: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

const { GET } = await import('@/app/api/admin/feedback/route');
const { PATCH } = await import('@/app/api/admin/feedback/[id]/route');

function adminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@x.fr', role: 'ADMIN' },
  });
  // requireAdmin() revérifie en base — le rôle doit y être ADMIN aussi.
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
}

function nonAdminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'user-1', email: 'u@x.fr', role: 'USER' },
  });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
}

function listRequest(query = '') {
  return new NextRequest(`http://x/api/admin/feedback${query}`);
}

function patchRequest(body: unknown) {
  return new NextRequest('http://x/api/admin/feedback/f-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  fakeDb.feedback.findMany.mockResolvedValue([]);
  fakeDb.feedback.count.mockResolvedValue(0);
});

describe('GET /api/admin/feedback — contrôle d\'accès', () => {
  it('renvoie 404 à un non-admin (masque l\'existence de la route)', async () => {
    nonAdminSession();
    expect((await GET(listRequest())).status).toBe(404);
  });

  it('renvoie 404 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await GET(listRequest())).status).toBe(404);
  });

  it('laisse passer un admin', async () => {
    adminSession();
    expect((await GET(listRequest())).status).toBe(200);
  });
});

describe('GET /api/admin/feedback — lecture', () => {
  beforeEach(adminSession);

  it('sans paramètre, ne filtre sur rien', async () => {
    await GET(listRequest());
    expect(fakeDb.feedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('applique les filtres status et category', async () => {
    await GET(listRequest('?status=open&category=bug'));
    expect(fakeDb.feedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'open', category: 'bug' } }),
    );
  });

  it('ignore un filtre hors domaine plutôt que de renvoyer 400', async () => {
    const res = await GET(listRequest('?status=bidon&category=nimporte'));
    expect(res.status).toBe(200);
    expect(fakeDb.feedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('pagine et borne perPage à 50', async () => {
    await GET(listRequest('?page=3&perPage=500'));
    expect(fakeDb.feedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 100, take: 50 }),
    );
  });

  it('joint l\'auteur en gardant la relation nullable (retour anonyme)', async () => {
    fakeDb.feedback.findMany.mockResolvedValue([
      { id: 'f-1', category: 'bug', message: 'ça casse', status: 'open', user: null },
    ]);
    fakeDb.feedback.count.mockResolvedValue(1);

    const res = await GET(listRequest());
    const data = await res.json();

    expect(data.total).toBe(1);
    expect(data.items[0].user).toBeNull();
  });
});

describe('PATCH /api/admin/feedback/[id]', () => {
  it('renvoie 404 à un non-admin', async () => {
    nonAdminSession();
    const res = await PATCH(patchRequest({ status: 'resolved' }), params('f-1'));
    expect(res.status).toBe(404);
  });

  it('bascule le statut d\'un retour', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue({ id: 'f-1' });
    fakeDb.feedback.update.mockResolvedValue({ id: 'f-1', status: 'resolved' });

    const res = await PATCH(patchRequest({ status: 'resolved' }), params('f-1'));

    expect(res.status).toBe(200);
    expect(fakeDb.feedback.update).toHaveBeenCalledWith({
      where: { id: 'f-1' },
      data: { status: 'resolved' },
    });
  });

  it('refuse un statut hors domaine', async () => {
    adminSession();
    const res = await PATCH(patchRequest({ status: 'spam' }), params('f-1'));
    expect(res.status).toBe(400);
    expect(fakeDb.feedback.update).not.toHaveBeenCalled();
  });

  it('renvoie 404 sur un retour inexistant', async () => {
    adminSession();
    fakeDb.feedback.findUnique.mockResolvedValue(null);
    const res = await PATCH(patchRequest({ status: 'resolved' }), params('f-404'));
    expect(res.status).toBe(404);
    expect(fakeDb.feedback.update).not.toHaveBeenCalled();
  });
});
