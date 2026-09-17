/**
 * Tests — GET /api/chat/unread (#389, contrat specs/003 contracts/api.md).
 *
 * Renvoie les conversations avec au moins un message non lu, sous forme
 * d'identifiants — jamais un compte (charte : aucun chiffre côté membre).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ __esModule: true, authOptions: {} }));

const mockUnread = vi.fn();
vi.mock('@/lib/chat-unread', () => ({ __esModule: true, unreadConversationIds: mockUnread }));

const { GET } = await import('../route');

describe('GET /api/chat/unread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'me' } });
    mockUnread.mockResolvedValue(['c1', 'c2']);
  });

  it('401 sans session, sans toucher la base', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockUnread).not.toHaveBeenCalled();
  });

  it('200 avec les identifiants de conversation de la personne connectée', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockUnread).toHaveBeenCalledWith('me');
    await expect(res.json()).resolves.toEqual({ conversationIds: ['c1', 'c2'] });
  });

  it("n'expose aucun compte", async () => {
    const json = await (await GET()).json();
    expect(Object.keys(json)).toEqual(['conversationIds']);
  });

  it('500 propre si la base échoue', async () => {
    mockUnread.mockRejectedValue(new Error('db down'));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
