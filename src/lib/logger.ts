/**
 * Lightweight debug logger.
 *
 * Centralizes the "only log in development" pattern so we don't sprinkle
 * `if (process.env.NODE_ENV !== 'production')` everywhere. In production,
 * all calls become no-ops. This prevents accidentally leaking PII (userId,
 * role, email) or sensitive state via Vercel logs.
 *
 * For real error logging, use console.error directly — those should always
 * fire so we can see production incidents.
 */
export const debugLog = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};
