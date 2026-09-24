import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { isR2Configured, uploadPhoto } from '@/lib/r2';
import { photoUrl } from '@/lib/photos';
import { rateLimit, limits } from '@/lib/rate-limit';
import { lireJetonGeste } from '@/lib/verification/jeton-geste';
import { peutDemander, statutVerification } from '@/lib/verification/statut';

// ---------------------------------------------------------------------------
// Badge vérifié par selfie (#436).
//
// GET  : où en est ma vérification (page /verify, Paramètres).
// POST : envoi du selfie, multipart `selfie` + `jeton` (cf. ./geste). Le geste
//        enregistré est celui relu dans le jeton signé, jamais une valeur du
//        client. Le selfie va sous `<userId>/verif/` et n'entre pas dans
//        `profile.photos` : il n'est servi qu'au membre et à la modération.
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  return NextResponse.json(await statutVerification(session.user.id));
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await rateLimit(`api:${userId}`, limits.api.limit, limits.api.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'Stockage non configuré' }, { status: 503 });
    }

    const formData = await request.formData();
    const jeton = formData.get('jeton');
    const contenu = typeof jeton === 'string' ? await lireJetonGeste(jeton, userId) : null;
    if (!contenu) {
      return NextResponse.json({ error: 'Ton geste a expiré. Tires-en un nouveau.' }, { status: 400 });
    }
    const selfie = formData.get('selfie');
    if (!(selfie instanceof File)) {
      return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 });
    }

    if (!peutDemander(await statutVerification(userId))) {
      return NextResponse.json({ error: 'Une demande est déjà en cours ou ton profil est vérifié.' }, { status: 409 });
    }

    let key: string;
    try {
      key = await uploadPhoto(selfie, userId, 'verif');
    } catch (error) {
      // Messages de validation de `uploadPhoto` (format, taille) : écrits pour le membre.
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Image refusée' }, { status: 400 });
    }

    await getDb().verificationRequest.create({
      data: { userId, selfieUrl: photoUrl(key), challenge: contenu.geste, status: 'pending' },
    });
    return NextResponse.json({ statut: 'en_cours' }, { status: 201 });
  } catch (error) {
    console.error('[verify] envoi du selfie', error instanceof Error ? error.message : 'erreur');
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie.' }, { status: 500 });
  }
}
