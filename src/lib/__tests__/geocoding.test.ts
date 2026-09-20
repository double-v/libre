/**
 * Géocodage des villes (#402, spec 004) — la logique pure, `fetch` mocké.
 *
 * Ce qu'on protège : la spec exige qu'une homonymie soit toujours qualifiée
 * (SC-005), que la France passe d'abord, et qu'un service amont en panne ne
 * fasse pas tomber l'autre (FR-009).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parseIgn,
  parsePhoton,
  mergeCandidates,
  formatCityLabel,
  searchCities,
  GeocodingUnavailable,
  type CityCandidate,
  type FetchLike,
} from '@/lib/geocoding';

type AnyFeature = { type: string; properties: Record<string, unknown>; geometry: { type: string; coordinates: number[] } | null };

const ignFeature = (city: string, context: string, lng: number, lat: number): AnyFeature => ({
  type: 'Feature',
  properties: { label: city, city, context, type: 'municipality', name: city, postcode: '00000' },
  geometry: { type: 'Point', coordinates: [lng, lat] },
});

const photonFeature = (name: string, country: string, state: string | undefined, lng: number, lat: number): AnyFeature => ({
  type: 'Feature',
  properties: { name, country, state, osm_value: 'city', type: 'city' },
  geometry: { type: 'Point', coordinates: [lng, lat] },
});

describe('parseIgn', () => {
  it('tire le qualificatif « numéro, département » de context', () => {
    const [c] = parseIgn({
      features: [ignFeature('Saint-Denis', '93, Seine-Saint-Denis, Île-de-France', 2.361503, 48.937483)],
    });
    expect(c).toEqual({
      label: 'Saint-Denis',
      qualifier: '93, Seine-Saint-Denis',
      country: 'France',
      lat: 48.937483,
      lng: 2.361503,
    });
  });

  it('ignore ce qui n’est pas une commune ou n’a pas de coordonnées', () => {
    const out = parseIgn({
      features: [
        { ...ignFeature('Rue X', '75, Paris', 2.3, 48.8), properties: { label: 'Rue X', type: 'street', context: '75, Paris' } },
        { type: 'Feature', properties: { city: 'Nulle', type: 'municipality', context: '' }, geometry: null } as AnyFeature,
      ],
    });
    expect(out).toEqual([]);
  });
});

describe('parsePhoton', () => {
  it('prend state comme qualificatif et exclut la France (déjà servie par l’IGN)', () => {
    const out = parsePhoton({
      features: [
        photonFeature('Bruxelles', 'Belgique', 'Bruxelles-Capitale', 4.352493, 50.8467372),
        photonFeature('Lyon', 'France', 'Auvergne-Rhône-Alpes', 4.83, 45.76),
        photonFeature('Genève', 'Suisse', undefined, 6.14, 46.2),
      ],
    });
    expect(out.map((c) => [c.label, c.qualifier, c.country])).toEqual([
      ['Bruxelles', 'Bruxelles-Capitale', 'Belgique'],
      ['Genève', '', 'Suisse'],
    ]);
  });
});

describe('mergeCandidates', () => {
  const fr: CityCandidate = { label: 'Paris', qualifier: '75, Paris', country: 'France', lat: 48.85, lng: 2.35 };
  const tx: CityCandidate = { label: 'Paris', qualifier: 'Texas', country: 'États-Unis', lat: 33.66, lng: -95.55 };

  it('met la France d’abord, dédoublonne (label, qualifier, country) et plafonne à 5', () => {
    const world = [tx, { ...tx }, ...Array.from({ length: 6 }, (_, i) => ({ ...tx, qualifier: `q${i}` }))];
    const out = mergeCandidates([fr, { ...fr }], world);
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual(fr);
    expect(out[1]).toEqual(tx);
    expect(new Set(out.map((c) => `${c.label}|${c.qualifier}|${c.country}`)).size).toBe(5);
  });
});

describe('formatCityLabel', () => {
  it('« Lyon (69) » pour la France, « Bruxelles, Belgique » ailleurs', () => {
    expect(formatCityLabel({ label: 'Lyon', qualifier: '69, Rhône', country: 'France', lat: 0, lng: 0 })).toBe('Lyon (69)');
    expect(formatCityLabel({ label: 'Bruxelles', qualifier: 'Bruxelles-Capitale', country: 'Belgique', lat: 0, lng: 0 })).toBe('Bruxelles, Belgique');
  });

  it('tient dans 80 caractères', () => {
    const long = formatCityLabel({ label: 'A'.repeat(70), qualifier: '', country: 'B'.repeat(30), lat: 0, lng: 0 });
    expect(long.length).toBeLessThanOrEqual(80);
  });
});

describe('searchCities', () => {
  const okJson = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  // Typé comme fetch pour que `mock.calls[n][1]` (les options) soit lisible.
  const fetchMock = (impl: (url: string) => Promise<Response>) => vi.fn<FetchLike>().mockImplementation(impl);

  it('interroge les deux services et fusionne, France d’abord', async () => {
    const fetchImpl = fetchMock((url) =>
      url.includes('geopf')
        ? okJson({ features: [ignFeature('Saint-Denis', '93, Seine-Saint-Denis, Île-de-France', 2.36, 48.93)] })
        : okJson({ features: [photonFeature('Saint-Denis', 'Canada', 'Québec', -71.13, 46.06)] }),
    );
    const out = await searchCities('saint-denis', fetchImpl);
    expect(out.map((c) => c.country)).toEqual(['France', 'Canada']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // Cache Next partagé 24 h : la requête ne doit pas partir sans lui.
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ next: { revalidate: 86400 } });
  });

  it('répond avec le service restant quand l’autre est en panne', async () => {
    const fetchImpl = fetchMock((url) =>
      url.includes('geopf')
        ? Promise.reject(new Error('timeout'))
        : okJson({ features: [photonFeature('Bruxelles', 'Belgique', 'Bruxelles-Capitale', 4.35, 50.85)] }),
    );
    const out = await searchCities('bruxelles', fetchImpl);
    expect(out.map((c) => c.label)).toEqual(['Bruxelles']);
  });

  it('lève GeocodingUnavailable quand les deux échouent (dont un statut non-2xx)', async () => {
    const fetchImpl = fetchMock((url) =>
      url.includes('geopf')
        ? Promise.reject(new Error('timeout'))
        : Promise.resolve(new Response('nope', { status: 502 })),
    );
    await expect(searchCities('nantes', fetchImpl)).rejects.toBeInstanceOf(GeocodingUnavailable);
  });

  it('encode la requête et ne renvoie rien sous 3 caractères sans appel sortant', async () => {
    const fetchImpl = fetchMock(() => okJson({ features: [] }));
    expect(await searchCities('ly', fetchImpl)).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    await searchCities('saint étienne', fetchImpl);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('q=saint%20%C3%A9tienne');
  });
});
