/**
 * GET  /api/circle/contacts — Liste les contacts de mon cercle
 * POST /api/circle/contacts — Ajoute un contact à mon cercle
 *
 * Cf. docs/roadmap/chantiers/01-securite/spec.md
 *
 * V1 = Libre-only (cf. décision #43). Les contacts sont obligatoirement
 * des users Libre (FK contactId).
 *
 * Limite métier : 5 contacts max par utilisateur. Appliquée ici
 * (compte des contacts existants avant insertion).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { addContactSchema } from '@/lib/trust/validators';

const MAX_CONTACTS = 5;

// GET — Liste mes contacts de confiance
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const contacts = await getDb().trustContact.findMany({
      where: { ownerId: session.user.id },
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            isVerified: true,
            lastActive: true,
            profile: {
              select: { photos: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_CONTACTS,
    });

    return NextResponse.json({
      contacts: contacts.map((c) => ({
        id: c.id,
        contact: {
          id: c.contact.id,
          displayName: c.contact.displayName,
          isVerified: c.contact.isVerified,
          lastActive: c.contact.lastActive.toISOString(),
          avatarUrl: c.contact.profile?.photos?.[0] ?? null,
        },
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/circle/contacts error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

// POST — Ajoute un contact à mon cercle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const ownerId = session.user.id;

    // Parse et validation
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide' },
        { status: 400 },
      );
    }

    const parsed = addContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { contactId } = parsed.data;

    // Garde-fou 1 : pas d'auto-désignation
    if (contactId === ownerId) {
      return NextResponse.json(
        { error: 'Tu ne peux pas t\'ajouter toi-même à ton cercle' },
        { status: 400 },
      );
    }

    // Garde-fou 2 : le contact doit exister et ne pas être banni
    const contactUser = await getDb().user.findUnique({
      where: { id: contactId },
      select: { id: true, isBanned: true, squareBannedUntil: true },
    });
    if (!contactUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 },
      );
    }
    const now = new Date();
    const isBanned =
      contactUser.isBanned ||
      (contactUser.squareBannedUntil && contactUser.squareBannedUntil > now);
    if (isBanned) {
      return NextResponse.json(
        { error: 'Cet utilisateur ne peut pas être ajouté à un cercle' },
        { status: 422 },
      );
    }

    // Garde-fou 3 : pas de doublon
    const existing = await getDb().trustContact.findUnique({
      where: { ownerId_contactId: { ownerId, contactId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Ce contact est déjà dans ton cercle' },
        { status: 409 },
      );
    }

    // Garde-fou 4 : limite de 5 contacts
    const count = await getDb().trustContact.count({
      where: { ownerId },
    });
    if (count >= MAX_CONTACTS) {
      return NextResponse.json(
        {
          error: `Tu ne peux pas avoir plus de ${MAX_CONTACTS} contacts dans ton cercle`,
        },
        { status: 409 },
      );
    }

    // Création
    const created = await getDb().trustContact.create({
      data: { ownerId, contactId },
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            isVerified: true,
            lastActive: true,
            profile: { select: { photos: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        contact: {
          id: created.contact.id,
          displayName: created.contact.displayName,
          isVerified: created.contact.isVerified,
          lastActive: created.contact.lastActive.toISOString(),
          avatarUrl: created.contact.profile?.photos?.[0] ?? null,
        },
        createdAt: created.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/circle/contacts error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
