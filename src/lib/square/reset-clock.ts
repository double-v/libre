/**
 * Horloge du reset de La Place (#13) — partagée serveur et client.
 *
 * Aucune dépendance à Prisma ni au DOM : le bandeau (client) et le reset
 * paresseux (serveur) doivent compter vers **le même instant**, sinon le
 * compte à rebours ment. C'était déjà le cas avant ce lot : le bandeau visait
 * 3h *locales* quand `vercel.json` déclarait le cron à 2h *UTC*.
 */

/** Heure UTC du reset quotidien — celle déclarée dans `vercel.json`. */
export const SQUARE_RESET_HOUR_UTC = 2;

/**
 * Borne du dernier reset attendu : le dernier passage à `SQUARE_RESET_HOUR_UTC`
 * qui soit ≤ `now`. C'est cette valeur, et non l'instant d'exécution, qu'on
 * inscrit en base : deux instances qui traitent la même journée écrivent alors
 * la même chose, et la réclamation reste idempotente.
 */
export function lastResetBoundary(now: Date = new Date()): Date {
  const borne = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    SQUARE_RESET_HOUR_UTC,
  ));
  if (borne.getTime() > now.getTime()) {
    borne.setUTCDate(borne.getUTCDate() - 1);
  }
  return borne;
}

/** Prochain reset attendu, strictement après `now`. */
export function nextResetBoundary(now: Date = new Date()): Date {
  const suivant = new Date(lastResetBoundary(now));
  suivant.setUTCDate(suivant.getUTCDate() + 1);
  return suivant;
}

/** Millisecondes restantes avant le prochain reset. */
export function msUntilNextReset(now: Date = new Date()): number {
  return nextResetBoundary(now).getTime() - now.getTime();
}
