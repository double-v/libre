import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { adminHandleVerificationSchema } from '@/lib/validators';
import { enregistrerSignal } from '@/lib/fraude/signaux';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = adminHandleVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée' }, { status: 400 });
  }

  const { action, motif } = parsed.data;
  const verification = await getDb().verificationRequest.findUnique({ where: { id } });
  if (!verification) {
    return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 });
  }
  // Une décision ne se réécrit pas en silence : le membre l'a peut-être déjà lue.
  if (verification.status !== 'pending') {
    return NextResponse.json({ error: 'Demande déjà traitée' }, { status: 409 });
  }

  const isApproved = action === 'APPROVE_VERIFICATION';

  await getDb().verificationRequest.update({
    where: { id },
    data: {
      status: isApproved ? 'approved' : 'rejected',
      rejectReason: isApproved ? null : motif,
      reviewedBy: adminResult.userId,
      resolvedAt: new Date(),
    },
  });

  if (isApproved) {
    await getDb().user.update({
      where: { id: verification.userId },
      // Le badge approuvé lève la mise en retrait (spec 006, #444) : c'est
      // exactement ce que « Demander une vérification » attendait.
      // Il lève aussi l'invitation automatique (spec 010, FR-019).
      data: { isVerified: true, retraitAt: null, verifInviteeAt: null },
    });
  } else {
    // Spec 010, FR-019 : un selfie refusé après une invitation automatique
    // fait entrer le compte dans la file — la suite revient à un humain.
    const u = await getDb().user.findUnique({ where: { id: verification.userId }, select: { verifInviteeAt: true } });
    if (u?.verifInviteeAt) {
      await enregistrerSignal({ userId: verification.userId, type: 'verification_refusee', force: 'fort', cle: id });
    }
  }

  await getDb().moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: verification.userId,
      action,
      reason: motif ?? null,
    },
  });

  return NextResponse.json({ success: true, approved: isApproved });
}