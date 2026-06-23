import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPhotoSignedUrl, isR2Configured } from '@/lib/r2';
import { rateLimit, limits, rateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Rate limit (issue #143) — prevents photo scraping
    const rl = await rateLimit(`photos:${session.user.id}`, limits.api.limit, limits.api.windowMs);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: { ...rateLimitHeaders(rl, limits.api.limit) } },
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: 'Stockage non configuré' }, { status: 503 });
    }

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    // Extract ownerId from key format: "userId/uuid.ext"
    const ownerId = decodedKey.split('/')[0];
    if (!ownerId) {
      return NextResponse.json({ error: 'Clé invalide' }, { status: 400 });
    }

    // Permission check: owner can always see, others must be matches
    if (ownerId !== session.user.id) {
      const isMatch = await getDb().match.findFirst({
        where: {
          OR: [
            { userA: session.user.id, userB: ownerId },
            { userA: ownerId, userB: session.user.id },
          ],
        },
      });

      if (!isMatch) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }
    }

    // Verify the key actually belongs to the owner's profile. Without this check,
    // any authenticated user who is a match (or the owner themselves) could obtain
    // a signed URL for an arbitrary key, even one that was never uploaded.
    const ownerProfile = await getDb().profile.findUnique({
      where: { userId: ownerId },
      select: { photos: true },
    });
    const ownerPhotos = (ownerProfile?.photos as string[] | null) ?? [];
    if (!ownerPhotos.includes(decodedKey)) {
      return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });
    }

    const signedUrl = await getPhotoSignedUrl(decodedKey);
    return NextResponse.redirect(signedUrl, {
      headers: {
        'Cache-Control': 'private, max-age=900',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Photo proxy error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'accès' }, { status: 500 });
  }
}