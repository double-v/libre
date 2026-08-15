/**
 * Tests de non-régression — les pratiques ne fuitent plus sur la fiche (#328).
 *
 * `/api/users/[id]` alimente `ProfileModal`, ouvert depuis le feed sur des
 * profils non matchés : c'est l'autre moitié de la fuite corrigée ici.
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
  match: { findFirst: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('../route');

const ME_ID = randomUUID();
const OTHER_ID = randomUUID();

function userWith(visibility: string, id = OTHER_ID) {
  return {
    id,
    displayName: 'Camille',
    isVerified: false,
    lastActive: new Date(),
    isBanned: false,
    profile: {
      bio: 'Salut',
      birthDate: new Date('1994-01-01'),
      genderIdentity: 'femme',
      orientation: ['bi'],
      relationshipType: ['libre'],
      interests: ['Randonnée'],
      practices: ['Massage', 'Slow sex'],
      practicesVisibility: visibility,
      photos: [],
      invisibleMode: false,
    },
    userKey: null,
  };
}

function request(id: string) {
  return GET(new Request(`http://localhost/api/users/${id}`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  fakeDb.match.findFirst.mockResolvedValue(null);
});

describe('GET /api/users/[id] — pratiques (#328)', () => {
  it('ne renvoie pas les pratiques d\'un profil « matches » à un non-match', async () => {
    fakeDb.user.findUnique.mockResolvedValue(userWith('matches'));

    const res = await request(OTHER_ID);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty('practices');
    expect(JSON.stringify(body)).not.toContain('Massage');
    expect(body.interests).toEqual(['Randonnée']);
  });

  it('renvoie les pratiques à un match', async () => {
    fakeDb.user.findUnique.mockResolvedValue(userWith('matches'));
    fakeDb.match.findFirst.mockResolvedValue({ id: randomUUID() });

    const body = await (await request(OTHER_ID)).json();

    expect(body.practices).toEqual(['Massage', 'Slow sex']);
  });

  it('renvoie les pratiques d\'un profil « public » sans interroger les matches', async () => {
    fakeDb.user.findUnique.mockResolvedValue(userWith('public'));

    const body = await (await request(OTHER_ID)).json();

    expect(body.practices).toEqual(['Massage', 'Slow sex']);
  });

  it('renvoie toujours ses propres pratiques, et sans requête de match', async () => {
    fakeDb.user.findUnique.mockResolvedValue(userWith('matches', ME_ID));

    const body = await (await request(ME_ID)).json();

    expect(body.practices).toEqual(['Massage', 'Slow sex']);
    expect(fakeDb.match.findFirst).not.toHaveBeenCalled();
  });

  it('ferme sur une valeur de visibilité inconnue', async () => {
    fakeDb.user.findUnique.mockResolvedValue(userWith('nimportequoi'));

    const body = await (await request(OTHER_ID)).json();

    expect(body).not.toHaveProperty('practices');
  });
});
