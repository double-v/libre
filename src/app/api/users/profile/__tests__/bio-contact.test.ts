/**
 * PUT /api/users/profile — contact externe dans la bio (spec 006, #443,
 * FR-020) : un contact fort refuse l'écriture et le dit, en montrant le
 * passage ; un contact faible passe mais laisse un signal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  profile: { upsert: vi.fn(), findUnique: vi.fn(async () => null) },
  consent: { findFirst: vi.fn(async () => null) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('@/lib/photo-veil', () => ({ __esModule: true, photoSensitivityMap: vi.fn(async () => ({})) }));
const enregistrerSignal = vi.fn(async () => true);
vi.mock('@/lib/fraude/signaux', () => ({ __esModule: true, enregistrerSignal }));

const { PUT } = await import('../route');

const ME_ID = randomUUID();
const put = (body: unknown) =>
  PUT(new Request('http://localhost/api/users/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  fakeDb.profile.upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({ userId: ME_ID, ...update }));
});

describe('PUT /api/users/profile — contact externe dans la bio (#443)', () => {
  it('refuse un contact fort, montre le passage, et lève un signal fort', async () => {
    const res = await put({ bio: 'Coucou, écris-moi sur t.me/xyz pour la suite.' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Les contacts se partagent dans la messagerie, une fois le match fait.');
    expect(body.extrait).toBe('t.me/xyz');
    expect(fakeDb.profile.upsert).not.toHaveBeenCalled();
    expect(enregistrerSignal).toHaveBeenCalledWith(
      expect.objectContaining({ userId: ME_ID, type: 'contact_bio', force: 'fort', extrait: 't.me/xyz' }),
    );
  });

  it('laisse passer un contact faible, avec un signal faible', async () => {
    const res = await put({ bio: "Je n'ai pas Telegram, on parle ici." });
    expect(res.status).toBe(200);
    expect(fakeDb.profile.upsert).toHaveBeenCalled();
    expect(enregistrerSignal).toHaveBeenCalledWith(expect.objectContaining({ type: 'contact_bio', force: 'faible' }));
  });

  it('ne signale rien sur une bio ordinaire', async () => {
    const res = await put({ bio: "J'aime la randonnée et le cinéma." });
    expect(res.status).toBe(200);
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });
});
