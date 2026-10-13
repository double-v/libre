import { getDb } from '@/lib/db';
import { retenirEmpreintesBannies } from '@/lib/fraude/bannissement';
import { effacerCompte } from '@/lib/suppression-compte';

/**
 * Gestes de modération partagés (spec 011, R5). La route unitaire, la page
 * Indices et, demain, les gestes par lot passent par ici : un même geste a
 * un seul effet et une seule ligne de journal, quel que soit l'écran.
 */

export const DECISIONS = ['rien', 'verification', 'banni'] as const;
export type Decision = (typeof DECISIONS)[number];

const ACTIONS: Record<Decision, string> = {
  rien: 'PROFILE_REVIEW_RIEN',
  verification: 'PROFILE_REVIEW_VERIFICATION',
  banni: 'PROFILE_REVIEW_BANNI',
};

/**
 * Trancher un dossier (spec 006, US4). Trois décisions, toutes humaines et
 * journalisées :
 * - **rien** : le dossier est clos ; seul un signal nouveau le rouvre, et une
 *   mise en retrait éventuelle est levée ;
 * - **verification** : mise en retrait — le compte disparaît pour les autres
 *   jusqu'à l'approbation de son badge selfie (#436) ;
 * - **banni** : le bannissement existant.
 */
export async function deciderProfil(adminId: string, userId: string, decision: Decision, motif: string | null): Promise<void> {
  const db = getDb();
  const maintenant = new Date();
  await db.profileReview.upsert({
    where: { userId },
    update: { decision, decidedAt: maintenant, decidedBy: adminId },
    create: { userId, decision, decidedAt: maintenant, decidedBy: adminId },
  });
  if (decision === 'verification') {
    await db.user.update({ where: { id: userId }, data: { retraitAt: maintenant } });
  } else if (decision === 'banni') {
    await db.user.update({ where: { id: userId }, data: { isBanned: true } });
    await retenirEmpreintesBannies(userId);
  } else {
    await db.user.update({ where: { id: userId }, data: { retraitAt: null } });
  }
  await db.moderationLog.create({
    data: { adminId, targetUserId: userId, action: ACTIONS[decision], reason: motif },
  });
}

export type RefusDoublon = 'introuvable' | 'confirme' | 'actif' | 'pas_lies';

/**
 * Supprimer le compte jamais confirmé d'un doublon probable (spec 011, US2).
 * Tout est revérifié en base, jamais pris sur la foi de l'écran : l'orphelin
 * n'a pas confirmé son adresse, partage l'appareil du compte gardé, et n'a
 * ni photo, ni like envoyé, ni match — sinon ce n'est plus une faute de
 * frappe et la décision passe par la fiche.
 *
 * Le journal se rattache au compte **gardé** : une ligne qui viserait
 * l'orphelin partirait avec lui (cascade).
 */
export async function supprimerDoublon(adminId: string, orphelinId: string, gardeId: string): Promise<RefusDoublon | null> {
  const db = getDb();
  const [orphelin, garde] = await Promise.all([
    db.user.findUnique({
      where: { id: orphelinId },
      select: {
        emailVerified: true,
        deviceId: true,
        profile: { select: { photos: true } },
        _count: { select: { sentLikes: true, matchesAsA: true, matchesAsB: true } },
      },
    }),
    db.user.findUnique({ where: { id: gardeId }, select: { deviceId: true } }),
  ]);
  if (!orphelin || !garde) return 'introuvable';
  if (orphelin.emailVerified) return 'confirme';
  if (!orphelin.deviceId || orphelin.deviceId !== garde.deviceId) return 'pas_lies';
  const c = orphelin._count;
  if ((orphelin.profile?.photos.length ?? 0) > 0 || c.sentLikes + c.matchesAsA + c.matchesAsB > 0) return 'actif';

  await effacerCompte(orphelinId);
  await deciderProfil(adminId, gardeId, 'rien', null);
  await db.moderationLog.create({
    data: { adminId, targetUserId: gardeId, action: 'DELETE_DUPLICATE', reason: 'Doublon : compte jamais confirmé supprimé' },
  });
  return null;
}
