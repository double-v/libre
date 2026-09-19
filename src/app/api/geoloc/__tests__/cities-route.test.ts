/**
 * GET /api/geoloc/cities (#405, spec 004) — contrat `contracts/cities-search.md`.
 * La logique de géocodage est testée ailleurs ; ici : session, bornes de `q`,
 * rate limit, mapping des erreurs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { cities: { limit: 30, windowMs: 60_000 } },
}));

const mockSearchCities = vi.fn();
vi.mock('@/lib/geocoding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/geocoding')>();
  return { ...actual, searchCities: mockSearchCities };
});

const { GET } = await import('../cities/route');
const { GeocodingUnavailable } = await import('@/lib/geocoding');

const ME_ID = randomUUID();
const req = (q: string) => GET(new NextRequest(`http://localhost/api/geoloc/cities?q=${encodeURIComponent(q)}`));
const lyon = { label: 'Lyon', qualifier: '69, Rhône', country: 'France', lat: 45.76, lng: 4.83 };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 29, resetAt: Date.now() + 60_000 });
  mockSearchCities.mockResolvedValue([lyon]);
});

describe('GET /api/geoloc/cities', () => {
  it('401 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await req('lyon')).status).toBe(401);
    expect(mockSearchCities).not.toHaveBeenCalled();
  });

  it('q < 3 caractères → liste vide, sans appel sortant ni consommation du quota', async () => {
    const res = await req('ly');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cities: [] });
    expect(mockSearchCities).not.toHaveBeenCalled();
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it('q > 80 caractères → 400', async () => {
    expect((await req('a'.repeat(81))).status).toBe(400);
    expect(mockSearchCities).not.toHaveBeenCalled();
  });

  it('429 quand le quota par membre est épuisé, clé « cities:<userId> »', async () => {
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, resetAt: Date.now() + 1000 });
    expect((await req('lyon')).status).toBe(429);
    expect(mockRateLimit.mock.calls[0][0]).toBe(`cities:${ME_ID}`);
    expect(mockSearchCities).not.toHaveBeenCalled();
  });

  it('503 geocoding_unavailable quand les deux services amont échouent', async () => {
    mockSearchCities.mockRejectedValue(new GeocodingUnavailable());
    const res = await req('lyon');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'geocoding_unavailable' });
  });

  it('200 avec les candidats, et rien d’autre que les cinq champs du contrat', async () => {
    mockSearchCities.mockResolvedValue([{ ...lyon, postcode: '69000', osmId: 42 }]);
    const res = await req('  Lyon ');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cities: [lyon] });
    expect(mockSearchCities.mock.calls[0][0]).toBe('Lyon');
  });
});
