import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimit, limits } from '@/lib/rate-limit';
import { broadcastReaction } from '@/lib/square/store';
import { squareReactionSchema } from '@/lib/square/validators';
import type { SquareReaction } from '@/lib/square/store';

const ALLOWED_REACTION_EMOJIS = ['❤️', '😂', '🔥', '👋', '💯', '✨', '🤔', '😢'] as const;

type ReactionToggleResult =
  | { ok: true; added: true; count: number }
  | { ok: true; added: false; count: number };

/**
 * Toggle une réaction « à la Discord » :
 *  - si (messageId, emoji, userId) existe → DELETE
 *  - sinon                                → CREATE
 * On renvoie `added: boolean` pour que le client sachent s'il doit
 * activer ou désactiver visuellement le bouton.
 *
 * Côté SQL : on n'agrège plus sur le row lui-même, on compte les
 * lignes en place. Deux requêtes (toggle + count) sont OK pour des
 * 5/min. Le broadcast reste identique (Pusher ou SSE), seul le
 * payload gagne un `added`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: messageId } = await params;

  // Rate limit : 5 réactions par minute
  const rl = rateLimit(`square:react:${userId}`, limits.squareReaction.limit, limits.squareReaction.windowMs);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de réactions. Réessayez dans un moment.' },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parsed = squareReactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Emoji invalide' }, { status: 400 });
  }

  const { emoji } = parsed.data;

  if (!ALLOWED_REACTION_EMOJIS.includes(emoji as (typeof ALLOWED_REACTION_EMOJIS)[number])) {
    return NextResponse.json({ error: 'Emoji non autorisé' }, { status: 400 });
  }

  // Le message doit exister (FK le ferait aussi, mais on veut un 404 propre)
  const message = await getDb().squareMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 });
  }

  const result = await toggleReaction({ messageId, userId, emoji });

  if (!result.ok) {
    return NextResponse.json({ error: 'Réaction impossible' }, { status: 500 });
  }

  const broadcast: SquareReaction = {
    messageId,
    emoji,
    count: result.count,
    added: result.added,
  };
  broadcastReaction(broadcast);

  return NextResponse.json({ reaction: broadcast });
}

/**
 * Logique de bascule : DELETE si la ligne existe, sinon CREATE.
 * Pure I/O, isolée pour pouvoir être testée sans Next ni SSE.
 */
export async function toggleReaction(args: {
  messageId: string;
  userId: string;
  emoji: string;
}): Promise<ReactionToggleResult> {
  const { messageId, userId, emoji } = args;
  const db = getDb();

  // La PK logique est (messageId, emoji, userId) — on cherche par là.
  const existing = await db.squareReaction.findFirst({
    where: { messageId, userId, emoji },
  });

  if (existing) {
    await db.squareReaction.delete({ where: { id: existing.id } });
  } else {
    await db.squareReaction.create({ data: { messageId, userId, emoji } });
  }

  // Re-compte pour le broadcast (le user courant vient de basculer).
  const count = await db.squareReaction.count({
    where: { messageId, emoji },
  });

  return { ok: true, added: !existing, count };
}
