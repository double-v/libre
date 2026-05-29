import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTodayTheme, getPseudonym } from '@/lib/square/themes';
import { addMessage } from '@/lib/square/store';
import { squareMessageSchema } from '@/lib/square/validators';
import type { SquareMessage } from '@/lib/square/store';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Check if user is banned from square
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { squareBannedUntil: true, role: true },
  });

  if (user?.squareBannedUntil && user.squareBannedUntil > new Date()) {
    return NextResponse.json({ error: 'Vous êtes banni(e) de la Place' }, { status: 403 });
  }

  const theme = getTodayTheme();
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

  const pseudonym = getPseudonym(userId);
  const isAdmin = session.user.role === 'ADMIN';

  const message = await addMessage({
    pseudonym,
    content,
    type: type as SquareMessage['type'],
    isAdmin,
  });

  return NextResponse.json({ message }, { status: 201 });
}