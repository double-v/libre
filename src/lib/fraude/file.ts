import { getDb } from '@/lib/db';
import { dansLaFile } from './signaux';

/** Au-delà, la file n'est plus une file : on verra ce jour-là. */
const MAX_COMPTES = 500;

/**
 * Les comptes de la file « Profils à vérifier » (spec 006, US4). Source
 * unique pour la page et pour le compteur de la navigation admin : les deux
 * appliquent `dansLaFile`, jamais un `count` qui compterait autre chose.
 */
export async function lireFile() {
  const comptes = await getDb().user.findMany({
    where: { isBanned: false, profileSignals: { some: {} } },
    select: {
      id: true,
      displayName: true,
      email: true,
      createdAt: true,
      retraitAt: true,
      profile: { select: { photos: true, bio: true } },
      profileSignals: {
        select: { type: true, force: true, extrait: true, photoKey: true, autreUserId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      profileReview: { select: { decision: true, decidedAt: true } },
    },
    take: MAX_COMPTES,
  });
  return comptes.filter((c) => dansLaFile(c.profileSignals, c.profileReview?.decidedAt ?? null));
}

export async function compterProfilsAVerifier(): Promise<number> {
  return (await lireFile()).length;
}
