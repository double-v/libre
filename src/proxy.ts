import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getDb } from '@/lib/db';

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    return NextResponse.redirect(loginUrl);
  }

  // Verify the user still exists. This is the actual fix: a JWT can be valid
  // cryptographically while pointing at a deleted/rotated user.
  try {
    const user = await getDb().user.findUnique({
      where: { id: token.id as string },
      select: { id: true },
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
  } catch (err) {
    // On DB error, let the request through. The downstream page will surface
    // its own error. We don't want to block everyone on a transient DB hiccup.
    console.error('[proxy] DB check failed for userId=%s:', token.id, err);
  }

  return NextResponse.next();
}

export const config = {
  // Match only HTML page navigations, not assets / API / static.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
