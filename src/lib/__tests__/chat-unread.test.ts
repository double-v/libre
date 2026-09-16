/**
 * Tests — messages non lus dérivés (#389, spec 003 § data-model).
 *
 * Le « non lu » n'est stocké nulle part : il se déduit de `readAt` (posé à
 * l'ouverture de la conversation). La fonction doit exclure ce que l'utilisateur
 * ne verrait de toute façon pas — ses propres messages, les messages supprimés,
 * ceux d'une personne bloquée (dans un sens ou l'autre) ou bannie — pour que la
 * pastille ne pointe jamais vers un message qui ne s'affichera pas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = {
  block: { findMany: vi.fn() },
  message: { findMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { unreadConversationIds } = await import('../chat-unread');

const ME = 'me-uuid';

describe('unreadConversationIds', () => {
  beforeEach(() => {
    fakeDb.block.findMany.mockReset().mockResolvedValue([]);
    fakeDb.message.findMany.mockReset().mockResolvedValue([]);
  });

  it('liste vide sans message non lu', async () => {
    await expect(unreadConversationIds(ME)).resolves.toEqual([]);
  });

  it('renvoie les identifiants de conversation, un seul par conversation', async () => {
    fakeDb.message.findMany.mockResolvedValue([{ conversationId: 'c1' }, { conversationId: 'c2' }]);
    await expect(unreadConversationIds(ME)).resolves.toEqual(['c1', 'c2']);
    const args = fakeDb.message.findMany.mock.calls[0][0];
    expect(args.distinct).toEqual(['conversationId']);
    expect(args.select).toEqual({ conversationId: true });
  });

  it("ne compte que les messages reçus, non lus, non supprimés, d'un expéditeur non banni, dans mes conversations", async () => {
    await unreadConversationIds(ME);
    const where = fakeDb.message.findMany.mock.calls[0][0].where;
    expect(where.readAt).toBeNull();
    expect(where.deletedAt).toBeNull();
    expect(where.senderId).toEqual(expect.objectContaining({ not: ME }));
    expect(where.sender).toEqual({ isBanned: false });
    expect(where.conversation).toEqual({ OR: [{ userA: ME }, { userB: ME }] });
  });

  it('exclut les expéditeurs bloqués par moi ET ceux qui me bloquent', async () => {
    fakeDb.block.findMany.mockResolvedValue([
      { blockerId: ME, blockedId: 'x' },
      { blockerId: 'y', blockedId: ME },
    ]);
    await unreadConversationIds(ME);
    expect(fakeDb.block.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ blockerId: ME }, { blockedId: ME }] } }),
    );
    const where = fakeDb.message.findMany.mock.calls[0][0].where;
    expect(where.senderId.notIn).toEqual(expect.arrayContaining(['x', 'y']));
    expect(where.senderId.notIn).toHaveLength(2);
  });

  it("sans blocage, ne pose pas de notIn vide qui pourrait être mal interprété", async () => {
    await unreadConversationIds(ME);
    const where = fakeDb.message.findMany.mock.calls[0][0].where;
    expect(where.senderId).toEqual({ not: ME });
  });
});
