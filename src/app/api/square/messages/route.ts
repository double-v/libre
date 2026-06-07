import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTodayThemeConfig, getPseudonymFromConfig } from '@/lib/square/themes-server';
import { checkContent } from '@/lib/square/moderation';
import { rateLimit, limits } from '@/lib/rate-limit';
import { getMessages, addMessage, getReactionsForMessages } from '@/lib/square/store';
import { squareMessageSchema } from '@/lib/square/validators';
import type { SquareMessage } from '@/lib/square/store';

export async function GET() {
  const messages = await getMessages();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Pour les visiteurs non connectés on renvoie des maps vides ; la
  // forme de la réponse reste identique, juste vide. Les boutons de
  // réaction sont désactivés côté client de toute façon.
  const reactions = userId
    ? await getReactionsForMessages(messages.map((m) => m.id), userId)
    : { counts: {}, mine: {} };

  return NextResponse.json({ messages, reactions });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limiting
  const rl = rateLimit(`square:${userId}`, limits.squareMessage.limit, limits.squareMessage.windowMs);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de messages. Réessayez dans un moment.' },
      { status: 429 },
    );
  }

  // Check if user is banned from square
  const user = await getDb().user.findUnique({
    where: { id: userId },
    select: { squareBannedUntil: true, role: true },
  });

  if (user?.squareBannedUntil && user.squareBannedUntil > new Date()) {
    return NextResponse.json({ error: 'Vous êtes banni(e) de la Place' }, { status: 403 });
  }

  const theme = await getTodayThemeConfig();
  const body = await request.json();
  const parsed = squareMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 });
  }

  const { content, type } = parsed.data;

  // Validate message against today's theme rules
  if (!theme.allowFreeText && theme.options && !theme.options.includes(content)) {
    // For emoji/reaction types, content is single characters, skip strict validation
    if (type === 'emoji' || type === 'reaction') {
      // Emoji/reaction content is single characters, skip strict validation
    } else if (type === 'polite' || type === 'gif') {
      return NextResponse.json({ error: 'Message non autorisé pour le thème du jour' }, { status: 400 });
    }
  }

  if (content.length > theme.maxLength) {
    return NextResponse.json({ error: 'Message trop long' }, { status: 400 });
  }

  // Moderation check
  const moderationResult = await checkContent(content);
  if (!moderationResult.allowed) {
    return NextResponse.json(
      { error: 'Ce message contient du contenu non autorisé' },
      { status: 403 },
    );
  }

  const pseudonym = await getPseudonymFromConfig(userId);
  const isAdmin = session.user.role === 'ADMIN';

  const message = await addMessage({
    pseudonym,
    content: moderationResult.censored,
    type: type as SquareMessage['type'],
    isAdmin,
    themeConfigId: theme.id,
  });

  return NextResponse.json({ message }, { status: 201 });
}