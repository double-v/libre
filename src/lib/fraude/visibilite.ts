/**
 * Qui un autre membre peut voir (spec 006, data-model.md) : ni un compte
 * banni, ni un compte mis en retrait en attendant sa vérification par selfie.
 *
 * Une seule définition, sous deux formes — un fragment de `where` Prisma pour
 * les requêtes, un prédicat pour les listes filtrées en mémoire. La garde
 * `visibilite-gardes.test.ts` nomme toute route qui liste des profils sans
 * passer par ici : un `isBanned` isolé oublierait la mise en retrait.
 */
export const visiblePourAutrui = { isBanned: false, retraitAt: null } as const;

/** À ajouter au `select` d'un utilisateur pour pouvoir appeler `estVisible`. */
export const selectVisibilite = { isBanned: true, retraitAt: true } as const;

export function estVisible(u: { isBanned: boolean; retraitAt?: Date | null }): boolean {
  return !u.isBanned && !u.retraitAt;
}
