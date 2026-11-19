import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { refusOrigine } from '@/lib/securite/origine';
import { estMotifSanction } from '@/lib/moderation/reperes';
import { GROUPE_MAX, traiterGroupeSignalements } from '@/lib/moderation/signalements-groupe';

const corpsSchema = z.object({
  motif: z.string().min(1).max(50),
  ids: z.array(z.string().uuid()).min(1).max(GROUPE_MAX),
  action: z.enum(['DISMISS_REPORT', 'BAN', 'WARNING']),
  reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/admin/membres/:id/signalements — trancher d'un geste les
 * signalements d'un membre pour un motif (#568).
 *
 * Ordre des contrôles, comme pour la suppression d'un compte : garde admin
 * (404 pour tout autre), puis origine et contenu JSON (403), puis validation
 * (400). Le périmètre (ce membre, ce motif, encore en attente) est vérifié en
 * base par `traiterGroupeSignalements`, qui écrit tout ou rien.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const refus = refusOrigine(request);
  if (refus) return refus;
  const { id } = await params;

  const parsed = corpsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Validation échouée' }, { status: 400 });
  const { motif, ids, action, reason } = parsed.data;
  // FR-022 : un bannissement porte un motif de la liste fermée.
  if (action === 'BAN' && !estMotifSanction(reason)) {
    return NextResponse.json({ error: 'Choisis un motif de bannissement dans la liste.' }, { status: 400 });
  }

  try {
    const issue = await traiterGroupeSignalements(adminResult.userId, id, motif, ids, action, reason ?? null);
    if (issue === 'introuvable') return NextResponse.json({ error: 'Signalements non trouvés pour ce membre.' }, { status: 404 });
    if (issue === 'admin') return NextResponse.json({ error: 'Un compte admin ne se bannit pas ici.' }, { status: 400 });
    if (issue === 'deja_traite') {
      return NextResponse.json({ error: 'Un de ces signalements a déjà été traité : rien n’a été modifié. Recharge la fiche.' }, { status: 409 });
    }
    return NextResponse.json({ success: true, traites: ids.length });
  } catch (error) {
    console.error('admin.membres.signalements.failed', error instanceof Error ? error.message.slice(0, 120) : 'unknown');
    return NextResponse.json({ error: 'Le geste n’a pas abouti. Réessaie.' }, { status: 500 });
  }
}
