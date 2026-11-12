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

/**
 * Seuls les noms créés par la CI et par `scripts/base-de-test.sh`. Un hôte
 * local ne suffit pas : un développeur peut y garder une base de dev
 * persistante, qu'aucun test ne doit remplir.
 */
const BASES_DE_TEST = new Set(['libre_ci', 'libre_test']);

/**
 * Liste blanche des paramètres d'URL. Le pilote `pg` laisse `?host=` ou
 * `?hostaddr=` remplacer l'hôte de l'URL : un paramètre inconnu pourrait donc
 * envoyer la connexion ailleurs que là où la garde a regardé.
 */
const PARAMETRES_ADMIS = new Set(['sslmode', 'connect_timeout', 'application_name']);

/** Port 1 : réservé, rien n'y écoute ; une connexion échoue tout de suite. */
export const URL_NEUTRALISEE = 'postgresql://garde:garde@127.0.0.1:1/base-refusee-par-la-garde';

const VARIABLES = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED'] as const;

export function baseEstJetable(url: string | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (!HOTES_LOCAUX.has(u.hostname)) return false;
  if (!BASES_DE_TEST.has(decodeURIComponent(u.pathname.replace(/^\//, '')))) return false;
  for (const cle of u.searchParams.keys()) {
    if (!PARAMETRES_ADMIS.has(cle)) return false;
  }
  return true;
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

/**
 * Identifiants des services qui envoient ou stockent pour de vrai (temps réel,
 * Redis, stockage de photos, e-mail, push, GIF, anti-robot). Pendant les
 * tests, un oubli de simulation ne doit rien envoyer : sans identifiant, le
 * code retombe sur son repli local ou échoue, jamais sur le service réel.
 * Les clés publiques (`NEXT_PUBLIC_*`) ne donnent aucun droit et restent.
 */
const SERVICES_EXTERNES = [
  'PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
  'RESEND_API_KEY', 'VAPID_PRIVATE_KEY', 'GIPHY_API_KEY', 'TURNSTILE_SECRET_KEY',
] as const;

export function effacerServicesExternes(env: Record<string, string | undefined>): string[] {
  const effaces: string[] = [];
  for (const nom of SERVICES_EXTERNES) {
    if (nom in env) {
      delete env[nom];
      effaces.push(nom);
    }
  }
  return effaces;
}
