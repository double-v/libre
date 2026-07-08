import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getDb } from '@/lib/db';
import {
  PREVIEW_COOKIE_NAME,
  buildPreviewCookieHeader,
  buildPreviewClearCookieHeader,
  resolvePreviewTheme,
} from '@/lib/site-theme-preview';

// ---------------------------------------------------------------------------
// Session guard for (main)/* and (admin)/* pages.
//
// Why: NextAuth signs JWTs with NEXTAUTH_SECRET. If the secret rotates (e.g.
// after a Vercel env-var reset) OR the user is deleted from the DB, the
// cookie remains cryptographically valid in the browser but every API call
// returns 401. Non-technical users see broken screens with no recovery path.
//
// This proxy decodes the JWT, checks that the user still exists in the DB,
// and redirects to /login?error=session_expiree otherwise. The login page
// surfaces a clear message and points users back to the app after re-auth.
//
// Next.js 16 renames middleware to proxy. Runtime is Node.js by default,
// which is required for Prisma.
// ---------------------------------------------------------------------------

const PROTECTED_PREFIXES = [
  '/discover',
  '/crossings',
  '/nearby',
  '/matches',
  '/messages',
  '/square',
  '/chat',
  '/profile',
  '/settings',
  '/admin',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

// ---------------------------------------------------------------------------
// Cache court du contrôle user (issue #146).
//
// Le proxy faisait un `user.findUnique` à CHAQUE navigation protégée (~50-100ms
// de round-trip DB par page view sur Vercel serverless). On mémoïse le résultat
// par userId pendant un TTL court. Runtime Node par instance chaude → Map par
// instance, éphémère (un cold start repart de zéro : c'est correct, pas un cache
// partagé). Un ban / une suppression / un changement de rôle se propage donc en
// <= TTL — délai borné explicitement accepté par le ticket (< 30 s).
//
// Fail-safe : on ne met en cache QUE les résultats DB aboutis (y compris `null`
// = user confirmé absent). Les erreurs DB ne sont pas mises en cache et sont
// gérées comme avant (on laisse passer, cf. bloc catch).
const USER_CHECK_TTL_MS = 30_000;
// Borne mémoire : ce cache tourne dans un middleware sur CHAQUE navigation. On
// plafonne le nombre d'entrées (éviction FIFO de la plus ancienne) pour qu'une
// instance chaude vue par beaucoup d'utilisateurs distincts ne fuie pas la
// mémoire. Même motif que le cache LRU de src/lib/giphy.ts.
const USER_CHECK_MAX_ENTRIES = 10_000;

type UserCheck = { id: string; isBanned: boolean; role: string } | null;

const userCheckCache = new Map<string, { value: UserCheck; expiresAt: number }>();

function getCachedUserCheck(userId: string): UserCheck | undefined {
  const entry = userCheckCache.get(userId);
  if (!entry) return undefined; // miss
  if (Date.now() >= entry.expiresAt) {
    userCheckCache.delete(userId);
    return undefined; // expiré → miss
  }
  return entry.value; // hit (peut être null = user confirmé absent)
}

function setCachedUserCheck(userId: string, value: UserCheck): void {
  // Rafraîchit la position (Map préserve l'ordre d'insertion) : on supprime
  // avant de ré-insérer pour que l'entrée redevienne la plus récente.
  userCheckCache.delete(userId);
  if (userCheckCache.size >= USER_CHECK_MAX_ENTRIES) {
    const oldest = userCheckCache.keys().next().value;
    if (oldest !== undefined) userCheckCache.delete(oldest);
  }
  userCheckCache.set(userId, { value, expiresAt: Date.now() + USER_CHECK_TTL_MS });
}

/** Exposé pour les tests — vide le cache mémoire. */
export function _resetProxyUserCache(): void {
  userCheckCache.clear();
}

/**
 * Strip the ?preview=... query param from the URL the user sees on the
 * NEXT request, by redirecting to the same URL without the query. The
 * cookie survives across navigations, but the URL should not — otherwise
 * every link click on the page would re-trigger the preview handling
 * (harmless but noisy) and the user could not share a normal URL.
 */
function redirectStrippingPreview(request: NextRequest): NextResponse {
  const cleanUrl = request.nextUrl.clone();
  cleanUrl.searchParams.delete('preview');
  return NextResponse.redirect(cleanUrl, { status: 303 });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Preview theme handling (admin) -----------------------------------
  // ?preview=<theme-id> sets a 24h cookie that overrides the active theme
  // for this visitor only. ?preview=reset clears it. Unknown ids are
  // silently ignored. The cookie is then read by getCurrentSiteTheme().
  // We do this BEFORE the auth gate so admins can preview on the login
  // page or any public URL too.
  const previewParam = request.nextUrl.searchParams.get('preview');
  if (previewParam === 'reset') {
    // Clear the cookie and redirect to the same URL without ?preview so
    // the page renders with the persisted theme (and the URL is shareable).
    const response = redirectStrippingPreview(request);
    response.headers.append('Set-Cookie', buildPreviewClearCookieHeader());
    return response;
  }
  if (previewParam && resolvePreviewTheme(previewParam)) {
    // Set the cookie and redirect to the same URL without ?preview so the
    // page renders with the previewed theme (and the URL is shareable).
    const response = redirectStrippingPreview(request);
    response.headers.append('Set-Cookie', buildPreviewCookieHeader(previewParam));
    return response;
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Skip the NextAuth API route itself and any /api/* — those handle their
  // own auth via getServerSession and return 401 explicitly.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    // In production (HTTPS) NextAuth uses the __Secure- prefixed cookie.
    // Auto-detect by checking the request protocol.
    secureCookie: request.nextUrl.protocol === 'https:',
  });

  if (!token?.id) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    loginUrl.searchParams.set('error', 'session_expiree');
    const response = NextResponse.redirect(loginUrl);
    // Clear the stale session cookie so the user actually gets a fresh
    // login form instead of a redirect loop. Without this, the cookie is
    // still cryptographically valid and the login page bounces straight
    // back to the protected route, which bounces back to /login, etc.
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    return response;
  }

  // Verify the user still exists. This is the actual fix: a JWT can be valid
  // cryptographically while pointing at a deleted/rotated user.
  //
  // #146: on passe d'abord par un cache court (TTL 30 s) pour éviter un
  // findUnique par navigation. Sur cache miss (ou entrée expirée) on interroge
  // la DB et on mémorise le résultat.
  try {
    const userId = token.id as string;
    let user = getCachedUserCheck(userId);
    if (user === undefined) {
      user = await getDb().user.findUnique({
        where: { id: userId },
        select: { id: true, isBanned: true, role: true },
      });
      setCachedUserCheck(userId, user);
    }

    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session_expiree');
      const response = NextResponse.redirect(loginUrl);
      // Clear the stale session cookie so the user actually gets a fresh
      // login form instead of a redirect loop.
      response.cookies.delete('next-auth.session-token');
      response.cookies.delete('__Secure-next-auth.session-token');
      return response;
    }

    // Enforce ban instantly: a banned user must not be able to use the app
    // until JWT expiry (30 days). We clear the cookies and redirect.
    if (user.isBanned) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'account_banned');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('next-auth.session-token');
      response.cookies.delete('__Secure-next-auth.session-token');
      return response;
    }

    // Defense-in-depth for admin pages: /admin/* pages are rendered server-
    // side and rely on admin API calls for data, but a non-admin who guesses
    // the URL could still load the page shell (and any client-side state).
    // Redirect non-admins to / so the admin surface is never exposed, even
    // transiently. The DB role is authoritative — the JWT may be stale after
    // a role change (#155).
    if (pathname.startsWith('/admin') && user.role?.toUpperCase() !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (err) {
    // On DB error, let the request through. The downstream page will surface
    // its own error. We don't want to block everyone on a transient DB hiccup.
    // Log error type only — do NOT include the userId (PII in Vercel logs).
    console.error('[proxy] DB check failed:', err instanceof Error ? err.message : 'unknown error');
  }

  return NextResponse.next();
}

export const config = {
  // Match only HTML page navigations, not assets / API / static.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
