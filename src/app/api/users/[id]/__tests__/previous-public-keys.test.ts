// @vitest-environment node
/**
 * #340 — après une réinitialisation, le pair doit pouvoir relire ce qu'il
 * avait chiffré pour l'ancienne clé : la fiche expose les publiques
 * remplacées, de la plus récente à la plus ancienne, et rien de plus.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { findUnique: vi.fn() },
  match: { findFirst: vi.fn() },
  profile: { findUnique: vi.fn() },
  photoModeration: { findMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('../route');

const ME_ID = randomUUID();
const OTHER_ID = randomUUID();

function utilisateur(userKeyHistory: { publicKey: string }[]) {
  return {
    id: OTHER_ID,
    displayName: 'Camille',
    isVerified: false,
    lastActive: new Date(),
    isBanned: false,
    profile: null,
    userKey: { publicKey: 'PUB_COURANTE' },
    userKeyHistory,
  };
}

const lire = () =>
  GET(new Request(`http://localhost/api/users/${OTHER_ID}`), {
    params: Promise.resolve({ id: OTHER_ID }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  fakeDb.match.findFirst.mockResolvedValue(null);
  fakeDb.profile.findUnique.mockResolvedValue({ photoSensitivityOptIn: 'none' });
  fakeDb.photoModeration.findMany.mockResolvedValue([]);
});

describe('GET /api/users/[id] — anciennes clés publiques', () => {
  it('expose les publiques remplacées dans l’ordre rendu par la base', async () => {
    fakeDb.user.findUnique.mockResolvedValue(
      utilisateur([{ publicKey: 'PUB_HIER' }, { publicKey: 'PUB_AVANT_HIER' }]),
    );
    const body = await (await lire()).json();
    expect(body.publicKey).toBe('PUB_COURANTE');
    expect(body.previousPublicKeys).toEqual(['PUB_HIER', 'PUB_AVANT_HIER']);
  });

  it('omet le champ quand rien n’a été remplacé — le cas courant', async () => {
    fakeDb.user.findUnique.mockResolvedValue(utilisateur([]));
    const body = await (await lire()).json();
    expect(body).not.toHaveProperty('previousPublicKeys');
  });
});
