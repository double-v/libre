import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { uploadPhoto, deletePhoto, isR2Configured, generateBlurredDerivative } from '@/lib/r2';
import { isSensitivityLevel } from '@/lib/photo-sensitivity';
import { rateLimit, limits } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const rl = await rateLimit(`api:${session.user.id}`, limits.api.limit, limits.api.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: 'Stockage non configuré' }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 });
    }

    const profile = await getDb().profile.findUnique({
      where: { userId: session.user.id },
    });

    if (profile && profile.photos.length >= 6) {
      return NextResponse.json({ error: 'Maximum 6 photos autorisées' }, { status: 400 });
    }

    const key = await uploadPhoto(file, session.user.id);

    // Auto-déclaration (#332) : se classer soi-même est le chemin sain, la
    // modération a posteriori arrivant toujours après que quelqu'un a vu la
    // photo. Une valeur invalide est ignorée plutôt que refusée — on ne fait
    // pas échouer un upload valide sur un champ optionnel mal formé.
    const declared = formData.get('sensitivity');
    if (isSensitivityLevel(declared)) {
      // Même règle que côté modération : pas de classification sans flou
      // disponible, sinon la garantie serait vide. Ici l'échec ne perd rien
      // d'autre — la photo est déjà en ligne, elle reste simplement ordinaire.
      try {
        const blurredKey = await generateBlurredDerivative(key);
        await getDb().photoModeration.create({
          data: { key, ownerId: session.user.id, sensitivity: declared, blurredKey },
        });
      } catch (err) {
        console.error('[photos] auto-déclaration non appliquée pour', key, err);
      }
    }

    const updated = await getDb().profile.upsert({
      where: { userId: session.user.id },
      update: { photos: { push: key } },
      create: { userId: session.user.id, photos: [key] },
    });

    return NextResponse.json({ photo: key, photos: updated.photos }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi';
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { photoKey } = await request.json();
    if (!photoKey) {
      return NextResponse.json({ error: 'Clé requise' }, { status: 400 });
    }

    const profile = await getDb().profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    const updated = await getDb().profile.update({
      where: { userId: session.user.id },
      data: { photos: profile.photos.filter((p) => p !== photoKey) },
    });

    // Supprime aussi l'objet R2 (cf. issue #142). Sans cela, l'objet reste
    // accessible via GET /api/photos/[key] tant que la clé est connue, et
    // s'accumule comme stockage orphelin. Erreurs R2 (réseau, permissions)
    // sont loggées mais ne bloquent pas la suppression DB — l'objet orphelin
    // sera nettoyé par le cron mensuel de nettoyage (à venir).
    if (profile.photos.includes(photoKey)) {
      try {
        await deletePhoto(photoKey);
      } catch (err) {
        console.error('[photos] R2 delete failed for key:', photoKey, err instanceof Error ? err.message : 'unknown error');
      }

    // La photo disparaît : sa classification et son dérivé n'ont plus d'objet
    // (#330). Best-effort — la photo est déjà retirée, un reliquat ne blesse
    // personne, et l'échec ne doit pas faire croire à un retrait raté.
    try {
      const moderation = await getDb().photoModeration.findUnique({ where: { key: photoKey } });
      if (moderation) {
        await getDb().photoModeration.delete({ where: { key: photoKey } });
        await deletePhoto(moderation.blurredKey);
      }
    } catch (err) {
      console.error('[photos] nettoyage de la classification échoué pour', photoKey, err);
    }
    }

    return NextResponse.json({ photos: updated.photos }, { status: 200 });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}