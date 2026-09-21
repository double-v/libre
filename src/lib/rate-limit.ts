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
 *
 * RGPD (#429) : Upstash reçoit des identifiants de compte et des adresses IP.
 * Vérifié le 2026-09-21, `UPSTASH_REDIS_REST_URL` n'est **pas** défini en
 * production : c'est le fallback mémoire qui tourne, et Upstash ne figure donc
 * pas parmi les destinataires de la politique de confidentialité (§6). Le jour
 * où on le branche, l'ajouter à §6 et §7 **avant** de poser la variable.
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