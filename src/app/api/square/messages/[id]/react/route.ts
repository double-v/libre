import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimit, limits } from '@/lib/rate-limit';
import { broadcastReaction } from '@/lib/square/store';
import { squareReactionSchema } from '@/lib/square/validators';
import type { SquareReaction } from '@/lib/square/store';

const ALLOWED_REACTION_EMOJIS = ['❤️', '😂', '🔥', '👋', '💯', '✨', '🤔', '😢'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: messageId } = await params;

  // Rate limit: 5 reactions per minute
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

  // Validate emoji against allowed list
  if (!ALLOWED_REACTION_EMOJIS.includes(emoji as (typeof ALLOWED_REACTION_EMOJIS)[number])) {
    return NextResponse.json(
      { error: 'Emoji non autorisé' },
      { status: 400 },
    );
  }

  // Check message exists
  const message = await getDb().squareMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 });
  }

  // Upsert reaction (increment count)
  const reaction = await getDb().squareReaction.upsert({
    where: { messageId_emoji: { messageId, emoji } },
    update: { count: { increment: 1 } },
    create: { messageId, emoji, count: 1 },
  });

  const broadcastData: SquareReaction = {
    messageId: reaction.messageId,
    emoji: reaction.emoji,
    count: reaction.count,
  };
  broadcastReaction(broadcastData);

  return NextResponse.json({ reaction: broadcastData });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: messageId } = await params;

  const body = await request.json();
  const parsed = squareReactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Emoji invalide' }, { status: 400 });
  }

  const { emoji } = parsed.data;

  // Find and decrement
  const existing = await getDb().squareReaction.findUnique({
    where: { messageId_emoji: { messageId, emoji } },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Réaction non trouvée' }, { status: 404 });
  }

  let reaction: SquareReaction;

  if (existing.count <= 1) {
    await getDb().squareReaction.delete({
      where: { id: existing.id },
    });
    reaction = { messageId, emoji, count: 0 };
  } else {
    const updated = await getDb().squareReaction.update({
      where: { id: existing.id },
      data: { count: { decrement: 1 } },
    });
    reaction = {
      messageId: updated.messageId,
      emoji: updated.emoji,
      count: updated.count,
    };
  }

  broadcastReaction(reaction);

  return NextResponse.json({ reaction });
}