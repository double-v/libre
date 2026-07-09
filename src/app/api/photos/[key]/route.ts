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

    // La clé doit réellement appartenir au profil du propriétaire — sans ça,
    // n'importe quel utilisateur authentifié pourrait obtenir une URL signée
    // pour une clé arbitraire jamais uploadée. On récupère aussi l'index pour
    // distinguer l'avatar (photo principale) du reste.
    const ownerProfile = await getDb().profile.findUnique({
      where: { userId: ownerId },
      select: { photos: true },
    });
    const ownerPhotos = (ownerProfile?.photos as string[] | null) ?? [];
    const photoIndex = ownerPhotos.indexOf(decodedKey);
    if (photoIndex === -1) {
      return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });
    }

    // Modèle d'accès :
    //  - le propriétaire voit toutes ses photos ;
    //  - l'AVATAR (photo principale = photos[0]) est PUBLIC : visible par tout
    //    utilisateur authentifié, matché ou non — indispensable à Discover /
    //    croisements, où l'on voit des profils non-matchés (rate-limit ci-dessus
    //    = garde-fou anti-scraping) ;
    //  - les AUTRES photos restent réservées aux matches (issue #143).
    // TODO(#suite) : visibilité paramétrable par photo (public / matches).
    const isOwner = ownerId === session.user.id;
    const isAvatar = photoIndex === 0;
    if (!isOwner && !isAvatar) {
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