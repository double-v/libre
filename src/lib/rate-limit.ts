/**
 * Rate limiter — proxy vers l'implémentation hybride Upstash + in-memory.
 *
 * Cf. issue #141 — l'ancien rate limiter in-memory était inefficace sur
 * Vercel serverless (chaque invocation a sa propre Map). Le nouveau module
 * rate-limit-upstash.ts utilise Upstash Redis en prod + fallback in-memory
 * en dev/CI.
 *
 * L'API est maintenant ASYNC : rateLimit() renvoie une Promise. Tous les
 * call sites doivent await le résultat.
 *
 * Ce fichier re-export l'API publique pour ne pas casser les imports
 * existants (`from '@/lib/rate-limit'`).
 */
export {
  rateLimit,
  rateLimitHeaders,
  getRecentRateLimitHits,
  limits,
  type RateLimitResult,
  type RateLimitHit,
  type RateLimitPreset,
} from './rate-limit-upstash';