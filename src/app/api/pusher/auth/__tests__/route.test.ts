/**
 * Tests unitaires — src/app/api/pusher/auth/route.ts
 *
 * Vérifie (issue #152 — Pusher security) :
 * - 401 sans session
 * - 403 si l'utilisateur n'est pas participant de la conversation
 * - 200 si l'utilisateur est participant (match en DB)
 * - 429 si rate limit dépassé
 *
 * On mocke next-auth (getServerSession), @/lib/db (getDb),
 * @/lib/pusher (pusher.authorizeChannel) et @/lib/rate-limit (rateLimit).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---

const mockGetServerSession = vi.fn();
const mockAuthorizeChannel = vi.fn();
const mockConversationFindUnique = vi.fn();
const mockRateLimit = vi.fn();

vi.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@/lib/auth', () => ({
  __esModule: true,
  authOptions: {},
}));

vi.mock('@/lib/pusher', () => ({
  __esModule: true,
  pusher: {
    authorizeChannel: (...args: unknown[]) => mockAuthorizeChannel(...args),
  },
}));

vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => ({
    conversation: {
      findUnique: (...args: unknown[]) => mockConversationFindUnique(...args),
    },
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  limits: { api: { limit: 60, windowMs: 60_000 } },
}));

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
  // Par défaut : rate limit OK
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  // Par défaut : authorizeChannel renvoie une réponse valide
  mockAuthorizeChannel.mockReturnValue({ auth: 'signed-auth-string' });
});

afterEach(() => {
  vi.resetModules();
});

// Helper : crée une Request formData avec socket_id + channel_name
function makeAuthRequest(channelName: string, socketId = 'socket-12345'): Request {
  const formData = new FormData();
  formData.append('socket_id', socketId);
  formData.append('channel_name', channelName);
  return new Request('https://test.local/api/pusher/auth', {
    method: 'POST',
    body: formData,
  });
}

// --- Tests ---

describe('POST /api/pusher/auth', () => {
  it('renvoie 401 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('private-chat-conv-1'));

    expect(res.status).toBe(401);
    expect(mockConversationFindUnique).not.toHaveBeenCalled();
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it("renvoie 403 si l utilisateur n est pas participant de la conversation", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } });
    mockConversationFindUnique.mockResolvedValue({
      id: 'conv-1',
      userA: 'user-X',
      userB: 'user-Y',
    });

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('private-chat-conv-1'));

    expect(res.status).toBe(403);
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it('renvoie 200 si l utilisateur est participant (userA)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } });
    mockConversationFindUnique.mockResolvedValue({
      id: 'conv-1',
      userA: 'user-A',
      userB: 'user-B',
    });

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('private-chat-conv-1'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    const body = await res.json();
    expect(body.auth).toBe('signed-auth-string');
    expect(mockAuthorizeChannel).toHaveBeenCalledWith('socket-12345', 'private-chat-conv-1');
  });

  it('renvoie 200 si l utilisateur est participant (userB)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-B' } });
    mockConversationFindUnique.mockResolvedValue({
      id: 'conv-1',
      userA: 'user-A',
      userB: 'user-B',
    });

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('private-chat-conv-1'));

    expect(res.status).toBe(200);
    expect(mockAuthorizeChannel).toHaveBeenCalledWith('socket-12345', 'private-chat-conv-1');
  });

  it('renvoie 429 si rate limit depasse', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } });
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 60_000 });

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('private-chat-conv-1'));

    expect(res.status).toBe(429);
    expect(mockConversationFindUnique).not.toHaveBeenCalled();
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it("renvoie 403 pour un canal private-user d un autre utilisateur", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } });

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('private-user-user-B'));

    expect(res.status).toBe(403);
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it('renvoie 200 pour son propre canal private-user', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } });

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('private-user-user-A'));

    expect(res.status).toBe(200);
    expect(mockAuthorizeChannel).toHaveBeenCalledWith('socket-12345', 'private-user-user-A');
  });

  it('renvoie 403 pour un canal non reconnu', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } });

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('public-something'));

    expect(res.status).toBe(403);
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it('renvoie 404 si la conversation n existe pas', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-A' } });
    mockConversationFindUnique.mockResolvedValue(null);

    const { POST } = await import('../route');
    const res = await POST(makeAuthRequest('private-chat-nonexistent'));

    expect(res.status).toBe(404);
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });
});