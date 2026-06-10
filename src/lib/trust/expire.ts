/**
 * expireOverdueCheckins — Lazy expiration on read des SafetyCheckin.
 *
 * Cf. #94 — remplace le cron Vercel 5-minutes (vercel.json) par une
 * expiration à la volée déclenchée à la lecture. Bénéfices :
 *  - 0 cron, 0 coût, 0 quota Vercel Hobby (1 cron/jour max)
 *  - Latence d'expiration 0 côté user (à sa prochaine lecture)
 *  - Idempotent (updateMany atomique avec status='active')
 *
 * Comportement :
 * 1. Trouver tous les SafetyCheckin avec status='active' AND expiresAt < now
 * 2. Pour chaque checkin expiré :
 *    - Update atomique status='active' → status='expired', resolvedAt=now
 *      (le WHERE status='active' empêche le double-process en race)
 *    - Trouver les TrustContact du user
 *    - Si 0 contact : log warn, skip
 *    - Sinon : createMany des CheckinAlert avec deliveryStatus='queued'
 * 3. Retourne { expired, alertsCreated } et log un résumé
 *
 * Concurrence : 2 calls parallèles sont safe grâce au updateMany atomique.
 * V1 : pas d'envoi réel (cf. notify.ts — stub). V2 ajoutera un dispatcher
 * email/SMS qui consommera les CheckinAlert queued.
 *
 * Pourquoi `now` en param : testabilité + permettre à l'appelant de
 * décider (par ex. fixed time en test). En prod, l'appelant passe new Date().
 */
import type { PrismaClient } from '@/generated/client/client';

export interface ExpireOverdueResult {
  expired: number;
  alertsCreated: number;
}

export async function expireOverdueCheckins(
  db: PrismaClient,
  now: Date,
): Promise<ExpireOverdueResult> {
  // 1. Trouver les checkins expirés encore actifs
  const expiredCheckins = await db.safetyCheckin.findMany({
    where: {
      status: 'active',
      expiresAt: { lt: now },
    },
    select: { id: true, userId: true },
  });

  if (expiredCheckins.length === 0) {
    return { expired: 0, alertsCreated: 0 };
  }

  // 2. Pour chaque checkin : update status + créer 1 CheckinAlert par contact
  // On ne peut pas faire un updateMany ici car on doit aussi créer
  // les CheckinAlert. On itère. Pour 5 contacts max par user, c'est
  // borné. Si on scale à 10k checkins expirés, on switchera à un
  // createMany + transaction unique (V2).
  let totalAlerts = 0;
  let totalExpired = 0;

  for (const checkin of expiredCheckins) {
    // 2a. Update atomique (status='active' filtre les races)
    const updateResult = await db.safetyCheckin.updateMany({
      where: { id: checkin.id, status: 'active' },
      data: { status: 'expired', resolvedAt: now },
    });

    // Si 0 ligne mise à jour, un autre process a process ce checkin
    // entre temps. On skip.
    if (updateResult.count === 0) {
      continue;
    }
    totalExpired += 1;

    // 2b. Trouver les contacts du user
    const contacts = await db.trustContact.findMany({
      where: { ownerId: checkin.userId },
      select: { id: true },
    });

    if (contacts.length === 0) {
      // Checkin expiré mais user n'a plus de contact (a été supprimé
      // entre temps). On log mais on n'a pas d'alerte à créer.
      console.warn(
        `[lib:expire] checkin ${checkin.id} expired but user ${checkin.userId} has 0 contacts`,
      );
      continue;
    }

    // 2c. Créer N CheckinAlert (deliveryStatus='queued')
    const alerts = await db.checkinAlert.createMany({
      data: contacts.map((c) => ({
        checkinId: checkin.id,
        contactId: c.id,
        sentAt: now,
        deliveryStatus: 'queued',
      })),
    });
    totalAlerts += alerts.count;
  }

  console.log(
    `[lib:expire] processed ${totalExpired} expired checkins, created ${totalAlerts} alerts`,
  );

  return { expired: totalExpired, alertsCreated: totalAlerts };
}
