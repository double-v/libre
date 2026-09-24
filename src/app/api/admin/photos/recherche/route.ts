import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { getPhotoSignedUrl } from '@/lib/r2';

/**
 * Moteurs de recherche inversée (spec 006, R7). Chacun télécharge la photo
 * depuis l'URL qu'on lui passe : elle doit donc être publique le temps qu'il
 * la lise, et pas plus — d'où l'URL R2 signée 15 min.
 */
const MOTEURS = {
  lens: 'https://lens.google.com/uploadbyurl?url=',
  yandex: 'https://yandex.com/images/search?rpt=imageview&url=',
  tineye: 'https://tineye.com/search?url=',
} as const;

type Moteur = keyof typeof MOTEURS;

/**
 * Recherche d'image inversée en un clic (spec 006 · US1, #442).
 *
 * C'est le **seul** chemin par lequel une photo sort vers un tiers, d'où trois
 * verrous : un admin, une clé qui figure dans les photos d'un profil (jamais
 * un selfie de vérification, un dérivé flouté ou une clé inventée), et une
 * trace `SEARCH_PHOTO` écrite entre la signature et la redirection : pas de
 * sortie sans trace, pas de trace sans sortie.
 */
export async function GET(request: Request) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const params = new URL(request.url).searchParams;
  const moteur = params.get('moteur') ?? '';
  const cle = params.get('cle') ?? '';
  if (!Object.hasOwn(MOTEURS, moteur)) {
    return NextResponse.json({ error: 'Moteur inconnu' }, { status: 400 });
  }

  try {
    const proprietaire = cle
      ? await getDb().profile.findFirst({ where: { photos: { has: cle } }, select: { userId: true } })
      : null;
    if (!proprietaire) {
      return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });
    }

    // Signer d'abord : signer n'envoie rien à personne, et une trace écrite
    // avant un échec de signature mentirait (vu en local sans R2).
    const signee = await getPhotoSignedUrl(cle);
    await getDb().moderationLog.create({
      data: {
        adminId: adminResult.userId,
        targetUserId: proprietaire.userId,
        action: 'SEARCH_PHOTO',
        reason: `${moteur}:${cle}`,
      },
    });

    return NextResponse.redirect(MOTEURS[moteur as Moteur] + encodeURIComponent(signee), 302);
  } catch (error) {
    console.error('photos.search.failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer' }, { status: 500 });
  }
}
