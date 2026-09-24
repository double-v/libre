import { getDb } from '@/lib/db';

/**
 * Lectures des pages publiques du journal (spec 007, US1). Seules les
 * publications `publiee` sortent d'ici, et jamais `auteurId` : la signature
 * publique est « L'équipe Libre ».
 *
 * Pas de filet `try/catch` : une panne de lecture pendant une régénération
 * doit échouer, pour que Next garde la page précédente au lieu de mettre en
 * cache une liste vide ou un « introuvable » pendant une heure.
 */
export const ORIGINE = 'https://www.getlibre.fr';
export const LIMITE_LISTE = 50;

export async function listerPubliees() {
  return getDb().journalPost.findMany({
    where: { statut: 'publiee' },
    orderBy: { publieeAt: 'desc' },
    take: LIMITE_LISTE,
    select: { slug: true, titre: true, corps: true, publieeAt: true },
  });
}

export async function trouverPubliee(slug: string) {
  return getDb().journalPost.findFirst({
    where: { slug, statut: 'publiee' },
    select: { slug: true, titre: true, corps: true, publieeAt: true, modifieeAt: true },
  });
}
