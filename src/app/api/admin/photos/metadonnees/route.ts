import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { nettoyerPhotoExistante } from '@/lib/r2';

/**
 * Profils par appel. Six photos au plus chacun, relues puis ré-encodées une à
 * une : un lot plus gros risquerait de dépasser la durée d'une fonction
 * Vercel, et un lot coupé en plein vol ne dit pas où il s'est arrêté.
 */
export const TAILLE_LOT = 5;

/**
 * Rattrapage #441 — retire les métadonnées des photos stockées avant le fix.
 *
 * Pas de cron (les crons Vercel sont morts, et la règle du dépôt est de
 * déclencher à la main ou par le trafic) : l'admin avance lot par lot, le
 * panneau rappelle la route avec le curseur rendu jusqu'à `null`. Rejouable
 * sans coût : une photo déjà propre n'est pas réécrite.
 *
 * Journalisé dans `ModerationLog` (cible = l'admin lui-même, comme
 * RUN_RETENTION), seulement quand le lot a changé ou raté quelque chose.
 */
export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  let curseur: string | null = null;
  try {
    const body = (await request.json()) as { curseur?: unknown };
    if (typeof body?.curseur === 'string' && body.curseur) curseur = body.curseur;
  } catch {
    // Corps absent ou illisible : premier lot.
  }

  try {
    const profils = await getDb().profile.findMany({
      where: { photos: { isEmpty: false } },
      select: { userId: true, photos: true },
      orderBy: { userId: 'asc' },
      take: TAILLE_LOT,
      ...(curseur ? { cursor: { userId: curseur }, skip: 1 } : {}),
    });

    const bilan = { profils: profils.length, nettoyees: 0, propres: 0, erreurs: 0 };
    for (const { photos } of profils) {
      for (const key of photos) {
        try {
          bilan[await nettoyerPhotoExistante(key) === 'nettoyee' ? 'nettoyees' : 'propres']++;
        } catch (err) {
          // Jamais la clé dans le journal : elle contient l'identifiant du membre.
          console.error('photos.metadata.strip.failed', err instanceof Error ? err.message : 'unknown');
          bilan.erreurs++;
        }
      }
    }

    if (bilan.nettoyees || bilan.erreurs) {
      await getDb().moderationLog.create({
        data: {
          adminId: adminResult.userId,
          targetUserId: adminResult.userId,
          action: 'STRIP_PHOTO_METADATA',
          reason: `lot de ${bilan.profils} profils ; ${bilan.nettoyees} nettoyees, ${bilan.erreurs} en echec`,
        },
      });
    }

    const suivant = profils.length === TAILLE_LOT ? profils[profils.length - 1].userId : null;
    return NextResponse.json({ ...bilan, curseur: suivant }, { status: 200 });
  } catch (error) {
    console.error('photos.metadata.run.failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer' }, { status: 500 });
  }
}
