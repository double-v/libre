import { authOptions } from '@/lib/auth';
import { rateLimit, limits } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import NextAuth from 'next-auth';

const handler = NextAuth(authOptions);

/**
 * Wrap the POST handler with a per-IP rate limit on sign-in attempts.
 * 5 attempts per minute per IP (see #27). This protects against brute
 * force on credentials, OAuth abuse (attacker forcing token grant), and
 * denial-of-service via /api/auth/signin endpoint.
 *
 * GET is not rate-limited here because it's used for OAuth provider
 * redirects and session checks (high frequency, low risk).
 */
async function wrappedPOST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`auth:nextauth:${ip}`, limits.auth.limit, limits.auth.windowMs);
  if (!rl.success) {
    return new Response(
      JSON.stringify({ error: 'Trop de tentatives. Réessayez dans une minute.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }
  return handler(request);
}

export { handler as GET, wrappedPOST as POST };