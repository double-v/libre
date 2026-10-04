/**
 * Réponse de l'équipe à un retour (#477).
 *
 * Un membre qui pose une question par le formulaire de retour doit pouvoir lire
 * une réponse. Choix validés sur prototype :
 * - une seule réponse par retour, jamais modifiée : pas de seconde messagerie,
 *   on continue l'échange par un nouveau retour ;
 * - la réponse ne se lit que dans l'app (Paramètres › Mes retours) : ni le
 *   push ni l'e-mail ne portent son texte ni celui du retour, une boîte
 *   partagée ou un écran verrouillé ne doivent rien révéler ;
 * - le non-lu se dérive de `replyReadAt` et ne s'affiche qu'en présence
 *   (`NotificationDot`), jamais en nombre (spec 003).
 */

export const REPLY_MAX = 2000;

/** Page membre où se lisent les réponses ; cible du push et de l'e-mail. */
export const MES_RETOURS_HREF = '/settings/retours';

/** Événement DOM émis quand « Mes retours » vient de marquer les réponses lues. */
export const FEEDBACK_READ_EVENT = 'libre:feedback-read';

export type FeedbackCategory = 'bug' | 'suggestion' | 'question';

/** Ce que l'auteur reçoit de ses propres retours : ni URL, ni user-agent, ni admin. */
export interface MyFeedback {
  id: string;
  category: string;
  message: string;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
  unread: boolean;
}

interface FeedbackRow {
  id: string;
  category: string;
  message: string;
  createdAt: Date;
  reply: string | null;
  repliedAt: Date | null;
  replyReadAt: Date | null;
}

/** Colonnes lues pour « Mes retours » : la liste blanche est ici, pas dans la route. */
export const MY_FEEDBACK_SELECT = {
  id: true,
  category: true,
  message: true,
  createdAt: true,
  reply: true,
  repliedAt: true,
  replyReadAt: true,
} as const;

export function toMyFeedback(row: FeedbackRow): MyFeedback {
  return {
    id: row.id,
    category: row.category,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    reply: row.reply,
    repliedAt: row.repliedAt ? row.repliedAt.toISOString() : null,
    unread: row.reply !== null && row.replyReadAt === null,
  };
}

/** Filtre Prisma des réponses non lues d'un auteur. */
export function unreadReplyWhere(userId: string) {
  return { userId, reply: { not: null }, replyReadAt: null };
}
