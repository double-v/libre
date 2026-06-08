/**
 * DELETE /api/circle/contacts/:id — Retire un contact de mon cercle
 *
 * Cf. docs/roadmap/chantiers/01-securite/spec.md
 *
 * Comportement :
 * - Auth requise
 * - Vérifie que le TrustContact appartient bien au user connecté
 * - 404 si pas owner OU si inexistant (anti-leak : on ne distingue
 *   pas "c'est pas ton contact" de "ça existe pas")
 * - Le contact retiré N'EST PAS notifié (cf. spec.md)
 * - Hard-delete (RGPD, droit à l'oubli)
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Validation basique : doit être un UUID
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { error: 'Identifiant invalide' },
        { status: 404 },
      );
    }

    // Trouve uniquement si owner = user courant
    // (cf. spec.md : 404 si pas owner ou inexistant, anti-leak)
    const contact = await getDb().trustContact.findFirst({
      where: { id, ownerId: session.user.id },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact non trouvé' },
        { status: 404 },
      );
    }

    await getDb().trustContact.delete({
      where: { id: contact.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/circle/contacts/:id error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
