import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { deletePhoto } from '@/lib/r2';
import { adminRemovePhotoSchema } from '@/lib/validators';

/**
 * Retrait d'une photo par la modération (#323).
 *
 * Jusqu'ici les seuls leviers face à un avatar hors charte étaient bannir ou
 * supprimer le compte — disproportionnés. Cet endpoint permet la sanction
 * proportionnée : on retire la photo, le compte reste.
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

  const { photoKey, reason } = parsed.data;

  const profile = await getDb().profile.findUnique({
    where: { userId: id },
    select: { photos: true },
  });
  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }
  if (!profile.photos.includes(photoKey)) {
    return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
  }

  // `filter` préserve l'ordre : retirer photos[0] promeut mécaniquement la
  // suivante en avatar, ce qui est le comportement voulu. Si c'était la seule,
  // le profil se retrouve sans photo — les surfaces retombent sur l'initiale.
  const remaining = profile.photos.filter((p) => p !== photoKey);

  const updated = await getDb().profile.update({
    where: { userId: id },
    data: { photos: remaining },
  });

  // La raison est obligatoire côté schéma : un retrait de photo sans motif
  // est indéfendable si la personne conteste.
  await getDb().moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: id,
      action: 'REMOVE_PHOTO',
      reason,
    },
  });

  // Suppression R2 best-effort, comme dans /api/users/photos (#142) : sans
  // elle l'objet reste atteignable tant que la clé est connue. Un échec R2
  // ne doit pas annuler le retrait déjà acté en base.
  try {
    await deletePhoto(photoKey);
  } catch (err) {
    console.error('[admin/photos] R2 delete failed for key:', photoKey, err);
  }

  return NextResponse.json({ photos: updated.photos });
}
