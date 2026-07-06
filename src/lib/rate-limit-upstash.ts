/**
 * Rate limiter hybride : Upstash Redis (prod) + fallback in-memory (dev/CI).
 *
 * Pourquoi : le rate limiter in-memory d'origine (src/lib/rate-limit.ts)
 * est inefficace sur Vercel serverless — chaque invocation a sa propre
 * Map, et les instances sont recyclées. Un attaquant peut bypass en
 * touchant différentes instances du warm pool. Cf. issue #141.
 *
 * Migration :
 * - Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN sont set,
 *   utilise @upstash/ratelimit (sliding window) + @upstash/redis pour
 *   l'observabilité admin (liste des 429 récents).
 * - Sinon (dev local, CI), fallback in-memory identique à l'ancien
 *   comportement.
 *
 * L'API publique est async (rateLimit renvoie une Promise) pour
 * permettre l'appel réseau Upstash. Les call sites doivent await.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitHit {
  key: string;
  at: number;
  limit: number;
  windowMs: number;
}

// --- Fallback in-memory (dev/CI) ---

const memoryStore = new Map<string, { count: number; resetAt: number }>();
const HIT_BUFFER_MAX = 500;
const recentHits: RateLimitHit[] = [];

function recordHitMemory(key: string, limit: number, windowMs: number): void {
  recentHits.push({ key, at: Date.now(), limit, windowMs });
  if (recentHits.length > HIT_BUFFER_MAX) {
    recentHits.splice(0, recentHits.length - HIT_BUFFER_MAX);
  }
}

// --- Upstash clients (lazy singletons) ---

// Un limiter par couple (limit, windowMs). BUG corrigé : l'ancien code créait
// un unique limiter câblé en dur sur slidingWindow(1, '60 s'), qui ignorait
// les presets → TOUS les endpoints étaient limités à 1 req/60 s en prod
// (Découvrir, géoloc, messages…). On construit désormais un limiter par preset.
const ratelimiters = new Map<string, Ratelimit>();
let redisClient: Redis | null = null;

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedisClient(): Redis | null {
  if (!isUpstashConfigured()) return null;
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

function getRatelimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!isUpstashConfigured()) return null;
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = ratelimiters.get(cacheKey);
  if (!limiter) {
    const windowSeconds = Math.max(1, Math.round(windowMs / 1000));
    limiter = new Ratelimit({
      redis: getRedisClient()!,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: 'libre:rl',
      analytics: false,
    });
    ratelimiters.set(cacheKey, limiter);
  }
  return limiter;
}

// --- API publique ---

/**
 * Vérifie si une action est autorisée selon la limite. Async car peut
 * appeler Upstash. Les erreurs Upstash (réseau) dégradent vers le
 * fallback in-memory — on ne bloque jamais l'utilisateur sur une
 * panne d'infra.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getRatelimiter(limit, windowMs);
  if (limiter) {
    try {
      const result = await limiter.limit(key);
      const resetAt = Date.now() + windowMs;
      if (!result.success) {
        await recordHitRedis(key, limit, windowMs);
        return { success: false, remaining: 0, resetAt };
      }
      return {
        success: true,
        remaining: result.remaining,
        resetAt,
      };
    } catch (err) {
      // Upstash down → degrade to in-memory. On log mais on ne bloque pas.
      console.error('[rate-limit] Upstash error, falling back to in-memory:', err instanceof Error ? err.message : 'unknown');
    }
  }

  return rateLimitMemory(key, limit, windowMs);
}

function rateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    recordHitMemory(key, limit, windowMs);
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

async function recordHitRedis(key: string, limit: number, windowMs: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.lpush(
      'ratelimit:hits',
      JSON.stringify({ key, at: Date.now(), limit, windowMs }),
    );
    // Trim to last 500 entries (TTL via list length cap)
    await redis.ltrim('ratelimit:hits', 0, HIT_BUFFER_MAX - 1);
  } catch (err) {
    console.error('[rate-limit] Failed to record hit in Redis:', err instanceof Error ? err.message : 'unknown');
  }
}

/**
 * Read-only view of the most recent rate-limit 429s. Used by
 * /api/admin/rate-limits. In Upstash mode, reads from Redis; in
 * fallback mode, reads from the in-memory ring buffer.
 *
 * Note: in Upstash mode, this is async (Redis call). Callers must await.
 * In fallback mode, it returns synchronously (but the return type is
 * still a Promise for API consistency).
 */
export async function getRecentRateLimitHits(): Promise<readonly RateLimitHit[]> {
  const redis = getRedisClient();
  if (redis && isUpstashConfigured()) {
    try {
      const raw = await redis.lrange('ratelimit:hits', 0, HIT_BUFFER_MAX - 1);
      return raw
        .map((r) => (typeof r === 'string' ? JSON.parse(r) : r))
        .filter((h): h is RateLimitHit => h && typeof h.key === 'string');
    } catch (err) {
      console.error('[rate-limit] Failed to read hits from Redis:', err instanceof Error ? err.message : 'unknown');
      return recentHits;
    }
  }
  return recentHits;
}

export interface RateLimitPreset {
  limit: number;
  windowMs: number;
}

export const limits: Record<string, RateLimitPreset> = {
  auth: { limit: 20, windowMs: 60_000 },
  message: { limit: 30, windowMs: 60_000 },
  geoloc: { limit: 12, windowMs: 60_000 },
  discover: { limit: 30, windowMs: 60_000 },
  like: { limit: 50, windowMs: 86_400_000 },
  report: { limit: 5, windowMs: 3_600_000 },
  api: { limit: 60, windowMs: 60_000 },
  squareMessage: { limit: 10, windowMs: 60_000 },
  squareReaction: { limit: 5, windowMs: 60_000 },
  squareReport: { limit: 3, windowMs: 3_600_000 },
};

export function rateLimitHeaders(
  result: RateLimitResult,
  limit: number,
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}