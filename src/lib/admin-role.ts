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
  let role: string | undefined;
  try {
    const compte = await getDb().user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    role = compte?.role?.toUpperCase();
  } catch (err) {
    journaliserRefusBaseInjoignable(origine, err);
    return false;
  }
  return role === 'ADMIN';
}

/**
 * Trace le refus pour base injoignable, pour qu'une panne ne passe pas pour
 * une simple 404. Motif et nature de l'erreur seulement : ni identifiant, ni
 * e-mail, ni rôle du jeton, ni message d'erreur (qui peut citer la requête).
 */
export function journaliserRefusBaseInjoignable(origine: string, err: unknown): void {
  const nature = err instanceof Error ? err.name : 'inconnue';
  console.error(`[${origine}] accès admin refusé : base injoignable (${nature})`);
}
