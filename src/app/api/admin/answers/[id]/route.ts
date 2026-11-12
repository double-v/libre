import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { retirerReponse } from '@/lib/moderation/gestes';

/**
 * Retirer une réponse aux questions de profil (spec 009, US3) — effet et
 * journal dans `retirerReponse` (spec 012, T003).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { status?: unknown };
    if (body.status !== 'removed') {
      return NextResponse.json({ error: 'Seul le retrait est possible ici.' }, { status: 400 });
    }
    if ((await retirerReponse(adminResult.userId, id)) === 'introuvable') {
      return NextResponse.json({ error: 'Réponse introuvable' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('answers.remove.failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer' }, { status: 500 });
  }
}
