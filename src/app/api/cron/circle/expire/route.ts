/**
 * POST /api/cron/circle/expire — Cron Vercel : expire les check-ins
 * et crée les CheckinAlert pour le cercle.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.6.
 *
 * Schedule : toutes les 5 min (cf. vercel.json)
 *
 * Comportement :
 * 1. Auth via CRON_SECRET (header Authorization: Bearer <secret>)
 * 2. Trouver tous les SafetyCheckin avec status='active' AND expiresAt < now
 * 3. Pour chaque checkin expiré :
 *    - Update status='expired', resolvedAt=now
 *    - Trouver tous les TrustContact du user
 *    - Pour chaque contact : créer un CheckinAlert avec deliveryStatus='queued'
 * 4. Logger : nombre de check-ins expirés + nombre d'alertes créées
 *
 * V1 : pas d'envoi réel (cf. #53 — le stub notifyContact). On crée
 * juste les CheckinAlert en DB avec deliveryStatus='queued'. Le
 * dispatcher email/SMS viendra en V2.
 *
 * Concurrence : si 2 instances du cron tournent en parallèle, on
 * pourrait process 2x le même checkin. Mitigation : on utilise
 * `updateMany` avec une clause `status='active'` dans la WHERE —
 * seul le 1er updateMany réussit (l'UPDATE est atomique et la
 * condition status='active' empêche la 2e instance de matcher).
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  // 1. Auth cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();

  // 2. Trouver les checkins expirés encore actifs
  const expiredCheckins = await db.safetyCheckin.findMany({
    where: {
      status: 'active',
      expiresAt: { lt: now },
    },
    select: { id: true, userId: true },
  });

  if (expiredCheckins.length === 0) {
    return NextResponse.json({
      success: true,
      expired: 0,
      alertsCreated: 0,
    });
  }

  // 3. Pour chaque checkin : update status + créer 1 CheckinAlert par contact
  // On ne peut pas faire un `updateMany` ici car on doit aussi créer
  // les CheckinAlert. On itère. Pour 5 contacts max par user, c'est
  // borné. Si on scale à 10k checkins expirés, on switchera à un
  // `createMany` + transaction unique (V2).
  let totalAlerts = 0;
  let totalExpired = 0;

  for (const checkin of expiredCheckins) {
    // 3a. Update atomique (status='active' filtre les races)
    const updateResult = await db.safetyCheckin.updateMany({
      where: { id: checkin.id, status: 'active' },
      data: { status: 'expired', resolvedAt: now },
    });

    // Si 0 ligne mise à jour, un autre cron a process ce checkin
    // entre temps. On skip.
    if (updateResult.count === 0) {
      continue;
    }
    totalExpired += 1;

    // 3b. Trouver les contacts du user
    const contacts = await db.trustContact.findMany({
      where: { ownerId: checkin.userId },
      select: { id: true },
    });

    if (contacts.length === 0) {
      // Checkin expiré mais user n'a plus de contact (a été supprimé
      // entre temps). On log mais on n'a pas d'alerte à créer.
      console.warn(
        `[cron:expire] checkin ${checkin.id} expired but user ${checkin.userId} has 0 contacts`,
      );
      continue;
    }

    // 3c. Créer N CheckinAlert (deliveryStatus='queued')
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
    `[cron:expire] processed ${totalExpired} expired checkins, created ${totalAlerts} alerts`,
  );

  return NextResponse.json({
    success: true,
    expired: totalExpired,
    alertsCreated: totalAlerts,
  });
}
