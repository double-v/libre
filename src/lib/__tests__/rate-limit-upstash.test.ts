/**
 * Tests unitaires — src/lib/rate-limit-upstash.ts
 *
 * Vérifie :
 * - Mode Upstash : utilise Ratelimiter.slidingWindow
 * - Fallback in-memory : quand UPSTASH_REDIS_REST_URL n'est pas set
 * - rateLimit() est async et renvoie { success, remaining, resetAt }
 * - recordHit() : les 429 sont enregistrés pour l'observabilité admin
 *
 * Cf. issue #141 — le rate limiter in-memory d'origine est inefficace
 * sur Vercel serverless (chaque invocation a sa propre Map).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// === Mocks Upstash ===

const mockRatelimitLimit = vi.fn();
const mockRedisLpush = vi.fn();
const mockRedisLrange = vi.fn();

vi.mock('@upstash/ratelimit', () => {
  class MockRatelimit {
    limit = mockRatelimitLimit;
    static slidingWindow = vi.fn().mockReturnValue('mock-limiter');
  }
  return {
    __esModule: true,
    Ratelimit: MockRatelimit as unknown as import('@upstash/ratelimit').Ratelimit,
  };
});

vi.mock('@upstash/redis', () => ({
  __esModule: true,
  Redis: {
    fromEnv: vi.fn().mockReturnValue({
      lpush: mockRedisLpush,
      lrange: mockRedisLrange,
      ltrim: vi.fn().mockResolvedValue('OK'),
    }),
  },
}));

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
  // Clear env
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  vi.resetModules();
});

// --- Tests ---

describe('rateLimit (fallback in-memory)', () => {
  it('rateLimit est async et renvoie success + remaining + resetAt', async () => {
    const { rateLimit } = await import('../rate-limit-upstash');

    const result = await rateLimit('test-key', 5, 60_000);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
  });

  it('bloque après la limite (fallback in-memory)', async () => {
    const { rateLimit } = await import('../rate-limit-upstash');

    // Consomme les 5 slots
    for (let i = 0; i < 5; i++) {
      await rateLimit('block-test', 5, 60_000);
    }
    const result = await rateLimit('block-test', 5, 60_000);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe('rateLimit (mode Upstash)', () => {
  it('utilise Upstash quand UPSTASH_REDIS_REST_URL est set', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockRatelimitLimit.mockResolvedValue({
      success: true,
      remaining: 19,
      reset: Date.now() + 60_000,
    });

    const { rateLimit } = await import('../rate-limit-upstash');

    const result = await rateLimit('upstash-key', 20, 60_000);

    expect(mockRatelimitLimit).toHaveBeenCalledWith('upstash-key');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it('enregistre les 429 dans Redis pour l\'observabilité admin', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockRatelimitLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const { rateLimit } = await import('../rate-limit-upstash');

    await rateLimit('blocked-key', 1, 60_000);

    expect(mockRedisLpush).toHaveBeenCalledWith(
      'ratelimit:hits',
      expect.stringContaining('"key":"blocked-key"'),
    );
  });
});

describe('getRecentRateLimitHits', () => {
  it('retourne les hits du fallback in-memory quand pas de Redis', async () => {
    const { rateLimit, getRecentRateLimitHits } = await import('../rate-limit-upstash');

    // Consomme la limite pour générer un 429
    for (let i = 0; i < 3; i++) {
      await rateLimit('hits-test', 3, 60_000);
    }
    await rateLimit('hits-test', 3, 60_000); // 4e → 429

    const hits = await getRecentRateLimitHits();
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.some((h: { key: string }) => h.key === 'hits-test')).toBe(true);
  });

  it('lit depuis Redis quand configuré', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const mockHit = {
      key: 'redis-hit',
      at: Date.now(),
      limit: 20,
      windowMs: 60_000,
    };
    mockRedisLrange.mockResolvedValue([JSON.stringify(mockHit)]);

    const { getRecentRateLimitHits } = await import('../rate-limit-upstash');

    const hits = await getRecentRateLimitHits();

    expect(mockRedisLrange).toHaveBeenCalledWith('ratelimit:hits', 0, 499);
    expect(hits).toHaveLength(1);
    expect(hits[0].key).toBe('redis-hit');
  });
});