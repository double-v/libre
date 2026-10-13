/**
 * Présence au jour près (spec 011, #498). La session est un JWT : une visite
 * n'écrit rien sur `users`, et `lastActive` (`@updatedAt`) ne bouge qu'à une
 * modification de la ligne. On retient donc le **jour** de la dernière
 * navigation authentifiée, sans historique, et on ne l'écrit qu'une fois par
 * jour : c'est le seul coût qu'on accepte pour mesurer les retours.
 */

/** Minuit UTC du jour de `now` — même borne que la purge de rétention. */
export function jourDePresence(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Vrai si le jour retenu est absent ou antérieur au jour courant. */
export function doitEcrirePresence(lastSeenAt: Date | null | undefined, now: Date): boolean {
  if (!lastSeenAt) return true;
  return lastSeenAt.getTime() < jourDePresence(now).getTime();
}
