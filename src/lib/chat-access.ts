import { getDb } from '@/lib/db';

/**
 * Vérifie que l'utilisateur authentifié est bien participant d'une conversation
 * 1:1. Partagé par les routes messages (liste/envoi) et messages/[id]
 * (suppression) — source unique de vérité pour le contrôle d'accès.
 *
 * Retourne `{ conversation }` si OK, sinon `{ error, status }` (404 conversation
 * absente, 403 non-participant).
 */
export async function verifyParticipant(conversationId: string, userId: string) {
  const conversation = await getDb().conversation.findUnique({
    where: { id: conversationId },
    select: { userA: true, userB: true },
  });
  if (!conversation) return { error: 'Not found' as const, status: 404 };
  if (conversation.userA !== userId && conversation.userB !== userId) {
    return { error: 'Forbidden' as const, status: 403 };
  }
  return { conversation };
}
