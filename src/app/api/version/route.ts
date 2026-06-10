import { NextResponse } from 'next/server';

// Force-dynamic ensures the build SHA is read at request time, and Vercel CDN
// will not cache the response (Cache-Control: private, no-cache, no-store).
// Polled by <VersionWatcher /> to detect new deploys and force a refresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Vercel injects these env vars at build/runtime. Fall back to 'dev' locally.
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_BUILD_SHA ??
    'dev';
  const buildTime =
    process.env.VERCEL_BUILD_TIME ?? new Date().toISOString();

  return NextResponse.json(
    { sha, buildTime },
    {
      headers: {
        // No CDN cache: every poll must hit the origin to detect a new SHA.
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
