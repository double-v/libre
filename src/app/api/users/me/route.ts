import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { effacerCompte } from '@/lib/suppression-compte';

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
      select: { passwordHash: true },
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

    // Photos, floutés et selfies sur R2, puis la ligne et sa cascade.
    await effacerCompte(session.user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

