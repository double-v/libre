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
  try {
    const user = await getDb().user.findUnique({
      where: { id: token.id as string },
      select: { id: true, isBanned: true },
    });

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
