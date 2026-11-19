import { getDb } from '@/lib/db';
import { retenirEmpreintesBannies } from '@/lib/fraude/bannissement';
import { estUuid } from './cas';
import type { ActionSignalement } from './gestes';

/**
 * Geste sur les signalements regroupés par motif (#568 ; DESIGN.md
 * « Signalements regroupés »). Côté serveur seulement : ce module ouvre la
 * base. Le regroupement lui-même, que la fiche (composant client) importe,
 * vit dans `grouper-signalements.ts`, sans aucune dépendance serveur.
 */

/** Plafond d'un groupe : au-delà, la fiche n'a pas pu tout montrer. */
export const GROUPE_MAX = 50;

const STATUT: Record<ActionSignalement, string> = {
  DISMISS_REPORT: 'dismissed',
  BAN: 'resolved',
  WARNING: 'resolved',
};

class GroupeEntame extends Error {}

/**
 * Trancher d'un geste les signalements d'un membre pour un motif.
 *
 * - **Ce que le modérateur a vu, rien d'autre** : la fiche envoie les
 *   identifiants affichés. Un signalement arrivé entre-temps n'est pas
 *   tranché sans avoir été lu.
 * - **Périmètre vérifié en base** : chaque identifiant doit désigner un
 *   signalement de ce membre et de ce motif, sinon rien n'est écrit
 *   (`introuvable`). Un identifiant d'un autre membre ne passe pas.
 * - **Tout ou rien** : l'écriture est conditionnée au statut `pending` et
 *   tient dans une transaction. Si un seul signalement a déjà été tranché
 *   (par un autre modérateur, ou par un double envoi), tout est annulé
 *   (`deja_traite`) et la fiche se recharge.
 * - **Une seule ligne de journal** : le journal raconte les décisions prises
 *   sur un membre, et il n'y en a eu qu'une. Trois lignes « BAN » pour un
 *   bannissement fausseraient l'historique et les comptes d'activité, et
 *   l'avertissement de l'US6 partirait trois fois. La trace par signalement
 *   existe déjà : chacun porte son statut, son modérateur et sa date. La
 *   ligne est celle du geste unitaire (même action, même motif, FR-023).
 * - Un compte admin ne se bannit pas d'ici (`admin`), comme par la fiche.
 */
export async function traiterGroupeSignalements(
  adminId: string,
  membreId: string,
  motifSignalement: string,
  ids: string[],
  action: ActionSignalement,
  motif: string | null,
): Promise<'introuvable' | 'deja_traite' | 'admin' | null> {
  if (!estUuid(membreId) || ids.length === 0 || ids.length > GROUPE_MAX) return 'introuvable';
  if (new Set(ids).size !== ids.length || !ids.every(estUuid)) return 'introuvable';
  const db = getDb();

  const trouves = await db.report.findMany({
    where: { id: { in: ids }, reportedId: membreId, reason: motifSignalement },
    select: { id: true },
  });
  if (trouves.length !== ids.length) return 'introuvable';

  if (action === 'BAN') {
    const cible = await db.user.findUnique({ where: { id: membreId }, select: { role: true } });
    if (!cible) return 'introuvable';
    if (cible.role === 'ADMIN') return 'admin';
  }

  try {
    await db.$transaction(async (tx) => {
      const { count } = await tx.report.updateMany({
        where: { id: { in: ids }, reportedId: membreId, reason: motifSignalement, status: 'pending' },
        data: { status: STATUT[action], reviewedBy: adminId, resolvedAt: new Date() },
      });
      if (count !== ids.length) throw new GroupeEntame();
      if (action === 'BAN') await tx.user.update({ where: { id: membreId }, data: { isBanned: true } });
      await tx.moderationLog.create({ data: { adminId, targetUserId: membreId, action, reason: motif } });
    });
  } catch (err) {
    if (err instanceof GroupeEntame) return 'deja_traite';
    throw err;
  }
  // Après la validation : ses photos et son identité ne reviendront pas sur un
  // autre compte (spec 006, spec 010). Hors transaction, comme le geste
  // unitaire : une panne ici ne défait pas le bannissement.
  if (action === 'BAN') await retenirEmpreintesBannies(membreId);
  return null;
}
