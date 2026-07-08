/**
 * Tests de non-régression — suppression d'un message 1:1
 * (DELETE /api/chat/[conversationId]/messages/[id], #201).
 *
 * Invariants verrouillés :
 *  - AUTEUR uniquement : on ne peut supprimer QUE ses propres messages (403 sinon),
 *    même en étant participant de la conversation.
 *  - SOFT-DELETE : on positionne `deletedAt`, on ne détruit jamais la ligne
 *    (donnée conservée pour modération/RGPD, contenu masqué à l'affichage).
 *  - Notif Pusher `message-deleted` BEST-EFFORT : une panne Pusher ne doit pas
 *    faire échouer une suppression déjà persistée (même régression que #206).
 *  - IDEMPOTENT : re-supprimer un message déjà supprimé reste 200 sans réécrire.
 *
 * On mocke next-auth, @/lib/db (Prisma) et @/lib/pusher.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// === Mocks ===

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  conversation: {
    findUnique: vi.fn(),
  },
  message: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

const mockTrigger = vi.fn();
vi.mock('@/lib/pusher', () => ({
  __esModule: true,
  pusher: { trigger: mockTrigger },
  getPusherChannel: (id: string) => `private-chat-${id}`,
  getUserChannel: (id: string) => `private-user-${id}`,
}));

// Import après les mocks
const { DELETE } = await import('../route');

// UUIDs réels (RFC 4122)
const ME_ID = '3a69ed48-0577-4bb9-88d9-d2154263db9b';
const OTHER_ID = 'e99f0fc5-211a-4b01-8603-b409be15adb4';
const STRANGER_ID = 'ba9eb471-46ec-4a5a-a38c-8e6c089b21bd';
const CONVO_ID = '0d6638d1-dba9-4002-81a2-5554c07530fb';
const MSG_ID = '7c6f1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f';

function makeParams(conversationId = CONVO_ID, id = MSG_ID) {
  return { params: Promise.resolve({ conversationId, id }) };
}

function deleteRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/chat/${CONVO_ID}/messages/${MSG_ID}`, {
    method: 'DELETE',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Défauts « chemin heureux » : je suis participant ET auteur du message.
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  fakeDb.conversation.findUnique.mockResolvedValue({ userA: ME_ID, userB: OTHER_ID });
  fakeDb.message.findUnique.mockResolvedValue({
    id: MSG_ID,
    senderId: ME_ID,
    conversationId: CONVO_ID,
    deletedAt: null,
  });
  fakeDb.message.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: MSG_ID,
    senderId: ME_ID,
    conversationId: CONVO_ID,
    ...data,
  }));
  mockTrigger.mockResolvedValue({ status: 200 });
});

describe('DELETE /api/chat/[conversationId]/messages/[id]', () => {
  it('soft-delete son propre message (positionne deletedAt) et renvoie 200', async () => {
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(200);
    expect(fakeDb.message.update).toHaveBeenCalledWith({
      where: { id: MSG_ID },
      data: { deletedAt: expect.any(Date) },
    });
    // Notifie l'autre côté en temps réel.
    expect(mockTrigger).toHaveBeenCalledWith(
      `private-chat-${CONVO_ID}`,
      'message-deleted',
      expect.objectContaining({ id: MSG_ID }),
    );
  });

  it('renvoie 403 si le message n’est pas de l’utilisateur (participant mais pas auteur)', async () => {
    fakeDb.message.findUnique.mockResolvedValue({
      id: MSG_ID,
      senderId: OTHER_ID, // message de l'autre
      conversationId: CONVO_ID,
      deletedAt: null,
    });
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(403);
    expect(fakeDb.message.update).not.toHaveBeenCalled();
  });

  it('renvoie 404 si le message appartient à une autre conversation', async () => {
    fakeDb.message.findUnique.mockResolvedValue({
      id: MSG_ID,
      senderId: ME_ID,
      conversationId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      deletedAt: null,
    });
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(404);
    expect(fakeDb.message.update).not.toHaveBeenCalled();
  });

  it('renvoie 404 si le message n’existe pas', async () => {
    fakeDb.message.findUnique.mockResolvedValue(null);
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(404);
    expect(fakeDb.message.update).not.toHaveBeenCalled();
  });

  it('renvoie 200 même si pusher.trigger jette (suppression déjà persistée)', async () => {
    mockTrigger.mockRejectedValue(new Error('Pusher 404 NOT FOUND'));
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(200);
    expect(fakeDb.message.update).toHaveBeenCalledOnce();
  });

  it('est idempotent : un message déjà supprimé renvoie 200 sans réécrire', async () => {
    fakeDb.message.findUnique.mockResolvedValue({
      id: MSG_ID,
      senderId: ME_ID,
      conversationId: CONVO_ID,
      deletedAt: new Date('2026-07-08T10:00:00Z'),
    });
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(200);
    expect(fakeDb.message.update).not.toHaveBeenCalled();
  });

  it('renvoie 401 si pas de session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(401);
    expect(fakeDb.message.update).not.toHaveBeenCalled();
  });

  it('renvoie 403 si l’utilisateur n’est pas participant de la conversation', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: STRANGER_ID } });
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(403);
    expect(fakeDb.message.update).not.toHaveBeenCalled();
  });

  it('renvoie 404 si la conversation n’existe pas', async () => {
    fakeDb.conversation.findUnique.mockResolvedValue(null);
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(404);
    expect(fakeDb.message.update).not.toHaveBeenCalled();
  });

  it('renvoie 500 si l’écriture en base échoue', async () => {
    fakeDb.message.update.mockRejectedValue(new Error('db down'));
    const res = await DELETE(deleteRequest(), makeParams());
    expect(res.status).toBe(500);
  });
});
