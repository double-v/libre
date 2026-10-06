/** POST /api/blocks — spec 010 : le blocage planifie l'examen des blocages en rafale. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
const fakeDb = {
  block: { findUnique: vi.fn(), create: vi.fn() },
  match: { deleteMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const verifierBlocages = vi.fn();
vi.mock('@/lib/fraude/comportement', () => ({ verifierBlocages }));
let taches: Promise<unknown>[] = [];
vi.mock('next/server', async (importOriginal) => {
  const orig = await importOriginal<typeof import('next/server')>();
  return { ...orig, after: (task: () => unknown) => { taches.push(Promise.resolve().then(task)); } };
});

const { POST } = await import('../route');
const ME = randomUUID();
const OTHER = randomUUID();
const req = (blockedId: string) =>
  new Request('http://localhost/api/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blockedId }) });

beforeEach(() => {
  vi.clearAllMocks();
  taches = [];
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
  fakeDb.block.findUnique.mockResolvedValue(null);
});

describe('POST /api/blocks', () => {
  it('bloque, puis examine les blocages reçus par la personne bloquée', async () => {
    const res = await POST(req(OTHER));
    expect(res.status).toBe(201);
    await Promise.all(taches);
    expect(verifierBlocages).toHaveBeenCalledWith(OTHER);
  });

  it('un blocage déjà existant ne relance rien', async () => {
    fakeDb.block.findUnique.mockResolvedValue({ blockerId: ME, blockedId: OTHER });
    const res = await POST(req(OTHER));
    expect(res.status).toBe(409);
    expect(taches).toHaveLength(0);
  });
});
