import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { trendingGifs, type GiphyGif } from '@/lib/giphy';
import { rateLimit, limits } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Same rate-limit as search
  const userId = session.user.id;
  const rl = rateLimit(
    `gifs:trending:${userId}`,
    limits.discover.limit,
    limits.discover.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limited', resetAt: rl.resetAt }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Math.min(50, Number(limitParam))) : 20;

  try {
    const result = await trendingGifs(limit);
    return NextResponse.json({
      gifs: result.gifs.map(toClient),
      notConfigured: result.notConfigured,
    });
  } catch (err) {
    console.error('[gifs/trending] error:', err);
    return NextResponse.json({ gifs: [], notConfigured: false });
  }
}

function toClient(g: GiphyGif) {
  return {
    id: g.id,
    title: g.title,
    url: g.url,
    format: g.format,
    width: g.width,
    height: g.height,
  };
}
