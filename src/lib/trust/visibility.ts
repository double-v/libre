/**
 * Visibilité publique du niveau de confiance.
 *
 * Cf. chantier 01 — Phase 3, tâche 3.6.
 *
 * Pour éviter la stalkerisation par bande : un user ne voit pas les bands
 * au-dessus de son propre band + 1 cran.
 *
 * Exemples :
 * - viewer=anchor → voit tout (anchor, trusted, member, newcomer)
 * - viewer=trusted → voit anchor (puisqu'il est +1) ET trusted, member, newcomer
 *   (non en fait, target=anchor > viewer+1=trusted, donc on clamp à trusted)
 * - viewer=member → voit trusted (member+1) max, mais PAS anchor
 * - viewer=newcomer → voit member max
 *
 * Formule : publicBand = min(targetBand, viewerBand + 1)
 * où les bands sont ordonnés newcomer(0) < member(1) < trusted(2) < anchor(3).
 */
import type { TrustBand } from './compute-level';

const BAND_RANK: Record<TrustBand, number> = {
  newcomer: 0,
  member: 1,
  trusted: 2,
  anchor: 3,
};

const RANK_TO_BAND: TrustBand[] = ['newcomer', 'member', 'trusted', 'anchor'];

/**
 * Calcule le band public d'un user vu par un autre user.
 *
 * @param viewerBand le band de l'utilisateur qui regarde
 * @param targetBand le band de l'utilisateur affiché (peut être null = inconnu)
 * @returns le band effectivement affichable, ou `newcomer` si target inconnu
 */
export function publicBand(
  viewerBand: TrustBand,
  targetBand: TrustBand | null,
): TrustBand {
  if (targetBand === null) return 'newcomer';
  const viewerRank = BAND_RANK[viewerBand];
  const targetRank = BAND_RANK[targetBand];
  const maxVisibleRank = Math.min(targetRank, viewerRank + 1);
  return RANK_TO_BAND[maxVisibleRank];
}
