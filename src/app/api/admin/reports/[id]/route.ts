import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { adminHandleReportSchema } from '@/lib/validators';
import { traiterSignalement } from '@/lib/moderation/gestes';

/** Trancher un signalement — effet et journal dans `traiterSignalement` (spec 012, T003). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = adminHandleReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée' }, { status: 400 });
  }

  const { action, reason } = parsed.data;
  if ((await traiterSignalement(adminResult.userId, id, action, reason ?? null)) === 'introuvable') {
    return NextResponse.json({ error: 'Signalement non trouvé' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
