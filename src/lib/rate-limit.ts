/**
 * Simple in-memory rate limiter.
 * For V1 — works without external services.
 * Reset on server restart (acceptable for single-instance Vercel).
 */

const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export interface RateLimitPreset {
  limit: number;
  windowMs: number;
}

/** Convenience presets */
export const limits: Record<string, RateLimitPreset> = {
  // Auth endpoints: 20 attempts per minute per IP.
  // High enough for a human who's forgotten their password to retry
  // comfortably; low enough to block basic brute-force. 5/min was too
  // restrictive for the E2E test suite (multiple POSTs from the same
  // runner IP) and for legitimate users who mistype credentials.
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