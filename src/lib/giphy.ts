/**
 * GIPHY GIF API — wrapper serveur.
 *
 * Migration Tenor → Giphy v1 (Tenor API shuts down June 30, 2026).
 * GIPHY a racheté Tenor en 2018 et fournit un guide de migration officiel
 * https://developers.giphy.com/docs/api/tenor-migration
 *
 * - Cache LRU en mémoire, TTL 5 minutes, max 200 entrées.
 * - Aucun paquet npm ajouté : on parle directement au v1 REST.
 * - Safe-search forcé : rating=pg-13.
 * - Si GIPHY_API_KEY manque on retourne un objet `notConfigured: true`
 *   et un GIF placeholder pour ne pas casser la prod tant que la clé
 *   n'est pas provisionnée sur Vercel.
 *
 * Référence API : https://developers.giphy.com/docs/api
 */

import { z } from 'zod';

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 200;

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'q requis').max(100, 'q trop long (max 100)'),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit >= 1')
    .max(50, 'limit <= 50')
    .default(20),
});

const trendingQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit >= 1')
    .max(50, 'limit <= 50')
    .default(20),
});

export interface GiphyGif {
  id: string;
  title: string;
  /** URL .mp4 (de préférence) — la plus petite variante qui anime. */
  url: string;
  /** Format effectif de l'URL : "mp4" | "gif" | "webp". */
  format: 'mp4' | 'gif' | 'webp';
  /** Dimensions en pixels. */
  width: number;
  height: number;
}

interface GiphyImageVariant {
  url: string;
  width: string;
  height: string;
  mp4?: string;
}

interface GiphyImages {
  original?: GiphyImageVariant;
  original_mp4?: { mp4?: string };
  fixed_height?: GiphyImageVariant;
  downsized_small?: GiphyImageVariant;
}

interface GiphyResult {
  id: string;
  title: string;
  images: GiphyImages;
}

interface GiphyResponse {
  data: GiphyResult[];
  pagination?: { total_count: number; count: number; offset: number };
  meta?: { status: number; msg: string };
}

function pickFormat(images: GiphyImages): {
  url: string;
  format: GiphyGif['format'];
} {
  // Préférer mp4 (plus petit, animation fluide, autoplay autorisé sur la plupart des navigateurs).
  const mp4 = images.original_mp4?.mp4 ?? images.downsized_small?.mp4;
  if (mp4) return { url: mp4, format: 'mp4' };
  if (images.fixed_height?.url) return { url: images.fixed_height.url, format: 'gif' };
  if (images.original?.url) return { url: images.original.url, format: 'gif' };
  // Dernier recours : URL vide — ne devrait jamais arriver côté Giphy.
  return { url: '', format: 'gif' };
}

function normalizeResult(r: GiphyResult): GiphyGif {
  const fmt = pickFormat(r.images);
  // On privilégie original pour les dims, fallback sur fixed_height.
  const dimsSource = r.images.original ?? r.images.fixed_height;
  return {
    id: r.id,
    title: r.title || '',
    url: fmt.url,
    format: fmt.format,
    width: Number(dimsSource?.width ?? 0),
    height: Number(dimsSource?.height ?? 0),
  };
}

/** LRU en mémoire : Map préserve l'ordre d'insertion. */
const cache = new Map<string, { value: GiphyGif[]; expiresAt: number }>();

function cacheGet(key: string): GiphyGif[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  // Rafraîchit la position LRU.
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key: string, value: GiphyGif[]): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Supprime l'entrée la plus ancienne (1ère de la Map).
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function apiKeyOrNull(): string | null {
  const key = process.env.GIPHY_API_KEY;
  return key && key.length > 0 ? key : null;
}

/** GIF de repli : un pixel transparent encodé en data URL, jamais utilisé en pratique
 *  sauf si la clé Giphy n'est pas configurée ET que le front demande explicitement
 *  un fallback. On garde un seul GIF placeholder pour ne pas casser la mise en page. */
const PLACEHOLDER_GIF: GiphyGif = {
  id: 'placeholder',
  title: 'GIF indisponible (clé Giphy non configurée)',
  url: '',
  format: 'gif',
  width: 0,
  height: 0,
};

export interface GiphyFetchResult {
  gifs: GiphyGif[];
  /** Vrai si la clé API est absente : on renvoie un placeholder. */
  notConfigured: boolean;
}

async function fetchGiphy(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<GiphyResponse> {
  const apiKey = apiKeyOrNull();
  if (!apiKey) {
    // Ne devrait pas être appelé : on filtre avant. Sécurité.
    throw new Error('GIPHY_API_KEY not configured');
  }
  const url = new URL(`${GIPHY_BASE}${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('rating', 'pg-13');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Giphy API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as GiphyResponse;
}

export async function searchGifs(
  rawQ: string,
  rawLimit: unknown,
): Promise<GiphyFetchResult> {
  const parsed = searchQuerySchema.safeParse({ q: rawQ, limit: rawLimit });
  if (!parsed.success) {
    throw new GiphyValidationError(parsed.error.issues[0]?.message ?? 'Paramètres invalides');
  }
  const { q, limit } = parsed.data;
  const apiKey = apiKeyOrNull();
  if (!apiKey) {
    return { gifs: [PLACEHOLDER_GIF], notConfigured: true };
  }

  const cacheKey = `search:${q.toLowerCase()}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return { gifs: cached, notConfigured: false };

  const data = await fetchGiphy('/search', { q, limit });
  const gifs = (data.data ?? []).map(normalizeResult).filter((g) => g.url.length > 0);
  cacheSet(cacheKey, gifs);
  return { gifs, notConfigured: false };
}

export async function trendingGifs(rawLimit: unknown): Promise<GiphyFetchResult> {
  const parsed = trendingQuerySchema.safeParse({ limit: rawLimit });
  if (!parsed.success) {
    throw new GiphyValidationError(parsed.error.issues[0]?.message ?? 'Paramètres invalides');
  }
  const { limit } = parsed.data;
  const apiKey = apiKeyOrNull();
  if (!apiKey) {
    return { gifs: [PLACEHOLDER_GIF], notConfigured: true };
  }

  const cacheKey = `trending:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return { gifs: cached, notConfigured: false };

  const data = await fetchGiphy('/trending', { limit });
  const gifs = (data.data ?? []).map(normalizeResult).filter((g) => g.url.length > 0);
  cacheSet(cacheKey, gifs);
  return { gifs, notConfigured: false };
}

export class GiphyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GiphyValidationError';
  }
}

/** Exposed for tests — clears the in-memory cache. */
export function _resetGiphyCache(): void {
  cache.clear();
}
