'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SquareMessage, SquareReaction } from '@/lib/square/store';
import type { ThemeInfo } from './SquareThemeBanner';
import SquareThemeBanner from './SquareThemeBanner';
import SquareMessageList from './SquareMessageList';
import SquareInputArea from './SquareInputArea';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

function generatePseudonym(userId: string, pseudonymNames: string[] | null | undefined): string {
  const now = new Date();
  const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

  const names = pseudonymNames ?? [];
  if (names.length > 0) {
    const index = Math.abs(hashCode(userId + daySeed)) % names.length;
    return names[index];
  }

  // Fallback pseudonym generation (matches server-side fallback)
  const fallbackNames = ['Anonyme', 'Mystère', 'Passant', 'Visiteur', 'Inconnu'];
  const index = Math.abs(hashCode(userId + daySeed)) % fallbackNames.length;
  return fallbackNames[index];
}

export default function SquareChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<SquareMessage[]>([]);
  const [theme, setTheme] = useState<ThemeInfo | null>(null);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, Set<string>>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pseudonym = generatePseudonym(userId, theme?.pseudonymNames);

  // Fetch theme config on mount
  useEffect(() => {
    fetch('/api/square/theme')
      .then((res) => res.json())
      .then((data) => setTheme(data))
      .catch(() => {
        // Theme will remain null, banner shows loading state
      });
  }, []);

  // Fetch initial messages on mount
  useEffect(() => {
    fetch('/api/square/messages')
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
        }
        if (data.reactions) {
          setReactions(data.reactions.counts ?? {});
          // Wire shape: Record<messageId, string[]>. On convertit en Set<>
          // une seule fois à l'hydratation (les .has() répétés sont plus
          // rapides que .includes()). Cf. api-orm-patterns #3.
          const mineArr = (data.reactions.mine ?? {}) as Record<string, string[]>;
          const mineSets: Record<string, Set<string>> = {};
          for (const [mid, emojis] of Object.entries(mineArr)) {
            mineSets[mid] = new Set(emojis);
          }
          setMyReactions(mineSets);
        }
      })
      .catch(() => {
        // Messages will remain empty, list shows empty state
      });
  }, []);

  // SSE connection for real-time events
  useEffect(() => {
    const eventSource = new EventSource('/api/square/stream');

    // Typed event listeners
    eventSource.addEventListener('message', (event) => {
      try {
        const msg: SquareMessage = JSON.parse(event.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {
        // Ignore malformed data
      }
    });

    eventSource.addEventListener('system', (event) => {
      try {
        const msg: SquareMessage = JSON.parse(event.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {
        // Ignore malformed data
      }
    });

    eventSource.addEventListener('reset', () => {
      setMessages([]);
      setReactions({});
      setMyReactions({});
      // Re-fetch messages after a brief delay to get any post-reset system messages
      setTimeout(() => {
        fetch('/api/square/messages')
          .then((res) => res.json())
          .then((data) => {
            if (data.messages) {
              setMessages(data.messages);
            }
            if (data.reactions) {
              setReactions(data.reactions.counts ?? {});
              const mineArr = (data.reactions.mine ?? {}) as Record<string, string[]>;
              const mineSets: Record<string, Set<string>> = {};
              for (const [mid, emojis] of Object.entries(mineArr)) {
                mineSets[mid] = new Set(emojis);
              }
              setMyReactions(mineSets);
            }
          })
          .catch(() => {});
      }, 1000);
    });

    eventSource.addEventListener('reaction', (event) => {
      try {
        const data: SquareReaction = JSON.parse(event.data);
        // Update agrégé (toujours).
        setReactions((prev) => ({
          ...prev,
          [data.messageId]: {
            ...prev[data.messageId],
            [data.emoji]: data.count,
          },
        }));
        // Update "mes réactions" si le broadcast porte le flag `added`
        // (toujours présent depuis #15). Si absent (legacy), on n'agit
        // pas sur myReactions : c'est la situation "broadcast sans
        // owner", on ne sait pas si c'est nous.
        if (typeof data.added === 'boolean') {
          setMyReactions((prev) => {
            const current = prev[data.messageId] ?? new Set<string>();
            const next = new Set(current);
            if (data.added === true) {
              next.add(data.emoji);
            } else {
              next.delete(data.emoji);
            }
            return { ...prev, [data.messageId]: next };
          });
        }
      } catch {
        // Ignore malformed data
      }
    });

    eventSource.addEventListener('delete', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.messageId) {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        }
      } catch {
        // Ignore malformed data
      }
    });

    // Backward compatibility: untyped messages
    eventSource.onmessage = (event) => {
      if (event.data.startsWith('{')) {
        try {
          const msg: SquareMessage = JSON.parse(event.data);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } catch {
          // Ignore malformed data
        }
      }
    };

    eventSource.onerror = () => {
      // Auto-reconnect is handled by EventSource
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (content: string, type: string, gifUrl?: string) => {
      setSending(true);
      setError('');

      try {
        const res = await fetch('/api/square/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            type,
            ...(gifUrl ? { gifUrl } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Erreur lors de l'envoi");
          return;
        }
      } catch {
        setError('Erreur de connexion');
      } finally {
        setSending(false);
      }
    },
    [],
  );

  /**
   * Optimistic update : on applique la réponse du POST immédiatement
   * (count + myReactions) sans attendre le SSE. Le SSE qui arrive
   * ensuite applique le même état, donc idempotent.
   *
   * Si la réponse POST manque `added` (improbable mais possible si le
   * serveur ne suit pas le contrat), on n'agit pas sur myReactions.
   */
  const handleReactionUpdate = useCallback(
    (messageId: string, emoji: string, added: boolean, count: number) => {
      setReactions((prev) => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          [emoji]: count,
        },
      }));
      if (typeof added === 'boolean') {
        setMyReactions((prev) => {
          const current = prev[messageId] ?? new Set<string>();
          const next = new Set(current);
          if (added) {
            next.add(emoji);
          } else {
            next.delete(emoji);
          }
          return { ...prev, [messageId]: next };
        });
      }
    },
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SquareThemeBanner theme={theme} pseudonym={pseudonym} />
      {error && (
        <div className="px-4 py-1 text-xs text-red-600 dark:text-red-400">{error}</div>
      )}
      <SquareMessageList
        messages={messages}
        reactions={reactions}
        myReactions={myReactions}
        onReactionUpdate={handleReactionUpdate}
      />
      <SquareInputArea theme={theme} onSend={handleSend} sending={sending} />
      <div ref={messagesEndRef} />
    </div>
  );
}