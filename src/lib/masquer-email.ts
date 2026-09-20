/**
 * Masquage partiel d'une adresse e-mail pour les vues de liste du back-office
 * (#423, RGPD art. 5.1.c — minimisation).
 *
 * Une liste sert à reconnaître un compte, pas à le contacter : deux caractères
 * de la partie locale et du domaine suffisent, le TLD reste lisible pour
 * distinguer `gmail.com` de `gmail.fr`. L'adresse complète ne s'affiche que
 * sur la fiche détail, accès ciblé et journalisable.
 */
export function masquerEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domaine = email.slice(at + 1);
  const point = domaine.lastIndexOf('.');
  const nom = point > 0 ? domaine.slice(0, point) : domaine;
  const tld = point > 0 ? domaine.slice(point) : '';
  return `${amorce(local)}***@${amorce(nom)}***${tld}`;
}

// Deux caractères d'amorce, un seul quand la partie n'en compte que deux :
// sinon `ab@…` afficherait la partie locale entière.
function amorce(partie: string): string {
  return partie.slice(0, partie.length > 2 ? 2 : 1);
}
