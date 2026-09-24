/**
 * Date d'une publication, telle que la lisent les membres : en français et à
 * l'heure de Paris — une nouvelle publiée à 23 h 30 appartient au lendemain
 * pour un lecteur français, pas à la veille UTC du serveur.
 */
const FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });

export function dateLongue(date: Date): string {
  return FORMAT.format(date);
}
