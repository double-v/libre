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
      // Re-fetch messages after a brief delay to get any post-reset system messages
      setTimeout(() => {
        fetch('/api/square/messages')
          .then((res) => res.json())
          .then((data) => {
            if (data.messages) {
              setMessages(data.messages);
            }
          })
          .catch(() => {});
      }, 1000);
    });

    eventSource.addEventListener('reaction', (event) => {
      try {
        const data: SquareReaction = JSON.parse(event.data);
        setReactions((prev) => ({
          ...prev,
          [data.messageId]: {
            ...prev[data.messageId],
            [data.emoji]: data.count,
          },
        }));
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

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <SquareThemeBanner theme={theme} pseudonym={pseudonym} />
      {error && (
        <div className="px-4 py-1 text-xs text-red-600 dark:text-red-400">{error}</div>
      )}
      <SquareMessageList messages={messages} reactions={reactions} />
      <SquareInputArea theme={theme} onSend={handleSend} sending={sending} />
      <div ref={messagesEndRef} />
    </div>
  );
}