import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { uploadPhoto, isR2Configured } from '@/lib/r2';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
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

    return NextResponse.json({ photos: updated.photos }, { status: 200 });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}