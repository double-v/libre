import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

/**
 * Invitation à la vérification posée à la main depuis la fiche admin. Même
 * effet que l'invitation automatique de la spec 010 (`evaluerCompte`) : le
 * membre est invité au selfie, **sans** retrait — il reste visible et peut
 * écrire. Pour bloquer, la fiche passe par la décision « verification » de la
 * file (`/api/admin/profils-a-verifier/[userId]`), qui reste la seule à
 * poser `retraitAt`.
 *
 * Idempotente : une invitation déjà posée garde sa date d'origine.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  if (id === adminResult.userId) {
    return NextResponse.json({ error: 'On ne s\'invite pas soi-même' }, { status: 400 });
  }

  try {
    const db = getDb();
    const u = await db.user.findUnique({ where: { id }, select: { isVerified: true, verifInviteeAt: true } });
    if (!u) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    if (u.isVerified) return NextResponse.json({ error: 'Ce profil est déjà vérifié' }, { status: 409 });
    if (u.verifInviteeAt) return NextResponse.json({ invitation: { depuis: u.verifInviteeAt } });

    const maintenant = new Date();
    await db.$transaction([
      db.user.update({ where: { id }, data: { verifInviteeAt: maintenant } }),
      db.moderationLog.create({
        data: { adminId: adminResult.userId, targetUserId: id, action: 'INVITE_VERIFICATION', reason: null },
      }),
    ]);
    return NextResponse.json({ invitation: { depuis: maintenant } });
  } catch (error) {
    console.error('admin.invitation.failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie' }, { status: 500 });
  }
}
