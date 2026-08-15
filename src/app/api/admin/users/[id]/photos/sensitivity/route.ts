import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { generateBlurredDerivative, deletePhoto } from '@/lib/r2';
import { adminClassifyPhotoSchema, adminDeclassifyPhotoSchema } from '@/lib/validators';

/**
 * Classement d'une photo comme sensible (#330).
 *
 * Complète le retrait de #323 par un geste proportionné : face à une photo
 * licite mais hors charte, la modération n'avait que la suppression. Ici on
 * laisse la photo en place et on la floute pour qui n'a pas demandé à la voir.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = adminClassifyPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { photoKey, sensitivity, reason } = parsed.data;

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

  // Best-effort INVERSÉ, contrairement aux effets de bord habituels de ce repo :
  // on génère le flou AVANT d'écrire la classification. Classer une photo qu'on
  // ne sait pas flouter donnerait une garantie vide — la ligne dirait
  // « sensible » et le proxy servirait quand même l'original.
  let blurredKey: string;
  try {
    blurredKey = await generateBlurredDerivative(photoKey);
  } catch (err) {
    console.error('[admin/sensitivity] génération du flou échouée:', photoKey, err);
    return NextResponse.json(
      { error: 'Impossible de générer la version floutée. La photo n\'a pas été classée.' },
      { status: 502 },
    );
  }

  await getDb().photoModeration.upsert({
    where: { key: photoKey },
    update: { sensitivity, blurredKey, classifiedBy: adminResult.userId, reason },
    create: {
      key: photoKey,
      ownerId: id,
      sensitivity,
      blurredKey,
      classifiedBy: adminResult.userId,
      reason,
    },
  });

  await getDb().moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: id,
      action: 'CLASSIFY_PHOTO',
      reason: `${sensitivity} — ${reason}`,
    },
  });

  return NextResponse.json({ photoKey, sensitivity });
}

/**
 * Déclassement : la photo redevient ordinaire. Journalisé comme le classement —
 * rouvrir un contenu au regard de tous est un acte de modération à part entière.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = adminDeclassifyPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { photoKey, reason } = parsed.data;

  const existing = await getDb().photoModeration.findUnique({ where: { key: photoKey } });
  if (!existing || existing.ownerId !== id) {
    return NextResponse.json({ error: 'Classification non trouvée' }, { status: 404 });
  }

  await getDb().photoModeration.delete({ where: { key: photoKey } });

  await getDb().moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: id,
      action: 'DECLASSIFY_PHOTO',
      reason,
    },
  });

  // Le dérivé devient inutile. Best-effort dans ce sens-ci : un objet orphelin
  // ne blesse personne, et la classification est déjà levée en base.
  try {
    await deletePhoto(existing.blurredKey);
  } catch (err) {
    console.error('[admin/sensitivity] suppression du dérivé échouée:', existing.blurredKey, err);
  }

  return NextResponse.json({ photoKey, sensitivity: null });
}
