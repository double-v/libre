import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { adminRemovePhotoSchema } from '@/lib/validators';
import { retirerPhoto } from '@/lib/moderation/gestes';

/**
 * Retrait d'une photo par la modération (#323) — effet, journal et nettoyage
 * R2 dans `retirerPhoto` (spec 012, T003).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = adminRemovePhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const issue = await retirerPhoto(adminResult.userId, id, parsed.data.photoKey, parsed.data.reason);
  if (issue === 'profil_introuvable') return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  if (issue === 'photo_introuvable') return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
  return NextResponse.json({ photos: issue.photos });
}
