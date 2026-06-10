/**
 * GET /api/circle/check-in/active — Récupère le check-in actif.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.5.
 *
 * Comportement :
 * - Auth requise
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const checkin = await getDb().safetyCheckin.findFirst({
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

    // Si le checkin a expiré entre la query et le retour, on le
    // signale quand même comme 'active' (le cron #52 le passera en
    // 'expired' au prochain tick). L'UI affichera 0 ou un nombre
    // négatif, ce qui est le signal qu'il faut appeler /validate ou
    // /cancel, et on laisse le cron nettoyer.
    const secondsRemaining = Math.max(
      0,
      Math.floor((checkin.expiresAt.getTime() - Date.now()) / 1000),
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
