import { getDb } from '@/lib/db';

/**
 * Messages non lus — dérivés, jamais stockés (#389, spec 003).
 *
 * Un message est « non lu » pour `me` s'il lui est adressé (dans une de ses
 * conversations, envoyé par l'autre), qu'il n'a pas de `readAt` (posé à
 * l'ouverture de la conversation par `GET messages`), qu'il n'est pas supprimé,
 * et que son expéditeur est quelqu'un que `me` verrait encore : ni bloqué par
 * lui, ni en train de le bloquer, ni banni. Sans ces exclusions la pastille
 * pointerait vers un message que l'app refuse d'afficher — une pastille qu'on
 * ne peut pas faire disparaître.
 *
 * On renvoie des identifiants de conversation, pas un compte : la charte
 * interdit tout nombre côté membre, on ne fabrique pas la donnée qu'on
 * s'interdit d'afficher.
 */
export async function unreadConversationIds(me: string): Promise<string[]> {
  const db = getDb();

  const blocks = await db.block.findMany({
    where: { OR: [{ blockerId: me }, { blockedId: me }] },
    select: { blockerId: true, blockedId: true },
  });
  const excluded = new Set<string>();
  for (const b of blocks) {
    excluded.add(b.blockerId === me ? b.blockedId : b.blockerId);
  }

  // `groupBy`, pas `findMany({ distinct })` : Prisma dédoublonne `distinct` en
  // mémoire après avoir rapatrié chaque ligne non lue. C'est le chemin chaud
  // de la feature (chaque message reçu, chaque retour au premier plan) ; le
  // résultat doit rester borné par le nombre de conversations, pas de messages.
  const rows = await db.message.groupBy({
    by: ['conversationId'],
    where: {
      readAt: null,
      deletedAt: null,
      senderId: excluded.size > 0 ? { not: me, notIn: [...excluded] } : { not: me },
      sender: { isBanned: false },
      conversation: { OR: [{ userA: me }, { userB: me }] },
    },
  });

  return rows.map((r) => r.conversationId);
}

/**
 * Règle « une notification par conversation jusqu'à lecture » (#392, R10) :
 * avant de pousser un message hors de l'app, y avait-il DÉJÀ quelque chose
 * de non lu pour le destinataire dans cette conversation, en dehors du
 * message qu'on vient d'écrire ? Si oui, la personne a déjà été prévenue ;
 * la lecture (qui pose `readAt`) réarme naturellement. Aucun état à stocker.
 */
export async function hadUnreadBefore(
  conversationId: string,
  recipientId: string,
  excludeMessageId: string,
): Promise<boolean> {
  const n = await getDb().message.count({
    where: {
      conversationId,
      readAt: null,
      deletedAt: null,
      senderId: { not: recipientId },
      id: { not: excludeMessageId },
    },
  });
  return n > 0;
}
