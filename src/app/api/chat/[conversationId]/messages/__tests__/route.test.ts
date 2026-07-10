/**
 * Tests de non-régression — messagerie 1:1 (POST/GET /api/chat/[id]/messages).
 *
 * La messagerie est le cœur du lien entre utilisateurs : elle ne doit JAMAIS
 * tomber en panne silencieusement. Ce fichier verrouille les invariants du
 * flux d'envoi/lecture, notamment la régression prod qui a motivé sa création :
 *
 *   Bug prod : `pusher.trigger()` n'était pas encapsulé. Quand Pusher échouait
 *   (creds/quota/réseau), l'API renvoyait 500 ALORS QUE le message était déjà
 *   persisté en base — l'utilisateur voyait une erreur pour un message pourtant
 *   bien envoyé. La notif temps-réel est best-effort et ne doit pas faire
 *   échouer un envoi réussi.
 *
 * On mocke next-auth, @/lib/db (Prisma), @/lib/pusher et @/lib/rate-limit pour
 * tester la logique de la route sans DB/session/Pusher réels.
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
    findMany: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
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

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { message: { limit: 30, windowMs: 60_000 } },
}));

// Import après les mocks
const { GET, POST } = await import('../route');

// UUIDs réels (RFC 4122)
const ME_ID = '3a69ed48-0577-4bb9-88d9-d2154263db9b';
const OTHER_ID = 'e99f0fc5-211a-4b01-8603-b409be15adb4';
const STRANGER_ID = 'ba9eb471-46ec-4a5a-a38c-8e6c089b21bd';
const CONVO_ID = '0d6638d1-dba9-4002-81a2-5554c07530fb';

function makeParams(id = CONVO_ID) {
  return { params: Promise.resolve({ conversationId: id }) };
}

function postRequest(body: unknown, raw = false): NextRequest {
  return new NextRequest(`http://localhost/api/chat/${CONVO_ID}/messages`, {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Défauts « chemin heureux » — chaque test surcharge au besoin.
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 29, resetAt: Date.now() + 60_000 });
  fakeDb.conversation.findUnique.mockResolvedValue({ userA: ME_ID, userB: OTHER_ID });
  fakeDb.message.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'msg-generated-id',
    createdAt: new Date('2026-07-08T14:25:00Z'),
    readAt: null,
    ...data,
  }));
  mockTrigger.mockResolvedValue({ status: 200 });
});

// ─────────────────────────────────────────────────────────────────────────
// POST — envoi d'un message
// ─────────────────────────────────────────────────────────────────────────

describe('POST /api/chat/[conversationId]/messages', () => {
  it('persiste le message et renvoie 201 (chemin heureux)', async () => {
    const res = await POST(postRequest({ content: 'ciphertext-base64' }), makeParams());
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message.id).toBe('msg-generated-id');
    expect(fakeDb.message.create).toHaveBeenCalledWith({
      data: { conversationId: CONVO_ID, senderId: ME_ID, content: 'ciphertext-base64' },
    });
    expect(mockTrigger).toHaveBeenCalledWith(
      `private-chat-${CONVO_ID}`,
      'new-message',
      expect.objectContaining({ id: 'msg-generated-id', senderId: ME_ID }),
    );
  });

  // ★ RÉGRESSION PROD : une panne Pusher ne doit pas faire échouer un envoi.
  it('renvoie 201 même si pusher.trigger jette (message déjà persisté)', async () => {
    mockTrigger.mockRejectedValue(new Error('Pusher 404 NOT FOUND'));
    const res = await POST(postRequest({ content: 'ciphertext' }), makeParams());
    expect(res.status).toBe(201);
    // Le message a bien été écrit en base malgré l'échec Pusher.
    expect(fakeDb.message.create).toHaveBeenCalledOnce();
    const json = await res.json();
    expect(json.message.id).toBe('msg-generated-id');
  });

  it('ne notifie Pusher qu’APRÈS avoir persisté le message', async () => {
    const order: string[] = [];
    fakeDb.message.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      order.push('create');
      return { id: 'msg-generated-id', createdAt: new Date(), readAt: null, ...data };
    });
    mockTrigger.mockImplementation(async () => {
      order.push('trigger');
      return { status: 200 };
    });
    await POST(postRequest({ content: 'ciphertext' }), makeParams());
    expect(order).toEqual(['create', 'trigger']);
  });

  it('accepte un contenu chiffré long (> 1000 chars) — cap ciphertext', async () => {
    // Un clair de 1000 chars chiffré dépasse 1000 chars une fois base64. Le
    // schéma doit l'accepter, sinon 400 sur les messages longs légitimes.
    const longCiphertext = 'A'.repeat(1372);
    const res = await POST(postRequest({ content: longCiphertext }), makeParams());
    expect(res.status).toBe(201);
  });

  it('renvoie 401 si pas de session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(postRequest({ content: 'x' }), makeParams());
    expect(res.status).toBe(401);
    expect(fakeDb.message.create).not.toHaveBeenCalled();
  });

  it('renvoie 429 si rate-limité (et ne persiste rien)', async () => {
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const res = await POST(postRequest({ content: 'x' }), makeParams());
    expect(res.status).toBe(429);
    expect(fakeDb.message.create).not.toHaveBeenCalled();
  });

  it('renvoie 404 si la conversation n’existe pas', async () => {
    fakeDb.conversation.findUnique.mockResolvedValue(null);
    const res = await POST(postRequest({ content: 'x' }), makeParams());
    expect(res.status).toBe(404);
    expect(fakeDb.message.create).not.toHaveBeenCalled();
  });

  it('renvoie 403 si l’utilisateur n’est pas participant', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: STRANGER_ID } });
    const res = await POST(postRequest({ content: 'x' }), makeParams());
    expect(res.status).toBe(403);
    expect(fakeDb.message.create).not.toHaveBeenCalled();
  });

  it('renvoie 400 si contenu vide', async () => {
    const res = await POST(postRequest({ content: '' }), makeParams());
    expect(res.status).toBe(400);
    expect(fakeDb.message.create).not.toHaveBeenCalled();
  });

  it('renvoie 400 (pas 500) si le body JSON est malformé', async () => {
    const res = await POST(postRequest('pas du json', true), makeParams());
    expect(res.status).toBe(400);
    expect(fakeDb.message.create).not.toHaveBeenCalled();
  });

  it('renvoie 500 si l’écriture en base échoue', async () => {
    fakeDb.message.create.mockRejectedValue(new Error('db down'));
    const res = await POST(postRequest({ content: 'x' }), makeParams());
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// GET — lecture des messages
// ─────────────────────────────────────────────────────────────────────────

describe('GET /api/chat/[conversationId]/messages', () => {
  it('renvoie les messages en ordre chronologique et marque comme lus', async () => {
    fakeDb.message.findMany.mockResolvedValue([
      { id: 'm2', senderId: OTHER_ID, content: 'b', createdAt: new Date('2026-07-08T10:01:00Z') },
      { id: 'm1', senderId: ME_ID, content: 'a', createdAt: new Date('2026-07-08T10:00:00Z') },
    ]);
    fakeDb.message.updateMany.mockResolvedValue({ count: 1 });

    const res = await GET(new NextRequest(`http://localhost/x`), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messages.map((m: { id: string }) => m.id)).toEqual(['m1', 'm2']);
    // Marque comme lus uniquement les messages reçus (pas les siens).
    expect(fakeDb.message.updateMany).toHaveBeenCalledWith({
      where: { conversationId: CONVO_ID, senderId: { not: ME_ID }, readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('masque le contenu d’un message supprimé mais conserve deletedAt (#201)', async () => {
    const deletedAt = new Date('2026-07-08T10:05:00Z');
    fakeDb.message.findMany.mockResolvedValue([
      { id: 'm1', senderId: ME_ID, content: 'ciphertext-secret', createdAt: new Date('2026-07-08T10:00:00Z'), deletedAt },
    ]);
    fakeDb.message.updateMany.mockResolvedValue({ count: 0 });

    const res = await GET(new NextRequest('http://localhost/x'), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    // Le ciphertext n'est jamais renvoyé pour un message supprimé…
    expect(json.messages[0].content).toBe('');
    // …mais deletedAt reste présent pour que le client affiche le tombstone.
    expect(json.messages[0].deletedAt).toBeTruthy();
  });

  it('renvoie 401 si pas de session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/x'), makeParams());
    expect(res.status).toBe(401);
  });

  it('renvoie 403 si non-participant', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: STRANGER_ID } });
    const res = await GET(new NextRequest('http://localhost/x'), makeParams());
    expect(res.status).toBe(403);
  });

  it('renvoie 404 si conversation absente', async () => {
    fakeDb.conversation.findUnique.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/x'), makeParams());
    expect(res.status).toBe(404);
  });

  // ── Pagination par curseur (#200) ──────────────────────────────────────
  it('sans curseur : take=51 (défaut 50), pas de skip/cursor, nextCursor null si peu de messages', async () => {
    fakeDb.message.findMany.mockResolvedValue([
      { id: 'm2', senderId: OTHER_ID, content: 'b', createdAt: new Date('2026-07-08T10:01:00Z') },
      { id: 'm1', senderId: ME_ID, content: 'a', createdAt: new Date('2026-07-08T10:00:00Z') },
    ]);
    fakeDb.message.updateMany.mockResolvedValue({ count: 0 });

    const res = await GET(new NextRequest('http://localhost/x'), makeParams());
    const json = await res.json();
    expect(json.nextCursor).toBeNull();
    expect(fakeDb.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: CONVO_ID },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 51,
      }),
    );
    // Pas de pagination curseur au premier chargement.
    const call = fakeDb.message.findMany.mock.calls[0][0];
    expect(call.cursor).toBeUndefined();
    expect(call.skip).toBeUndefined();
  });

  it('avec ?cursor&limit : passe skip/cursor à Prisma et renvoie nextCursor quand il reste des plus anciens', async () => {
    // 3 lignes renvoyées pour limit=2 → il en reste → nextCursor = plus ancien de la page.
    fakeDb.message.findMany.mockResolvedValue([
      { id: 'm5', senderId: OTHER_ID, content: 'e', createdAt: new Date('2026-07-08T10:05:00Z') },
      { id: 'm4', senderId: ME_ID, content: 'd', createdAt: new Date('2026-07-08T10:04:00Z') },
      { id: 'm3', senderId: OTHER_ID, content: 'c', createdAt: new Date('2026-07-08T10:03:00Z') },
    ]);
    fakeDb.message.updateMany.mockResolvedValue({ count: 0 });

    const res = await GET(new NextRequest('http://localhost/x?cursor=m6&limit=2'), makeParams());
    const json = await res.json();
    // Page = 2 plus récents (desc [m5,m4]) renvoyés en ordre chrono → [m4,m5].
    expect(json.messages.map((m: { id: string }) => m.id)).toEqual(['m4', 'm5']);
    // nextCursor = plus ancien de la page (m4) pour continuer le scroll-up.
    expect(json.nextCursor).toBe('m4');
    expect(fakeDb.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3, skip: 1, cursor: { id: 'm6' } }),
    );
  });

  it('plafonne limit à 100 et le plancher à 1', async () => {
    fakeDb.message.findMany.mockResolvedValue([]);
    fakeDb.message.updateMany.mockResolvedValue({ count: 0 });

    await GET(new NextRequest('http://localhost/x?limit=9999'), makeParams());
    expect(fakeDb.message.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 101 }),
    );
    await GET(new NextRequest('http://localhost/x?limit=0'), makeParams());
    expect(fakeDb.message.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 2 }),
    );
  });
});
