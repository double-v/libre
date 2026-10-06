import { getDb } from '@/lib/db';
import { douteSerieux, signauxRecents } from './fiabilite';

/**
 * Invitation automatique à la vérification (spec 010, R9). Clarification du
 * 2026-10-05 : **aucun** effet sur la visibilité ni sur les échanges. Le
 * retrait de la spec 006 mène à l'effacement après 90 jours sans selfie ; une
 * machine ne doit pas le décider seule (RGPD art. 22). L'invitation dit
 * seulement « fais le selfie » ; le modérateur garde la main via la file.
 *
 * Best-effort : appelée dans `after()`, elle ne fait jamais échouer la
 * requête du membre.
 * @returns vrai si une invitation vient d'être posée.
 */
export async function evaluerCompte(userId: string): Promise<boolean> {
  try {
    const db = getDb();
    const u = await db.user.findUnique({
      where: { id: userId },
      select: {
        isVerified: true,
        isBanned: true,
        retraitAt: true,
        verifInviteeAt: true,
        profileReview: { select: { decidedAt: true } },
        profileSignals: { select: { type: true, force: true, createdAt: true } },
      },
    });
    if (!u || u.isVerified || u.isBanned || u.retraitAt || u.verifInviteeAt) return false;
    const recents = signauxRecents(u.profileSignals, u.profileReview?.decidedAt ?? null);
    if (!douteSerieux(recents)) return false;
    // Le motif reste dans le journal admin : types seulement, jamais d'extrait.
    const motifs = [...new Set(recents.map((s) => s.type))].join(',').slice(0, 200);
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { verifInviteeAt: new Date() } }),
      db.moderationLog.create({ data: { adminId: null, targetUserId: userId, action: 'INVITE_VERIFICATION', reason: motifs } }),
    ]);
    return true;
  } catch (err) {
    console.warn('fraude.invitation.failed', { message: (err as Error)?.message?.slice(0, 80) });
    return false;
  }
}
