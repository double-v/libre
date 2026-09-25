import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { retenirEmpreintesBannies } from '@/lib/fraude/bannissement';

const DECISIONS = ['rien', 'verification', 'banni'] as const;
type Decision = (typeof DECISIONS)[number];

const ACTIONS: Record<Decision, string> = {
  rien: 'PROFILE_REVIEW_RIEN',
  verification: 'PROFILE_REVIEW_VERIFICATION',
  banni: 'PROFILE_REVIEW_BANNI',
};

/**
 * Trancher un profil de la file (spec 006, US4). Trois décisions, toutes
 * humaines et journalisées :
 * - **rien** : le dossier est clos ; seul un signal nouveau le rouvre, et une
 *   mise en retrait éventuelle est levée ;
 * - **verification** : mise en retrait — le compte disparaît pour les autres
 *   jusqu'à l'approbation de son badge selfie (#436) ;
 * - **banni** : le bannissement existant.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { userId } = await params;

  const body = (await request.json().catch(() => ({}))) as { decision?: unknown; motif?: unknown };
  const decision = DECISIONS.find((d) => d === body.decision);
  if (!decision) {
    return NextResponse.json({ error: 'Décision attendue : rien, verification ou banni' }, { status: 400 });
  }
  if (userId === adminResult.userId) {
    return NextResponse.json({ error: 'On ne tranche pas son propre profil' }, { status: 400 });
  }
  const motif = typeof body.motif === 'string' && body.motif.trim() ? body.motif.trim().slice(0, 500) : null;

  try {
    const db = getDb();
    const maintenant = new Date();
    await db.profileReview.upsert({
      where: { userId },
      update: { decision, decidedAt: maintenant, decidedBy: adminResult.userId },
      create: { userId, decision, decidedAt: maintenant, decidedBy: adminResult.userId },
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
      data: { adminId: adminResult.userId, targetUserId: userId, action: ACTIONS[decision], reason: motif },
    });
    return NextResponse.json({ decision });
  } catch (error) {
    console.error('profil.decision.failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie' }, { status: 500 });
  }
}
