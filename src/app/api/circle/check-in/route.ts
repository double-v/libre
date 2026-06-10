/**
 * POST /api/circle/check-in — Démarre un check-in de sécurité.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.2.
 *
 * Préconditions métier (dans l'ordre) :
 * 1. User authentifié (401 sinon)
 * 2. Body validé par startCheckinSchema (400 sinon) — le validator
 *    whitelist `durationMinutes` à 30|60|120|240|480, et `.strict()`
 *    rejette tout champ supplémentaire
 * 3. User a ≥1 contact dans son cercle (422 sinon, message FR)
 * 4. Pas de check-in `status='active'` existant pour ce user (409 sinon)
 *
 * Réponse 201 : `{ id, expiresAt (ISO), durationMinutes }`
 *
 * V1 simplifié : pas de position (lastLat/lastLng = null). La position
 * sera ajoutée en V2 avec un opt-in explicite depuis l'UI "partager
 * ma position actuelle". On évite ainsi de coupler ce check-in au
 * tracking géoloc du user (qui n'existe d'ailleurs pas en V1 — pas de
 * `users.lastKnownLat/Lng`).
 *
 * Race condition théorique : 2 POST simultanés peuvent théoriquement
 * passer les checks (3) et (4) avant qu'aucun n'ait créé le checkin,
 * donnant 2 checkins actifs. En pratique, l'index `@@index([userId,
 * status])` rend les reads sub-ms, et la fenêtre est de quelques ms.
 * Mitigation V2 si observée : contrainte unique partielle Postgres
 * `UNIQUE (userId) WHERE status = 'active'`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { startCheckinSchema } from '@/lib/trust/checkin-validators';
import { expireOverdueCheckins } from '@/lib/trust/expire';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    // 2. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide' },
        { status: 400 },
      );
    }

    // 3. Validation Zod
    const parsed = startCheckinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { durationMinutes } = parsed.data;

    const db = getDb();
    const now = new Date();

    // Lazy expiration avant le check 409 (cf. #94). Sans ça, un user
    // qui revient après expiration pourrait être bloqué par un vieux
    // checkin 'active' jusqu'à ce qu'un autre process le nettoie.
    await expireOverdueCheckins(db, now);

    // 4. Précondition : ≥1 contact dans le cercle
    // On compte plutôt que de `findFirst` pour ne pas charger l'objet.
    const contactCount = await db.trustContact.count({
      where: { ownerId: userId },
    });
    if (contactCount === 0) {
      return NextResponse.json(
        { error: "Ajoute d'abord un contact à ton Cercle" },
        { status: 422 },
      );
    }

    // 5. Précondition : pas de check-in actif
    const activeCheckin = await db.safetyCheckin.findFirst({
      where: { userId, status: 'active' },
      select: { id: true },
    });
    if (activeCheckin) {
      return NextResponse.json(
        {
          error:
            "Tu as déjà un check-in en cours. Valide-le ou annule-le avant d'en démarrer un nouveau.",
        },
        { status: 409 },
      );
    }

    // 6. Créer le checkin
    // `expiresAt` = now + durationMinutes. Le `@default(now())` du
    // schema ne s'applique pas quand on passe `triggeredAt` explicitement.
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const checkin = await db.safetyCheckin.create({
      data: {
        userId,
        status: 'active',
        triggeredAt: now,
        expiresAt,
        // lastLat/lastLng volontairement omis → null en V1
      },
      select: {
        id: true,
        triggeredAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(
      {
        id: checkin.id,
        expiresAt: checkin.expiresAt.toISOString(),
        durationMinutes,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/circle/check-in error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
