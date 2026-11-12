import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { inviterVerification } from '@/lib/moderation/gestes';

/**
 * Invitation à la vérification posée à la main — effet et journal dans
 * `inviterVerification` (spec 012, T003). Même effet que l'invitation
 * automatique de la spec 010 : **sans** retrait. Pour bloquer, la fiche passe
 * par la décision « verification » (`/api/admin/profils-a-verifier/[userId]`),
 * seule à poser `retraitAt`.
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
    const issue = await inviterVerification(adminResult.userId, id);
    if (issue === 'introuvable') return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    if (issue === 'deja_verifie') return NextResponse.json({ error: 'Ce profil est déjà vérifié' }, { status: 409 });
    return NextResponse.json({ invitation: issue });
  } catch (error) {
    console.error('admin.invitation.failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie' }, { status: 500 });
  }
}
