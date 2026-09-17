import { NextResponse, after, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { messageSchema } from '@/lib/validators';
import { pusher, getPusherChannel, getUserChannel } from '@/lib/pusher';
import { rateLimit, limits } from '@/lib/rate-limit';
import { verifyParticipant } from '@/lib/chat-access';
import { hadUnreadBefore } from '@/lib/chat-unread';
import { sendPushToUser, buildPayload } from '@/lib/push/server';

// Pagination par curseur (#200) — évite de charger/déchiffrer tout le fil.
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// GET /api/chat/[conversationId]/messages?cursor=<messageId>&limit=<n>
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const userId = session.user.id;

    const result = await verifyParticipant(conversationId, userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { searchParams } = request.nextUrl;
    const cursor = searchParams.get('cursor') || undefined;
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10);
    const limit = Math.min(
      Math.max(Number.isNaN(rawLimit) ? DEFAULT_PAGE_SIZE : rawLimit, 1),
      MAX_PAGE_SIZE,
    );

    // Page anti-chronologique (plus récents d'abord). Ordre total (createdAt, id)
    // pour un curseur stable — pas de doublon ni de trou même à createdAt égal
    // (pattern curseur de #180). `take: limit + 1` détecte s'il reste des plus
    // anciens sans requête de comptage.
    const rows = await getDb().message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    // `page` est en desc : son dernier élément est le plus ancien de la page →
    // curseur pour charger la tranche encore plus ancienne au scroll-up.
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].id : null;

    // Mark unread messages addressed to this user as read (inchangé — non-régression).
    await getDb().message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    // Return in chronological order (oldest first). Deleted messages keep their
    // slot in the thread (tombstone côté client via `deletedAt`) mais leur
    // contenu (ciphertext) est masqué : on ne le renvoie jamais aux clients une
    // fois le message supprimé par son auteur (cf. #201, soft-delete).
    const sorted = [...page]
      .reverse()
      .map((m) => (m.deletedAt ? { ...m, content: '' } : m));

    return NextResponse.json({ messages: sorted, nextCursor }, { status: 200 });
  } catch (error) {
    console.error('Messages list error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/chat/[conversationId]/messages
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`message:${session.user.id}`, limits.message.limit, limits.message.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const { conversationId } = await params;
    const userId = session.user.id;

    const result = await verifyParticipant(conversationId, userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Content is CIPHERTEXT — encrypted client-side before sending.
    // The server never sees plaintext.
    const message = await getDb().message.create({
      data: {
        conversationId,
        senderId: userId,
        content: parsed.data.content,
      },
    });

    // Pusher real-time notification — only metadata, NOT the content.
    // Clients fetch the encrypted content separately.
    //
    // BEST-EFFORT : le message est DÉJÀ persisté ci-dessus. Une panne Pusher
    // (creds invalides, quota du plan atteint, réseau) ne doit jamais faire
    // échouer un envoi réussi — sinon l'utilisateur voit une erreur 500 pour
    // un message pourtant bien enregistré (bug prod observé). Même philosophie
    // que le rate limiter et que la notif « new-match » dans /api/likes : on
    // log et on dégrade, on ne bloque pas l'utilisateur sur une panne d'infra.
    try {
      const channel = getPusherChannel(conversationId);
      await pusher.trigger(channel, 'new-message', {
        id: message.id,
        senderId: message.senderId,
        createdAt: message.createdAt,
      });
    } catch (pusherError) {
      console.error('Pusher new-message notification error:', pusherError);
    }

    // #389 : le destinataire doit voir la pastille de non-lu où qu'il soit dans
    // l'app, pas seulement conversation ouverte → second événement sur SON canal
    // utilisateur. Métadonnées minimales : l'identifiant de conversation suffit à
    // rafraîchir la pastille, ni contenu ni expéditeur ne circulent. Même
    // best-effort, dans son propre try : l'échec de l'un n'annule pas l'autre.
    const { conversation } = result;
    const recipientId = conversation.userA === userId ? conversation.userB : conversation.userA;
    try {
      await pusher.trigger(getUserChannel(recipientId), 'new-message', { conversationId });
    } catch (pusherError) {
      console.error('Pusher new-message (user channel) notification error:', pusherError);
    }

    // #392 : prévenir hors de l'app, après la réponse (`after`), et une seule
    // fois par conversation jusqu'à lecture (R10) — si un message non lu
    // attendait déjà, la personne a déjà été prévenue. Best-effort de bout en
    // bout : `sendPushToUser` ne lève jamais, et on couvre aussi le comptage.
    after(async () => {
      try {
        if (await hadUnreadBefore(conversationId, recipientId, message)) return;
        await sendPushToUser(recipientId, buildPayload('message', { conversationId }));
      } catch (err) {
        console.error('push.message.skipped', { reason: (err as Error)?.message?.slice(0, 80) });
      }
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Message create error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}