// @vitest-environment node
/**
 * POST /api/users/photos — analyse de la photo après la réponse (spec 006,
 * #443, research R6) : planifiée dans `after()`, avec le tampon déjà en
 * mémoire, et sans rien changer à la réponse faite au membre.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const taches: Array<() => unknown> = [];
vi.mock('next/server', async (importOriginal) => {
  const orig = await importOriginal<typeof import('next/server')>();
  return { ...orig, after: (t: () => unknown) => void taches.push(t) };
});

vi.mock('@/lib/r2', () => ({
  __esModule: true,
  uploadPhoto: vi.fn(async () => 'photos/u/1.webp'),
  deletePhoto: vi.fn(),
  isR2Configured: () => true,
  generateBlurredDerivative: vi.fn(),
}));

const fakeDb = {
  profile: { findUnique: vi.fn(async () => ({ photos: [] })), upsert: vi.fn(async () => ({ photos: ['photos/u/1.webp'] })) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 }),
  limits: { api: { limit: 60, windowMs: 60_000 } },
}));

const analyserPhoto = vi.fn();
vi.mock('@/lib/fraude/analyse', () => ({ __esModule: true, analyserPhoto }));

const { POST } = await import('../route');
const ME = randomUUID();

function envoi() {
  const form = new FormData();
  form.append('photo', new File([Buffer.from('octets-image')], 'p.jpg', { type: 'image/jpeg' }));
  return POST(new Request('http://localhost/api/users/photos', { method: 'POST', body: form }));
}

beforeEach(() => {
  vi.clearAllMocks();
  taches.length = 0;
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
});

describe('POST /api/users/photos — analyse après envoi (#443)', () => {
  it('planifie l’analyse après la réponse, avec le tampon de la photo', async () => {
    const res = await envoi();
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ photo: 'photos/u/1.webp', photos: ['photos/u/1.webp'] });
    // Rien n'a tourné pendant la requête.
    expect(analyserPhoto).not.toHaveBeenCalled();
    expect(taches).toHaveLength(1);
    await taches[0]();
    expect(analyserPhoto).toHaveBeenCalledWith({ userId: ME, photoKey: 'photos/u/1.webp', buffer: Buffer.from('octets-image') });
  });

  it('une analyse qui échoue ne change pas la réponse', async () => {
    analyserPhoto.mockRejectedValue(new Error('boom'));
    const res = await envoi();
    expect(res.status).toBe(201);
    await expect(Promise.resolve().then(() => taches[0]())).resolves.toBeUndefined();
  });
});
