/**
 * URL des commandes de schéma Prisma (migrate, introspect) — **jamais** le pooler.
 *
 * `prisma migrate deploy` prend `pg_advisory_lock(72707369)`, un verrou de
 * **session**. Passé par pgbouncer, la connexion serveur retourne au pool à la
 * fin de la migration sans le relâcher : le backend sert ensuite du trafic
 * applicatif ordinaire en gardant le verrou de migration, et toute migration
 * suivante meurt en P1002. Cinq runs de CI perdus le 2026-08-24, un verrou
 * observé tenu plus de treize minutes (#363).
 *
 * Vit dans son propre module — et non dans `prisma.config.ts` — pour être
 * testable : la règle de réécriture touche une chaîne qui contient un mot de
 * passe, elle mérite mieux qu'une relecture à l'œil.
 */

/** Sentinelle acceptée par le CLI quand aucune URL n'est configurée. */
export const URL_PLACEHOLDER = "postgresql://placeholder:5432/placeholder";

/**
 * L'environnement, vu comme un simple sac de variables.
 *
 * Volontairement plus large que ce que la fonction lit (`DATABASE_URL` et
 * `DATABASE_URL_UNPOOLED`) : un type aux propriétés toutes optionnelles
 * déclencherait la détection de « weak type » de TypeScript et refuserait
 * `process.env`, que Next augmente d'un `NODE_ENV` requis.
 */
export type EnvMigration = Readonly<Record<string, string | undefined>>;

/**
 * Deux sources, dans cet ordre :
 *
 * 1. `DATABASE_URL_UNPOOLED` si elle existe — la variable déjà posée sur Vercel,
 *    qui ne servait à rien tant que `directUrl` était censé la porter.
 * 2. sinon, l'endpoint direct **dérivé** de `DATABASE_URL` en retirant `-pooler`
 *    de l'hôte. Même dérivation que `.github/workflows/ci.yml`, et pour la même
 *    raison : une seule source de vérité, rien à resynchroniser le jour où
 *    l'URL change.
 */
export function urlDeMigration(env: EnvMigration = process.env): string {
  const nonPoole = env.DATABASE_URL_UNPOOLED;
  if (nonPoole) return nonPoole;

  const url = env.DATABASE_URL;
  if (!url) return URL_PLACEHOLDER;

  return endpointDirect(url);
}

/**
 * Retire `-pooler` de l'**hôte** seulement.
 *
 * Ancré entre `@` et le premier `/`, `?` ou `@` : un mot de passe qui
 * contiendrait `-pooler.` doit sortir intact. C'est le piège que le `sed` du
 * workflow documente déjà.
 */
export function endpointDirect(url: string): string {
  return url.replace(/@([^@/?]*)-pooler\./, "@$1.");
}
