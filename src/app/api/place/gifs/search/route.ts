import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchGifs, type GiphyGif } from '@/lib/giphy';
import { rateLimit, limits } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Auth required to avoid burning the Giphy quota on anonymous abuse
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Rate-limit per user: 30 searches/min is plenty for a UX picker
  const userId = session.user.id;
  const rl = await rateLimit(
    `gifs:search:${userId}`,
    limits.discover.limit,
    limits.discover.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limited', resetAt: rl.resetAt }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Math.min(50, Number(limitParam))) : 20;

  try {
    const result = await searchGifs(q, limit);
    return NextResponse.json({
      gifs: result.gifs.map(toClient),
      notConfigured: result.notConfigured,
    });
  } catch (err) {
    // Giphy down? Don't break the picker — return empty.
    console.error('[gifs/search] error:', err);
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
