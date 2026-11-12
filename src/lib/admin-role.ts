import { getDb } from '@/lib/db';

/**
 * Relecture du rôle admin en base, fermée en cas d'échec (#547).
 *
 * Pourquoi en base : le JWT peut être périmé après une rétrogradation (#155),
 * ou appartenir à une session volée. Pourquoi fermée : si la base ne répond
 * pas, on ne connaît plus le rôle réel, et le principe III de la constitution
 * veut que l'échec d'une règle ferme l'accès. Il n'y a donc **aucun repli sur
 * le rôle du jeton** : une panne de base rend l'administration indisponible,
 * ce qui est le prix accepté pour qu'elle ne s'ouvre jamais à tort.
 *
 * Module sans dépendance à next-auth : `verifyAdmin` (routes API) et le layout
 * admin (qui décode lui-même son cookie) partagent ainsi la même décision.
 */
export async function estAdminEnBase(userId: string, origine: string): Promise<boolean> {
  let compte: { role: string | null; isBanned: boolean } | null;
  try {
    compte = await getDb().user.findUnique({
      where: { id: userId },
      select: selectStatutCompte,
    });
  } catch (err) {
    journaliserRefusBaseInjoignable(origine, err);
    return false;
  }
  return compteEstAdmin(compte);
}

/**
 * Champs à relire pour statuer sur un compte (#552) : à étaler dans un
 * `select` Prisma, pour que la garde et les routes lisent la même chose.
 */
export const selectStatutCompte = { role: true, isBanned: true } as const;

/** Un compte banni n'agit plus, même si son jeton est encore valide. */
export function compteEstBanni(compte: { isBanned: boolean }): boolean {
  return compte.isBanned;
}

/**
 * La règle elle-même, sur un compte déjà relu en base : rôle ADMIN (casse
 * ignorée) et compte non banni. Partagée par la garde ci-dessus, le proxy et
 * le badge de La Place (#552), pour qu'aucun accès ni aucune publication ne
 * repose sur le rôle du jeton. (Le lien « Admin » de `SiteNav` lit encore le
 * jeton : c'est un affichage, la cible répond 404 à un non-admin.)
 *
 * Un compte banni perd l'administration avec le reste : le proxy le renvoie
 * déjà vers /login sur les pages, mais il ne voit pas /api/*.
 */
export function compteEstAdmin(compte: { role: string | null; isBanned: boolean } | null): boolean {
  if (!compte || compteEstBanni(compte)) return false;
  return compte.role?.toUpperCase() === 'ADMIN';
}

/**
 * Trace le refus pour base injoignable, pour qu'une panne ne passe pas pour
 * une simple 404. Motif, nature de l'erreur et code Prisma seulement (le code,
 * P2022 par exemple, distingue une dérive de schéma d'une panne réseau) : ni
 * identifiant, ni e-mail, ni rôle du jeton, ni message d'erreur (qui peut
 * citer la requête).
 */
export function journaliserRefusBaseInjoignable(origine: string, err: unknown): void {
  const nature = err instanceof Error ? err.name : 'inconnue';
  const code = (err as { code?: unknown } | null)?.code;
  const suffixe = typeof code === 'string' && /^[A-Z0-9_]{1,16}$/.test(code) ? ` ${code}` : '';
  console.error(`[${origine}] accès admin refusé : base injoignable (${nature}${suffixe})`);
}
