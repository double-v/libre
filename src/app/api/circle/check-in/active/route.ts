/**
 * GET /api/circle/check-in/active — Récupère le check-in actif.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.5.
 *
 * Comportement :
 * - Auth requise
 * - Lazy expiration : on expire à la volée les checkins en retard AVANT
 *   la query user (cf. #94). Avant le lazy-expire, c'était un cron Vercel
 *   toutes-les-5min qui faisait ce boulot. Désormais, à chaque GET on
 *   nettoie ce qui doit l'être — latence d'expiration 0 côté user, 0 cron.
 * - 200 + checkin si un est 'active' pour ce user
 * - 204 No Content sinon (l'UI affiche alors "pas de check-in en cours")
 *
 * Le champ `secondsRemaining` est calculé côté serveur (now - expiresAt
 * arrondi à la seconde) pour éviter un calcul côté client qui pourrait
 * diverger si l'horloge user est décalée.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { expireOverdueCheckins } from '@/lib/trust/expire';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const db = getDb();
    const now = new Date();

    // Lazy expiration : si un checkin est en retard, il devient 'expired'
    // et son alerte est créée à la volée (cf. #94). Cela remplace le
    // cron Vercel 5-minutes supprimé pour cause de quota Hobby.
    await expireOverdueCheckins(db, now);

    const checkin = await db.safetyCheckin.findFirst({
      where: { userId: session.user.id, status: 'active' },
      select: {
        id: true,
        triggeredAt: true,
        expiresAt: true,
        lastLat: true,
        lastLng: true,
      },
    });

    if (!checkin) {
      return new NextResponse(null, { status: 204 });
    }

    // Le checkin est encore 'active' (sinon findFirst ne l'aurait pas
    // retourné après le lazy-expire). On calcule le temps restant.
    const secondsRemaining = Math.max(
      0,
      Math.floor((checkin.expiresAt.getTime() - now.getTime()) / 1000),
    );

    return NextResponse.json(
      {
        id: checkin.id,
        triggeredAt: checkin.triggeredAt.toISOString(),
        expiresAt: checkin.expiresAt.toISOString(),
        secondsRemaining,
        // lastLat/lastLng : null en V1, cf. POST /api/circle/check-in
        lastLat: checkin.lastLat,
        lastLng: checkin.lastLng,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/circle/check-in/active error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
