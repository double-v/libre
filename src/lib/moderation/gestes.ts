import { getDb } from '@/lib/db';
import { retenirEmpreintesBannies } from '@/lib/fraude/bannissement';
import { enregistrerSignal } from '@/lib/fraude/signaux';
import { deletePhoto } from '@/lib/r2';
import { effacerCompte } from '@/lib/suppression-compte';
import type { MotifRefus } from '@/lib/verification/motifs';
import { MOTIFS_SANCTION, type MotifSanction } from './reperes';

/**
 * Gestes de modération partagés (spec 011, R5 ; spec 012, T003). Les routes
 * unitaires, le hub Membres et, demain, les gestes par lot passent par ici :
 * un même geste a un seul effet et une seule ligne de journal, quel que soit
 * l'écran (FR-023). Aucune de ces fonctions ne connaît HTTP : elles rendent
 * `null` quand le geste est appliqué, ou la raison du refus.
 */

/** Uuid bien formé : une colonne `@db.Uuid` ferait lever Prisma sur le reste. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const estUuid = (id: string): boolean => UUID.test(id);

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

export type ActionSignalement = 'DISMISS_REPORT' | 'BAN' | 'WARNING';

const STATUT_SIGNALEMENT: Record<ActionSignalement, string> = {
  DISMISS_REPORT: 'dismissed',
  BAN: 'resolved',
  WARNING: 'resolved',
};

/**
 * Trancher un signalement : sans suite, avertissement (journalisé seulement,
 * le message au membre arrive avec la spec 012 US6) ou bannissement.
 */
export async function traiterSignalement(
  adminId: string,
  reportId: string,
  action: ActionSignalement,
  motif: string | null,
): Promise<'introuvable' | null> {
  const db = getDb();
  if (!estUuid(reportId)) return 'introuvable';
  const report = await db.report.findUnique({ where: { id: reportId }, select: { reportedId: true } });
  if (!report) return 'introuvable';

  await db.report.update({
    where: { id: reportId },
    data: { status: STATUT_SIGNALEMENT[action], reviewedBy: adminId, resolvedAt: new Date() },
  });
  if (action === 'BAN') {
    await db.user.update({ where: { id: report.reportedId }, data: { isBanned: true } });
    // Ses photos ne pourront pas revenir sur un autre compte (spec 006).
    await retenirEmpreintesBannies(report.reportedId);
  }
  await db.moderationLog.create({
    data: { adminId, targetUserId: report.reportedId, action, reason: motif },
  });
  return null;
}

export type DecisionVerification =
  | { action: 'APPROVE_VERIFICATION' }
  | { action: 'REJECT_VERIFICATION'; motif: MotifRefus };

/**
 * Valider ou refuser un selfie (#436, spec 012 US1/US2). L'écriture est
 * conditionnée au statut : deux modérateurs qui décident en même temps
 * n'écrivent qu'une décision, et le second l'apprend (`deja_traite`).
 * Rend le membre concerné : la route lui envoie la notification après la
 * réponse (FR-010).
 */
export async function deciderVerification(
  adminId: string,
  verificationId: string,
  decision: DecisionVerification,
): Promise<'introuvable' | 'deja_traite' | { userId: string; approuvee: boolean }> {
  const db = getDb();
  if (!estUuid(verificationId)) return 'introuvable';
  const verification = await db.verificationRequest.findUnique({
    where: { id: verificationId },
    select: { userId: true, status: true },
  });
  if (!verification) return 'introuvable';
  // Une décision ne se réécrit pas en silence : le membre l'a peut-être déjà lue.
  if (verification.status !== 'pending') return 'deja_traite';

  const approuvee = decision.action === 'APPROVE_VERIFICATION';
  const { count } = await db.verificationRequest.updateMany({
    where: { id: verificationId, status: 'pending' },
    data: {
      status: approuvee ? 'approved' : 'rejected',
      rejectReason: decision.action === 'REJECT_VERIFICATION' ? decision.motif : null,
      reviewedBy: adminId,
      resolvedAt: new Date(),
    },
  });
  if (count !== 1) return 'deja_traite';

  if (approuvee) {
    // Le badge lève la mise en retrait (spec 006, #444) et l'invitation
    // automatique (spec 010, FR-019).
    await db.user.update({
      where: { id: verification.userId },
      data: { isVerified: true, retraitAt: null, verifInviteeAt: null },
    });
  } else {
    // Spec 010, FR-019 : un selfie refusé après une invitation automatique
    // fait entrer le compte dans la file — la suite revient à un humain.
    const u = await db.user.findUnique({ where: { id: verification.userId }, select: { verifInviteeAt: true } });
    if (u?.verifInviteeAt) {
      await enregistrerSignal({ userId: verification.userId, type: 'verification_refusee', force: 'fort', cle: verificationId });
    }
  }

  await db.moderationLog.create({
    data: {
      adminId,
      targetUserId: verification.userId,
      action: decision.action,
      reason: decision.action === 'REJECT_VERIFICATION' ? decision.motif : null,
    },
  });
  return { userId: verification.userId, approuvee };
}

/**
 * Retirer une réponse aux questions de profil (spec 009, US3). La réponse
 * passe `removed` et garde ce qui est retiré : une republication à
 * l'identique sera refusée. Journalisé avec la clé de question, jamais le
 * texte, qui resterait lisible dans le journal après une réécriture.
 */
export async function retirerReponse(adminId: string, answerId: string): Promise<'introuvable' | null> {
  const db = getDb();
  if (!estUuid(answerId)) return 'introuvable';
  const answer = await db.profileAnswer.findUnique({
    where: { id: answerId },
    select: { userId: true, questionKey: true, text: true, choices: true },
  });
  if (!answer) return 'introuvable';
  await db.profileAnswer.update({
    where: { id: answerId },
    data: { status: 'removed', removedText: answer.text, removedChoices: answer.choices, removedAt: new Date() },
  });
  await db.moderationLog.create({
    data: { adminId, targetUserId: answer.userId, action: 'REMOVE_ANSWER', reason: answer.questionKey },
  });
  return null;
}

/**
 * Retirer une photo (#323) : la sanction proportionnée, le compte reste.
 * `filter` garde l'ordre : retirer l'avatar promeut la suivante. Le motif est
 * obligatoire : un retrait sans motif est indéfendable si la personne conteste.
 * Le nettoyage R2 et celui de la classification sont au mieux : leur échec
 * n'annule pas le retrait acté en base.
 */
export async function retirerPhoto(
  adminId: string,
  userId: string,
  photoKey: string,
  motif: string,
): Promise<'profil_introuvable' | 'photo_introuvable' | { photos: string[] }> {
  const db = getDb();
  if (!estUuid(userId)) return 'profil_introuvable';
  const profile = await db.profile.findUnique({ where: { userId }, select: { photos: true } });
  if (!profile) return 'profil_introuvable';
  if (!profile.photos.includes(photoKey)) return 'photo_introuvable';

  const updated = await db.profile.update({
    where: { userId },
    data: { photos: profile.photos.filter((p) => p !== photoKey) },
    select: { photos: true },
  });
  await db.moderationLog.create({
    data: { adminId, targetUserId: userId, action: 'REMOVE_PHOTO', reason: motif },
  });

  try {
    await deletePhoto(photoKey);
  } catch (err) {
    console.error('[moderation/retirerPhoto] effacement R2 échoué', err instanceof Error ? err.message.slice(0, 80) : 'inconnu');
  }
  try {
    const moderation = await db.photoModeration.findUnique({ where: { key: photoKey } });
    if (moderation) {
      await db.photoModeration.delete({ where: { key: photoKey } });
      await deletePhoto(moderation.blurredKey);
    }
  } catch (err) {
    console.error('[moderation/retirerPhoto] nettoyage de la classification échoué', err instanceof Error ? err.message.slice(0, 80) : 'inconnu');
  }
  return { photos: updated.photos };
}

/** Bannir ou débannir hors signalement (fiche membre). */
export async function changerBannissement(
  adminId: string,
  userId: string,
  banni: boolean,
  motif: string | null,
): Promise<'introuvable' | null> {
  const db = getDb();
  if (!estUuid(userId)) return 'introuvable';
  const { count } = await db.user.updateMany({ where: { id: userId }, data: { isBanned: banni } });
  if (count !== 1) return 'introuvable';
  // Ses photos ne pourront pas revenir sur un autre compte (spec 006).
  if (banni) await retenirEmpreintesBannies(userId);
  await db.moderationLog.create({
    data: { adminId, targetUserId: userId, action: banni ? 'BAN' : 'UNBAN', reason: motif },
  });
  return null;
}

/**
 * Inviter au selfie à la main : même effet que l'invitation automatique de
 * la spec 010, **sans** retrait. Idempotente : une invitation déjà posée
 * garde sa date d'origine et n'écrit pas de seconde ligne de journal.
 */
export async function inviterVerification(
  adminId: string,
  userId: string,
): Promise<'introuvable' | 'deja_verifie' | { depuis: Date }> {
  const db = getDb();
  if (!estUuid(userId)) return 'introuvable';
  const u = await db.user.findUnique({ where: { id: userId }, select: { isVerified: true, verifInviteeAt: true } });
  if (!u) return 'introuvable';
  if (u.isVerified) return 'deja_verifie';
  if (u.verifInviteeAt) return { depuis: u.verifInviteeAt };

  const maintenant = new Date();
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { verifInviteeAt: maintenant } }),
    db.moderationLog.create({ data: { adminId, targetUserId: userId, action: 'INVITE_VERIFICATION', reason: null } }),
  ]);
  return { depuis: maintenant };
}


/**
 * Supprimer un compte (FR-S11 : jamais par lot). Même chemin que la
 * suppression par le membre, photos R2 comprises (#437).
 *
 * Le journal se rattache au compte de l'**admin** : une ligne qui viserait le
 * compte supprimé partirait avec lui (cascade), et sa création échouait
 * jusqu'ici après l'effacement (contrainte de clé étrangère) — la suppression
 * avait lieu, sans trace et avec une erreur 500. Le motif est un libellé de
 * la liste fermée ; le pseudo supprimé n'est pas recopié.
 */
export async function supprimerCompte(adminId: string, userId: string, motif: MotifSanction): Promise<'introuvable' | null> {
  const db = getDb();
  if (!estUuid(userId)) return 'introuvable';
  if ((await db.user.count({ where: { id: userId } })) === 0) return 'introuvable';
  await effacerCompte(userId);
  await db.moderationLog.create({
    data: { adminId, targetUserId: adminId, action: 'DELETE_USER', reason: `Compte supprimé : ${MOTIFS_SANCTION[motif].toLowerCase()}` },
  });
  return null;
}
