'use client';

import { useState } from 'react';
import type { SquareMessage } from '@/lib/square/store';
import SquareReportModal from './SquareReportModal';

const DISPLAY_REACTION_EMOJIS = ['❤️', '😂', '🔥', '👋'];

/**
 * Map<messageId, Set<emoji>> des réactions du user courant.
 * Vide (ou manquant) → le user n'a réagi à rien.
 *
 * Convention visuelle : un bouton dans `myReactions[msgId]` est "actif",
 * avec bordure + fond léger. Voir `activeReactionClasses` plus bas.
 */
type MyReactions = Record<string, Set<string>>;

export default function SquareMessageList({
  messages,
  reactions,
  myReactions = {},
  onReactionUpdate,
}: {
  messages: SquareMessage[];
  reactions: Record<string, Record<string, number>>;
  myReactions?: MyReactions;
  onReactionUpdate?: (messageId: string, emoji: string, added: boolean, count: number) => void;
}) {
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportedMessages, setReportedMessages] = useState<Set<string>>(new Set());

  const handleReported = () => {
    if (reportingMessageId) {
      setReportedMessages((prev) => new Set(prev).add(reportingMessageId));
      setReportingMessageId(null);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/square/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) return;
      const body = await res.json();
      // Réponse attendue : { reaction: { messageId, emoji, count, added } }
      if (body?.reaction && onReactionUpdate) {
        onReactionUpdate(
          body.reaction.messageId,
          body.reaction.emoji,
          body.reaction.added,
          body.reaction.count,
        );
      }
    } catch {
      // Best-effort : on laisse le SSE faire la mise à jour si le POST échoue.
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400">La Place est calme pour le moment…</p>
        )}
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="mb-3 flex justify-center">
                <div className="rounded-lg bg-blue-50 px-3 py-1.5 text-center text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  {msg.content}
                </div>
              </div>
            );
          }

          const msgReactions = reactions[msg.id] ?? {};
          const myMsgReactions = myReactions[msg.id];
          const isReported = reportedMessages.has(msg.id);

          return (
            <div key={msg.id} className="group mb-3">
              <div className="flex items-baseline gap-2">
                {msg.isAdmin ? (
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    🛡 {msg.pseudonym}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-coral dark:text-coral-light">
                    {msg.pseudonym}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-sm text-gray-800 dark:text-gray-200">{msg.content}</p>
                {isReported ? (
                  <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                ) : (
                  <button
                    onClick={() => setReportingMessageId(msg.id)}
                    className="invisible text-xs text-gray-400 hover:text-red-500 group-hover:visible"
                    aria-label="Signaler"
                  >
                    ⚑
                  </button>
                )}
              </div>
              {/* Reaction bar */}
              <div className="mt-1 flex gap-1">
                {DISPLAY_REACTION_EMOJIS.map((emoji) => {
                  const isActive = myMsgReactions?.has(emoji) ?? false;
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(msg.id, emoji)}
                      className={
                        isActive
                          ? 'rounded-full border border-coral bg-blush px-1.5 py-0.5 text-xs transition-colors dark:border-coral-light dark:bg-coral/10'
                          : 'rounded-full border border-transparent px-1.5 py-0.5 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                      aria-pressed={isActive}
                      aria-label={`Réagir avec ${emoji}`}
                    >
                      {emoji}
                      {msgReactions[emoji] ? (
                        <span className="ml-0.5 text-[10px] text-gray-500">{msgReactions[emoji]}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {reportingMessageId && (
        <SquareReportModal
          messageId={reportingMessageId}
          onClose={() => setReportingMessageId(null)}
          onReported={handleReported}
        />
      )}
    </>
  );
}
