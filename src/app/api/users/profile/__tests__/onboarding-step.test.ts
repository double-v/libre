/**
 * PUT/GET /api/users/profile — avancement du parcours d'accueil (spec 005),
 * contrat `contracts/profile-onboarding.md` : la membre lit son étape, le
 * serveur écrit le max (un onglet en retard ne fait jamais reculer), et
 * une valeur hors 0..3 est refusée.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { findUnique: vi.fn() },
  profile: { upsert: vi.fn(), findUnique: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('@/lib/photo-veil', () => ({ __esModule: true, photoSensitivityMap: vi.fn(async () => ({})) }));

const { GET, PUT } = await import('../route');

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

describe('PUT /api/users/profile — onboardingStep', () => {
  it('avance de 1 à 2', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({ onboardingStep: 1 });
    const res = await put({ onboardingStep: 2 });
    expect(res.status).toBe(200);
    const { update, create } = fakeDb.profile.upsert.mock.calls[0][0];
    expect(update.onboardingStep).toBe(2);
    expect(create.onboardingStep).toBe(2);
  });

  it('ne recule jamais : demander 1 quand on est à 2 garde 2', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({ onboardingStep: 2 });
    await put({ onboardingStep: 1 });
    expect(fakeDb.profile.upsert.mock.calls[0][0].update.onboardingStep).toBe(2);
  });

  it('sans profil existant, la valeur demandée est prise telle quelle', async () => {
    fakeDb.profile.findUnique.mockResolvedValue(null);
    await put({ onboardingStep: 1 });
    expect(fakeDb.profile.upsert.mock.calls[0][0].update.onboardingStep).toBe(1);
  });

  it('refuse une étape hors 0..3', async () => {
    expect((await put({ onboardingStep: 4 })).status).toBe(400);
    expect((await put({ onboardingStep: -1 })).status).toBe(400);
    expect(fakeDb.profile.upsert).not.toHaveBeenCalled();
  });

  it('sans onboardingStep dans le corps, ne lit ni n’écrit l’avancement', async () => {
    await put({ bio: 'salut' });
    expect(fakeDb.profile.findUnique).not.toHaveBeenCalled();
    expect(fakeDb.profile.upsert.mock.calls[0][0].update).not.toHaveProperty('onboardingStep');
  });
});

describe('GET /api/users/profile — onboardingStep', () => {
  it('renvoie l’étape à la membre', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      displayName: 'Noor', isVerified: false,
      profile: { userId: ME_ID, photos: [], onboardingStep: 2 },
    });
    const res = await GET();
    const json = await res.json();
    expect(json.profile.onboardingStep).toBe(2);
  });
});
