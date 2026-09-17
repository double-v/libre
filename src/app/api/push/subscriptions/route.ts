import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Abonnements Web Push, un par appareil (#392, spec 003 R12/R15).
 *
 * Un endpoint de push est une adresse d'envoi : on n'en enregistre que pour
 * soi (session), et un endpoint déjà connu sous un autre compte — même
 * navigateur, autre personne — est réassigné, pas refusé. On ne supprime que
 * le sien ; l'endpoint d'un autre compte renvoie 204 sans effet, pour ne pas
 * révéler son existence.
 */

const BASE64URL = /^[A-Za-z0-9_-]+$/;

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine((u) => u.startsWith('https://'), 'https requis'),
  keys: z.object({
    /** Clé P-256 non compressée, 65 octets → 87 caractères base64url (88 avec padding retiré). */
    p256dh: z.string().min(87).max(88).regex(BASE64URL),
    /** Secret d'authentification, 16 octets → 22 caractères. */
    auth: z.string().length(22).regex(BASE64URL),
  }),
});

const endpointSchema = z.object({
  endpoint: z.string().url().max(2048).refine((u) => u.startsWith('https://'), 'https requis'),
});

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  const me = session.user.id;

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const rl = await rateLimit(`push-sub:${me}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get('user-agent')?.slice(0, 256) || undefined;
  const db = getDb();

  const existing = await db.pushSubscription.findUnique({ where: { endpoint }, select: { id: true, userId: true } });
  const sub = await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: me, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    // Réassignation au compte courant + clés à jour (un navigateur peut les renouveler).
    update: { userId: me, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    select: { id: true },
  });

  const alreadyMine = existing?.userId === me;
  return NextResponse.json({ id: sub.id }, { status: alreadyMine ? 200 : 201 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const parsed = endpointSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  await getDb().pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: session.user.id } });
  return new NextResponse(null, { status: 204 });
}
