import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, limits } from '@/lib/rate-limit';

export function middleware(request: NextRequest) {
  // Rate limiting on API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const path = request.nextUrl.pathname;

    // Choose limit preset based on path
    let preset = limits.api;
    if (path.includes('/auth/') || path === '/api/auth/register') {
      preset = limits.auth;
    } else if (path.includes('/admin')) {
      preset = limits.api; // standard rate limit; auth check returns 404 for non-admins
    } else if (path.includes('/chat/') && path.includes('/messages')) {
      preset = limits.message;
    } else if (path.includes('/geoloc/')) {
      preset = limits.geoloc;
    } else if (path.includes('/discover')) {
      preset = limits.discover;
    } else if (path.includes('/likes')) {
      preset = limits.like;
    } else if (path.includes('/moderation/report')) {
      preset = limits.report;
    }

    const result = rateLimit(`rl:${ip}:${path}`, preset.limit, preset.windowMs);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};