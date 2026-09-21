import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { deletePhoto, isR2Configured } from '@/lib/r2';

const deleteAccountSchema = z.object({
  // Optionnel ici, exigé plus bas **seulement** si le compte a un mot de passe :
  // un compte OAuth n'en a aucun à confirmer, et le rendre obligatoire au
  // niveau du schéma rendait sa suppression impossible.
  confirmPassword: z.string().optional(),
});

/**
 * État du compte utile aux écrans qui doivent adapter leur formulaire —
 * aujourd'hui la suppression, qui ne demande le mot de passe que si le compte
 * en a un.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const user = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { email: true, displayName: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      displayName: user.displayName,
      hasPassword: Boolean(user.passwordHash),
    });
  } catch (error) {
    console.error('Account fetch error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Confirmation du mot de passe invalide' },
        { status: 400 },
      );
    }

    // Confirm the user actually knows their password before destroying the account.
    // OAuth-only accounts (no passwordHash) are protected by their provider session
    // and don't need a password — skip the check for those.
    const user = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: {
        passwordHash: true,
        profile: { select: { photos: true } },
        photoModerations: { select: { blurredKey: true } },
        verificationRequests: { select: { selfieUrl: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }

    if (user.passwordHash) {
      const confirmPassword = parsed.data.confirmPassword ?? '';
      if (!confirmPassword) {
        return NextResponse.json(
          { error: 'Mot de passe requis pour confirmer la suppression' },
          { status: 400 },
        );
      }
      const ok = await bcrypt.compare(confirmPassword, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 403 });
      }
    }

    // Les photos vivent sur R2, hors cascade SQL : sans ce passage, « toutes vos
    // données seront effacées » serait faux et les objets resteraient orphelins
    // dans le bucket (même dette que #142 sur la suppression d'une photo).
    // Même sort pour les dérivés floutés et les selfies de vérification (#428) :
    // la cascade efface la ligne qui les référence, et un objet sans ligne est
    // introuvable pour toujours. Le selfie est souvent une photo du profil,
    // d'où l'ensemble.
    const cles = new Set<string>(user.profile?.photos ?? []);
    for (const { blurredKey } of user.photoModerations) cles.add(blurredKey);
    for (const { selfieUrl } of user.verificationRequests) {
      const cle = cleR2DepuisSelfieUrl(selfieUrl);
      if (cle) cles.add(cle);
    }
    if (cles.size > 0 && isR2Configured()) {
      await Promise.all(
        [...cles].map(async (key) => {
          try {
            await deletePhoto(key);
          } catch (error) {
            // Best-effort : une panne du stockage ne doit pas retenir en otage
            // un compte que l'utilisateur a demandé à supprimer.
            console.error('Account deletion — orphan photo left on R2:', key, error);
          }
        }),
      );
    }

    // Cascade deletes profile, likes, matches, messages, etc.
    await getDb().user.delete({
      where: { id: session.user.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}


/**
 * `selfieUrl` est validé à l'envoi comme un chemin `/api/photos/<userId>/…`,
 * relatif ou absolu selon l'époque : on ne garde que la clé R2 derrière.
 */
function cleR2DepuisSelfieUrl(selfieUrl: string): string | null {
  const marqueur = '/api/photos/';
  const i = selfieUrl.indexOf(marqueur);
  if (i === -1) return null;
  const cle = selfieUrl.slice(i + marqueur.length).split(/[?#]/)[0];
  return cle ? decodeURIComponent(cle) : null;
}
