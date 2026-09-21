/**
 * PUT/GET /api/users/profile — extension « ville » (#405/#407, spec 004),
 * contrat `contracts/profile-city.md`.
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
  profile: { upsert: vi.fn() },
  consent: { findFirst: vi.fn(async () => null) },
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

const saintDenis = { label: 'Saint-Denis', qualifier: '93, Seine-Saint-Denis', country: 'France', lat: 48.937483, lng: 2.361503 };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  fakeDb.profile.upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({ userId: ME_ID, ...update }));
});

describe('PUT /api/users/profile — city', () => {
  it('écrit la position arrondie, la source « city » et le libellé privé', async () => {
    const res = await put({ city: saintDenis });
    expect(res.status).toBe(200);
    const { update, create } = fakeDb.profile.upsert.mock.calls[0][0];
    for (const data of [update, create]) {
      expect(data.lastKnownLat).toBe(48.94);
      expect(data.lastKnownLng).toBe(2.36);
      expect(data.lastGeolocAt).toBeInstanceOf(Date);
      expect(data.positionSource).toBe('city');
      expect(data.cityLabel).toBe('Saint-Denis (93)');
    }
  });

  it('city: null retire tout (position, date, source, libellé)', async () => {
    await put({ city: null });
    const { update } = fakeDb.profile.upsert.mock.calls[0][0];
    expect(update).toMatchObject({ lastKnownLat: 0, lastKnownLng: 0, lastGeolocAt: null, positionSource: null, cityLabel: null });
  });

  it('sans city, aucun de ces champs n’est touché (une autre édition n’efface pas la ville)', async () => {
    await put({ bio: 'Salut' });
    const { update } = fakeDb.profile.upsert.mock.calls[0][0];
    expect(update).toEqual({ bio: 'Salut' });
  });

  it('400 hors bornes ou champ manquant', async () => {
    expect((await put({ city: { ...saintDenis, lat: 91 } })).status).toBe(400);
    expect((await put({ city: { ...saintDenis, lng: -181 } })).status).toBe(400);
    expect((await put({ city: { ...saintDenis, label: '' } })).status).toBe(400);
    expect((await put({ city: { label: 'X', lat: 1, lng: 1 } })).status).toBe(400);
    expect(fakeDb.profile.upsert).not.toHaveBeenCalled();
  });

  it('deux saisies successives sont toutes deux écrites : pas de throttle (#407)', async () => {
    await put({ city: saintDenis });
    await put({ city: { ...saintDenis, label: 'Lyon', qualifier: '69, Rhône', lat: 45.76, lng: 4.83 } });
    expect(fakeDb.profile.upsert).toHaveBeenCalledTimes(2);
    expect(fakeDb.profile.upsert.mock.calls[1][0].update.cityLabel).toBe('Lyon (69)');
  });
});

describe('GET /api/users/profile — lecture privée', () => {
  it('renvoie positionSource et cityLabel à la membre elle-même', async () => {
    fakeDb.user.findUnique.mockResolvedValue({
      displayName: 'Moi',
      isVerified: false,
      profile: { userId: ME_ID, photos: [], positionSource: 'city', cityLabel: 'Saint-Denis (93)' },
    });
    const body = await (await GET()).json();
    expect(body.profile.positionSource).toBe('city');
    expect(body.profile.cityLabel).toBe('Saint-Denis (93)');
  });
});
