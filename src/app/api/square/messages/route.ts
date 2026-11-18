import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTodayThemeConfig, getPseudonymFromConfig } from '@/lib/square/themes-server';
import { checkContent } from '@/lib/square/moderation';
import { rateLimit, limits } from '@/lib/rate-limit';
import { getMessages, addMessage, getReactionsForMessages } from '@/lib/square/store';
import { ensureSquareFresh } from '@/lib/square/reset';
import { squareMessageSchema } from '@/lib/square/validators';
import type { SquareMessage } from '@/lib/square/store';
import { gardeFeature } from '@/lib/features-server';
import { compteEstAdmin, compteEstBanni, selectStatutCompte } from '@/lib/admin-role';

export async function GET() {
  // Interrupteur admin (#418)
  const refus = await gardeFeature('square');
  if (refus) return refus;
  // Le reset quotidien s'exécute ici, avant la lecture : sans cron qui marche,
  // c'est le premier arrivant après l'heure qui tourne la page (#13). Ne jette
  // jamais — au pire la Place reste sur la veille une lecture de plus.
  await ensureSquareFresh();

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
  // Interrupteur admin (#418)
  const refus = await gardeFeature('square');
  if (refus) return refus;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limiting
  const rl = await rateLimit(`square:${userId}`, limits.squareMessage.limit, limits.squareMessage.windowMs);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de messages. Réessayez dans un moment.' },
      { status: 429 },
    );
  }

  // Check if user is banned from square
  const user = await getDb().user.findUnique({
    where: { id: userId },
    select: { squareBannedUntil: true, ...selectStatutCompte },
  });

  // Le proxy ne contrôle pas les bannis sur /api/* : la route le fait, sur le
  // compte relu, et refuse aussi un compte supprimé dont le jeton vit encore (#552).
  if (!user) {
    return NextResponse.json({ error: 'Ta session a expiré. Reconnecte-toi pour écrire sur la Place.' }, { status: 401 });
  }
  if (compteEstBanni(user)) {
    return NextResponse.json({ error: 'Ton compte est suspendu.' }, { status: 403 });
  }

  if (user.squareBannedUntil && user.squareBannedUntil > new Date()) {
    return NextResponse.json({ error: 'Vous êtes banni(e) de la Place' }, { status: 403 });
  }

  // Écrire aussi doit tourner la page : sans ça, le premier message du jour
  // s'ajouterait à la suite du fil de la veille.
  await ensureSquareFresh();

  const theme = await getTodayThemeConfig();
  const body = await request.json();
  const parsed = squareMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 });
  }

  const { content, type, gifUrl } = parsed.data;

  // Validate message against today's theme rules
  if (!theme.allowFreeText && theme.options && !theme.options.includes(content)) {
    // For emoji/reaction types, content is single characters, skip strict validation
    if (type === 'emoji' || type === 'reaction') {
      // Emoji/reaction content is single characters, skip strict validation
    } else if (type === 'polite') {
      return NextResponse.json({ error: 'Message non autorisé pour le thème du jour' }, { status: 400 });
    }
    // GIFs are handled separately: the URL was already validated as a GIPHY media URL.
  }

  if (content.length > theme.maxLength) {
    return NextResponse.json({ error: 'Message trop long' }, { status: 400 });
  }

  // Moderation check (skip for GIFs: the URL is already restricted to GIPHY,
  // and GIPHY enforces pg-13 via the API key)
  let censored = content;
  if (type !== 'gif') {
    const moderationResult = await checkContent(content);
    if (!moderationResult.allowed) {
      return NextResponse.json(
        { error: 'Ce message contient du contenu non autorisé' },
        { status: 403 },
      );
    }
    censored = moderationResult.censored;
  }

  const pseudonym = await getPseudonymFromConfig(userId);
  // Badge décidé par le compte relu plus haut, jamais par le jeton : un jeton
  // peut être périmé (admin rétrogradé, #155) ou volé (#552).
  const isAdmin = compteEstAdmin(user);

  const message = await addMessage({
    pseudonym,
    content: censored,
    type: type as SquareMessage['type'],
    isAdmin,
    themeConfigId: theme.id,
    gifUrl: gifUrl ?? null,
  });

  return NextResponse.json({ message }, { status: 201 });
}