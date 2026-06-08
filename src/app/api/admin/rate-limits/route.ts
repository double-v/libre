import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getRecentRateLimitHits } from '@/lib/rate-limit';

/**
 * Admin observability endpoint for rate-limit 429 events.
 *
 * Returns the most recent rate-limit hits from the in-memory ring buffer
 * (last 500). Useful to spot:
 *   - Users being blocked by too-strict presets (e.g. a mobile app calling
 *     /api/geoloc/update every 10s hitting the 12/min limit)
 *   - Abuse patterns (single userId / IP / route spiking the rate limit)
 *
 * Aggregated by key in the response. Pass `?since=<unix-ms>` to filter
 * to events after a timestamp (default: last 1h).
 *
 * Note: the buffer is in-memory and resets on server restart. For V1
 * single-instance Vercel deployment, this is acceptable. For multi-region
 * or longer retention, switch to an external store (Redis, Upstash, etc.).
 */
export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get('since');
  const since = sinceParam ? Number(sinceParam) : Date.now() - 60 * 60 * 1000;

  if (!Number.isFinite(since)) {
    return NextResponse.json({ error: 'Invalid "since" timestamp' }, { status: 400 });
  }

  const hits = getRecentRateLimitHits().filter((h) => h.at >= since);

  // Group by key to make spikes obvious. The key format is "<scope>:<id>"
  // (e.g. "geoloc:<userId>", "export:<userId>"), so a key can be mapped
  // back to a route + user/IP combo.
  const byKey = new Map<
    string,
    { key: string; count: number; firstAt: number; lastAt: number; limit: number; windowMs: number }
  >();

  for (const hit of hits) {
    const existing = byKey.get(hit.key);
    if (existing) {
      existing.count++;
      existing.lastAt = Math.max(existing.lastAt, hit.at);
      existing.firstAt = Math.min(existing.firstAt, hit.at);
    } else {
      byKey.set(hit.key, {
        key: hit.key,
        count: 1,
        firstAt: hit.at,
        lastAt: hit.at,
        limit: hit.limit,
        windowMs: hit.windowMs,
      });
    }
  }

  const summary = Array.from(byKey.values()).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    window: { from: since, to: Date.now() },
    totalHits: hits.length,
    uniqueKeys: byKey.size,
    summary,
  });
}
