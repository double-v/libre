/**
 * Géocodage des villes pour la saisie manuelle (#402, spec 004).
 *
 * Deux services publics sans clé, interrogés en parallèle côté serveur :
 * - IGN Géoplateforme (successeur d'api-adresse.data.gouv.fr, données BAN) pour
 *   la France — son `context` donne le département, seul qualificatif qui lève
 *   les homonymies françaises (trois « Saint-Denis »).
 * - Photon (OSM) pour le reste du monde, en français.
 *
 * Pourquoi pas un géocodeur commercial : une requête de position partirait chez
 * un tiers avec clé et facturation (principe III). Pourquoi pas Nominatim : sa
 * politique d'usage (1 req/s) interdit l'autocomplétion.
 *
 * Logique pure : `fetch` est injecté pour les tests ; la route ajoute session,
 * rate limit et mapping HTTP.
 */

export interface CityCandidate {
  label: string;
  /** « 93, Seine-Saint-Denis » (France) | « Québec » (monde) | '' */
  qualifier: string;
  country: string;
  lat: number;
  lng: number;
}

export class GeocodingUnavailable extends Error {
  constructor() {
    super('geocoding_unavailable');
    this.name = 'GeocodingUnavailable';
  }
}

export const MIN_QUERY_LENGTH = 3;
export const MAX_QUERY_LENGTH = 80;
export const MAX_CANDIDATES = 5;
export const CITY_LABEL_MAX = 80;

const IGN_URL = 'https://data.geopf.fr/geocodage/search';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const UPSTREAM_TIMEOUT_MS = 4000;
// Cache Next partagé entre membres : une ville tapée par l'une sert aux autres.
const REVALIDATE_S = 86400;

interface GeoJsonFeature {
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: unknown } | null;
}
interface GeoJsonCollection {
  features?: GeoJsonFeature[];
}

function coords(f: GeoJsonFeature): { lat: number; lng: number } | null {
  const c = f.geometry?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const [lng, lat] = c;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function parseIgn(body: GeoJsonCollection): CityCandidate[] {
  const out: CityCandidate[] = [];
  for (const f of body.features ?? []) {
    const p = f.properties ?? {};
    if (p.type !== 'municipality') continue;
    const label = str(p.city) || str(p.name) || str(p.label);
    const pos = coords(f);
    if (!label || !pos) continue;
    // context = « 93, Seine-Saint-Denis, Île-de-France » → on garde numéro + nom.
    const qualifier = str(p.context).split(',').slice(0, 2).map((s) => s.trim()).filter(Boolean).join(', ');
    out.push({ label, qualifier, country: 'France', ...pos });
  }
  return out;
}

export function parsePhoton(body: GeoJsonCollection): CityCandidate[] {
  const out: CityCandidate[] = [];
  for (const f of body.features ?? []) {
    const p = f.properties ?? {};
    const label = str(p.name);
    const country = str(p.country);
    const pos = coords(f);
    if (!label || !country || !pos) continue;
    // La France est servie par l'IGN avec un meilleur qualificatif.
    if (country === 'France') continue;
    out.push({ label, qualifier: str(p.state), country, ...pos });
  }
  return out;
}

const key = (c: CityCandidate) => `${c.label}|${c.qualifier}|${c.country}`;

/** France d'abord, dédoublonnage sur (label, qualifier, country), plafond. */
export function mergeCandidates(france: CityCandidate[], world: CityCandidate[]): CityCandidate[] {
  const seen = new Set<string>();
  const out: CityCandidate[] = [];
  for (const c of [...france, ...world]) {
    const k = key(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

/** Libellé privé stocké sur le profil : « Lyon (69) », « Bruxelles, Belgique ». */
export function formatCityLabel(c: CityCandidate): string {
  const dept = c.country === 'France' ? c.qualifier.split(',')[0]?.trim() : '';
  const label = c.country === 'France'
    ? (dept ? `${c.label} (${dept})` : c.label)
    : `${c.label}, ${c.country}`;
  return label.length > CITY_LABEL_MAX ? label.slice(0, CITY_LABEL_MAX - 1) + '…' : label;
}

/** Sous-ensemble de `fetch` réellement utilisé — plus simple à mocker que la surcharge complète. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

async function fetchJson(url: string, fetchImpl: FetchLike): Promise<GeoJsonCollection> {
  const res = await fetchImpl(url, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
    next: { revalidate: REVALIDATE_S },
  } as RequestInit);
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return (await res.json()) as GeoJsonCollection;
}

/**
 * Cherche des villes. Un service en panne n'empêche pas l'autre de répondre ;
 * les deux en panne → `GeocodingUnavailable` (la route répond 503).
 */
export async function searchCities(rawQuery: string, fetchImpl: FetchLike = fetch): Promise<CityCandidate[]> {
  const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (q.length < MIN_QUERY_LENGTH) return [];
  const enc = encodeURIComponent(q);
  const ignUrl = `${IGN_URL}?q=${enc}&index=address&type=municipality&limit=${MAX_CANDIDATES}`;
  const photonUrl = `${PHOTON_URL}?q=${enc}&lang=fr&limit=${MAX_CANDIDATES}&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village`;

  const [ign, photon] = await Promise.allSettled([fetchJson(ignUrl, fetchImpl), fetchJson(photonUrl, fetchImpl)]);
  if (ign.status === 'rejected' && photon.status === 'rejected') throw new GeocodingUnavailable();

  const france = ign.status === 'fulfilled' ? parseIgn(ign.value) : [];
  const world = photon.status === 'fulfilled' ? parsePhoton(photon.value) : [];
  return mergeCandidates(france, world);
}
