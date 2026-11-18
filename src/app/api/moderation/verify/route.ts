import { NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { deletePhoto, isR2Configured, televerserPhoto } from '@/lib/r2';
import { photoUrl } from '@/lib/photos';
import { codeValide, consommerCode, estFormeCode, peutTirer } from '@/lib/verification/code';
import { gardeCompte, gardeFrequence } from '@/lib/verification/eligibilite';
import { lireCode } from '@/lib/verification/lecture-code';
import { peutDemander, statutVerification } from '@/lib/verification/statut';

// ---------------------------------------------------------------------------
// Badge vérifié par selfie (#436), au code écrit à la main (spec 012, US1).
//
// GET  : où en est ma vérification (page /verify, Paramètres, roue dentée).
//        Jamais le code lu automatiquement (FR-S05).
// POST : envoi du selfie, multipart `selfie` + `code`. Le code doit être
//        celui tiré pour ce membre et encore valable (FR-002), sinon 410 :
//        rien n'est stocké. Le selfie va sous `<userId>/verif/` et n'entre
//        pas dans `profile.photos` (FR-009). La lecture du code part après la
//        réponse (FR-004) ; elle ne décide jamais (FR-005).
// ---------------------------------------------------------------------------

/** Au-delà, la requête est refusée avant d'être lue (5 Mo d'image + l'enveloppe multipart). */
const CORPS_MAX = 5 * 1024 * 1024 + 64 * 1024;
/** Un téléphone en mode normal reste sous 50 Mpx ; au-delà, le décodage coûte trop cher. */
const PIXELS_MAX = 50_000_000;

const CODE_PERIME = 'Ce code a expiré ou a été remplacé.';

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

    const refusFrequence = await gardeFrequence(request, userId, 'verifEnvoi');
    if (refusFrequence) return refusFrequence;
    const refusCompte = await gardeCompte(userId);
    if (refusCompte) return refusCompte;
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'Stockage non configuré' }, { status: 503 });
    }
    const taille = Number(request.headers.get('content-length') ?? NaN);
    if (!Number.isFinite(taille) || taille > CORPS_MAX) {
      return NextResponse.json({ error: 'L’image ne doit pas dépasser 5 Mo.' }, { status: 413 });
    }

    const formData = await request.formData();
    const code = formData.get('code');
    if (!estFormeCode(code) || !(await codeValide(userId, code))) {
      return NextResponse.json({ error: CODE_PERIME, nouveauCode: true }, { status: 410 });
    }
    const selfie = formData.get('selfie');
    if (!(selfie instanceof File)) {
      return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 });
    }
    if (!peutDemander(await statutVerification(userId))) {
      return NextResponse.json({ error: 'Une demande est déjà en cours ou ton profil est vérifié.' }, { status: 409 });
    }

    let photo: Awaited<ReturnType<typeof televerserPhoto>>;
    try {
      photo = await televerserPhoto(selfie, userId, { dossier: 'verif', pixelsMax: PIXELS_MAX });
    } catch (error) {
      // Messages de validation (format, taille, pixels) : écrits pour le membre.
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Image refusée' }, { status: 400 });
    }

    // Effacer le code est la condition de la mise en file : un seul envoi
    // passe, même si deux partent en même temps avec le même code.
    if (!(await consommerCode(userId, code))) {
      await deletePhoto(photo.key).catch(() => {});
      return NextResponse.json({ error: CODE_PERIME, nouveauCode: true }, { status: 410 });
    }

    const droit = await peutTirer(userId);
    const demande = await getDb().verificationRequest.create({
      data: {
        userId,
        selfieUrl: photoUrl(photo.key),
        codeAttendu: code,
        tentative: droit.tentative,
        sansDonneesAppareil: !photo.avaitMetadonnees,
        status: 'pending',
      },
      select: { id: true },
    });

    const image = photo.propre;
    after(async () => {
      const lu = await lireCode(image);
      await getDb().verificationRequest
        .update({ where: { id: demande.id }, data: { codeLu: lu } })
        .catch((err: unknown) => console.error('verif.lecture.ecriture', err instanceof Error ? err.name : 'erreur'));
    });

    return NextResponse.json({ statut: 'en_cours' }, { status: 201 });
  } catch (error) {
    console.error('[verify] envoi du selfie', error instanceof Error ? error.message : 'erreur');
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie.' }, { status: 500 });
  }
}
