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
/**
 * Compte à rebours lisible : « 4 h 12 » (#358).
 *
 * **Tronque, jamais n'arrondit** : à 59 s de la borne, annoncer « 0 h 01 »
 * promet une minute qui n'existe déjà plus. Le rituel affiché ne vaut que s'il
 * est en retard sur le réel plutôt qu'en avance.
 */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const heures = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${heures} h ${minutes.toString().padStart(2, '0')}`;
}

/**
 * Heure de réouverture telle qu'elle s'est réellement produite, lue dans le
 * fuseau du lecteur (#358).
 *
 * `timeZone` n'existe que pour les tests : en production on laisse `Intl`
 * prendre le fuseau du navigateur. C'est le seul endroit où la borne UTC
 * redevient une heure locale — et il est unique exprès, puisque c'est
 * précisément la conversion faite au jugé qui avait produit le « minuit » du
 * canvas et le « 3h » du bandeau d'avant #13.
 */
export function formatReopenClock(now: Date = new Date(), timeZone?: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(lastResetBoundary(now));
}
