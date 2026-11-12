import { NextRequest, NextResponse, after } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { adminHandleVerificationSchema } from '@/lib/validators';
import { buildPayload, sendPushToUser } from '@/lib/push/server';
import { deciderVerification } from '@/lib/moderation/gestes';

/** Valider ou refuser un selfie — effet et journal dans `deciderVerification` (spec 012, T003). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = adminHandleVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée' }, { status: 400 });
  }

  const { action, motif } = parsed.data;
  const issue = await deciderVerification(
    adminResult.userId,
    id,
    action === 'APPROVE_VERIFICATION' ? { action } : { action, motif: motif! },
  );
  if (issue === 'introuvable') return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 });
  if (issue === 'deja_traite') return NextResponse.json({ error: 'Demande déjà traitée' }, { status: 409 });

  // FR-010 : le membre apprend qu'il y a une réponse, jamais laquelle.
  after(() => sendPushToUser(issue.userId, buildPayload('verification', {})));

  return NextResponse.json({ success: true, approved: issue.approuvee });
}
