/**
 * Garde « jamais de test sur une base partagée » (#548).
 *
 * Le `.env` d'un développeur pointe sur la base Neon de développement, et
 * Vitest le charge. Un test qui oublierait de simuler `getDb()` écrirait donc
 * dans une base partagée, et rien ne garantit qu'elle ne contienne jamais de
 * données réelles. On ferme par défaut : seule une base sur la machine (ou le
 * conteneur de service de la CI, joint par `localhost`) est acceptée. Toute
 * autre adresse est remplacée par une adresse qui ne répond pas, pour qu'un
 * accès imprévu échoue bruyamment au lieu d'écrire ailleurs.
 *
 * L'hôte est lu par `URL`, jamais par recherche de texte : « localhost » peut
 * figurer dans un mot de passe, un nom de base ou un sous-domaine piégé.
 */

const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Port 1 : réservé, rien n'y écoute ; une connexion échoue tout de suite. */
export const URL_NEUTRALISEE = 'postgresql://garde:garde@127.0.0.1:1/base-refusee-par-la-garde';

const VARIABLES = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED'] as const;

export function baseEstJetable(url: string | undefined): boolean {
  if (!url) return false;
  let hote: string;
  try {
    hote = new URL(url).hostname;
  } catch {
    return false;
  }
  return HOTES_LOCAUX.has(hote);
}

/**
 * Remplace en place toute adresse de base non locale. Rend la liste des
 * variables remplacées, pour que l'appelant puisse le signaler.
 */
export function neutraliserBaseDistante(env: Record<string, string | undefined>): string[] {
  const remplacees: string[] = [];
  for (const nom of VARIABLES) {
    const valeur = env[nom];
    if (valeur === undefined) continue;
    if (!baseEstJetable(valeur)) {
      env[nom] = URL_NEUTRALISEE;
      remplacees.push(nom);
    }
  }
  return remplacees;
}
