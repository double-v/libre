/**
 * Tests d'intégration — Routes API du Cercle de Confiance.
 *
 * On mocke next-auth (auth session) et @/lib/db (Prisma) pour ne pas
 * avoir besoin d'une vraie DB ni d'un vrai cookie de session.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâches 1.3, 1.4, 1.5.
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

// Mock du Prisma client (fake en mémoire)
const fakeDb = {
  trustContact: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  getDb: () => fakeDb,
}));

// Imports après les mocks
const { GET, POST } = await import('../route');
const { DELETE } = await import('../[id]/route');

// UUIDs v4 réels (cf. Zod uuid() : respecte la variante RFC 4122)
const ALICE_ID = '01e270b8-84ba-47f0-9d0a-30a03c983c71';
const BOB_ID = 'ba9eb471-46ec-4a5a-a38c-8e6c089b21bd';
const TRUST_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/circle/contacts', () => {
  it('retourne 401 si pas de session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('retourne 401 si session sans user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('retourne la liste vide si pas de contacts', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.trustContact.findMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.contacts).toEqual([]);
  });

  it('retourne les contacts avec avatar (première photo)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.trustContact.findMany.mockResolvedValue([
      {
        id: TRUST_ID,
        createdAt: new Date('2026-06-08T10:00:00Z'),
        contact: {
          id: BOB_ID,
          displayName: 'Bob',
          isVerified: true,
          lastActive: new Date('2026-06-08T09:00:00Z'),
          profile: { photos: ['https://example.com/bob.jpg', 'https://example.com/bob2.jpg'] },
        },
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.contacts).toHaveLength(1);
    expect(json.contacts[0].contact.avatarUrl).toBe('https://example.com/bob.jpg');
    expect(json.contacts[0].contact.displayName).toBe('Bob');
  });

  it('avatarUrl null si pas de profile ou photos vides', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.trustContact.findMany.mockResolvedValue([
      {
        id: TRUST_ID,
        createdAt: new Date('2026-06-08T10:00:00Z'),
        contact: {
          id: BOB_ID,
          displayName: 'Bob',
          isVerified: false,
          lastActive: new Date('2026-06-08T09:00:00Z'),
          profile: null,
        },
      },
    ]);
    const res = await GET();
    const json = await res.json();
    expect(json.contacts[0].contact.avatarUrl).toBeNull();
  });
});

describe('POST /api/circle/contacts', () => {
  function makeRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/circle/contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  it('retourne 401 si pas de session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ contactId: BOB_ID }));
    expect(res.status).toBe(401);
  });

  it('retourne 400 si body invalide (JSON mal formé)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    const req = new NextRequest('http://localhost/api/circle/contacts', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('retourne 400 si contactId manquant', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('retourne 400 si contactId n\'est pas un UUID', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    const res = await POST(makeRequest({ contactId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('retourne 400 si auto-désignation', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    const res = await POST(makeRequest({ contactId: ALICE_ID }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/toi-même/);
  });

  it('retourne 404 si contact inexistant', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.user.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ contactId: BOB_ID }));
    expect(res.status).toBe(404);
  });

  it('retourne 422 si contact banni', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.user.findUnique.mockResolvedValue({
      id: BOB_ID,
      isBanned: true,
      squareBannedUntil: null,
    });
    const res = await POST(makeRequest({ contactId: BOB_ID }));
    expect(res.status).toBe(422);
  });

  it('retourne 409 si contact déjà dans le cercle', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.user.findUnique.mockResolvedValue({
      id: BOB_ID,
      isBanned: false,
      squareBannedUntil: null,
    });
    fakeDb.trustContact.findUnique.mockResolvedValue({ id: TRUST_ID });
    const res = await POST(makeRequest({ contactId: BOB_ID }));
    expect(res.status).toBe(409);
  });

  it('retourne 409 si limite de 5 contacts atteinte', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.user.findUnique.mockResolvedValue({
      id: BOB_ID,
      isBanned: false,
      squareBannedUntil: null,
    });
    fakeDb.trustContact.findUnique.mockResolvedValue(null);
    fakeDb.trustContact.count.mockResolvedValue(5);
    const res = await POST(makeRequest({ contactId: BOB_ID }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/5 contacts/);
  });

  it('retourne 201 et le contact créé en cas de succès', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.user.findUnique.mockResolvedValue({
      id: BOB_ID,
      isBanned: false,
      squareBannedUntil: null,
    });
    fakeDb.trustContact.findUnique.mockResolvedValue(null);
    fakeDb.trustContact.count.mockResolvedValue(0);
    fakeDb.trustContact.create.mockResolvedValue({
      id: TRUST_ID,
      createdAt: new Date('2026-06-08T10:00:00Z'),
      contact: {
        id: BOB_ID,
        displayName: 'Bob',
        isVerified: true,
        lastActive: new Date('2026-06-08T09:00:00Z'),
        profile: { photos: ['https://example.com/bob.jpg'] },
      },
    });
    const res = await POST(makeRequest({ contactId: BOB_ID }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.contact.displayName).toBe('Bob');
    expect(json.contact.avatarUrl).toBe('https://example.com/bob.jpg');
  });

  it('rejette les champs V2 (contactEmail) — V1 Libre-only', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    const res = await POST(
      makeRequest({ contactId: BOB_ID, contactEmail: 'evil@x.com' }),
    );
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/circle/contacts/:id', () => {
  function makeRequest(id: string) {
    // Le handler signe (request, { params }) — on doit passer un params
    // qui résout en Promise (cf. Next 15+)
    return DELETE(new Request('http://localhost/x'), {
      params: Promise.resolve({ id }),
    });
  }

  it('retourne 401 si pas de session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await makeRequest(TRUST_ID);
    expect(res.status).toBe(401);
  });

  it('retourne 404 si id n\'est pas un UUID', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    const res = await makeRequest('not-a-uuid');
    expect(res.status).toBe(404);
  });

  it('retourne 404 si le contact n\'appartient pas au user (anti-leak)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.trustContact.findFirst.mockResolvedValue(null);
    const res = await makeRequest(TRUST_ID);
    expect(res.status).toBe(404);
  });

  it('retourne 204 et supprime si owner', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
    fakeDb.trustContact.findFirst.mockResolvedValue({ id: TRUST_ID });
    fakeDb.trustContact.delete.mockResolvedValue({ id: TRUST_ID });
    const res = await makeRequest(TRUST_ID);
    expect(res.status).toBe(204);
    expect(fakeDb.trustContact.delete).toHaveBeenCalledWith({
      where: { id: TRUST_ID },
    });
  });
});
