'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getTodayTheme, getPseudonym } from '@/lib/square/themes';
import type { SquareMessage } from '@/lib/square/store';

export default function SquareChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<SquareMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = getTodayTheme();
  const pseudonym = getPseudonym(userId);

  // SSE connection
  useEffect(() => {
    const eventSource = new EventSource('/api/square/stream');

    eventSource.onmessage = (event) => {
      if (event.data.startsWith('{')) {
        try {
          const msg: SquareMessage = JSON.parse(event.data);
          setMessages((prev) => {
            // Avoid duplicates
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

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/square/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim(), type: theme.inputType === 'text' ? 'text' : theme.inputType === 'emoji' ? 'emoji' : theme.inputType === 'reactions' ? 'reaction' : theme.inputType === 'gif' ? 'gif' : theme.inputType === 'polite' ? 'polite' : 'riddle' }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'envoi');
        return;
      }
      setInput('');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSending(false);
    }
  }, [input, sending, theme.inputType]);

  const sendQuickMessage = useCallback(async (content: string, type: string) => {
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/square/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSending(false);
    }
  }, []);

  const handleReport = async (messageId: string) => {
    // Square messages are ephemeral — report triggers a confirmation only
    if (!confirm('Signaler ce message ?')) return;
    // Note: reporting a square message doesn't map directly to a user ID
    // The admin can see the pattern and ban from square
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Theme banner */}
      <div className="shrink-0 border-b border-gray-200 bg-blush px-4 py-2 dark:border-gray-700 dark:bg-coral/5">
        <p className="text-sm font-medium text-coral dark:text-coral-light">
          🎭 {theme.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{theme.description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Tu es : <span className="font-medium text-gray-600 dark:text-gray-300">{pseudonym}</span></p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400">La Place est calme pour le moment…</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="group mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-coral dark:text-coral-light">{msg.pseudonym}</span>
              <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-sm text-gray-800 dark:text-gray-200">{msg.content}</p>
              <button
                onClick={() => handleReport(msg.id)}
                className="invisible text-xs text-gray-400 hover:text-red-500 group-hover:visible"
                aria-label="Signaler"
              >
                ⚑
              </button>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-1 text-xs text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950">
        {theme.inputType === 'reactions' || theme.inputType === 'emoji' ? (
          <div className="flex flex-wrap gap-2">
            {(theme.options ?? []).map((opt) => (
              <button
                key={opt}
                onClick={() => sendQuickMessage(opt, theme.inputType === 'emoji' ? 'emoji' : 'reaction')}
                disabled={sending}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-lg hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : theme.inputType === 'polite' ? (
          <div className="flex flex-wrap gap-2">
            {(theme.options ?? []).map((opt) => (
              <button
                key={opt}
                onClick={() => sendQuickMessage(opt, 'polite')}
                disabled={sending}
                className="rounded-full border border-coral/30 px-3 py-1.5 text-sm text-coral hover:bg-blush disabled:opacity-50 dark:border-coral/30 dark:hover:bg-coral/10"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : theme.inputType === 'gif' && theme.options && theme.options.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {theme.options.slice(0, 8).map((opt, i) => (
              <button
                key={i}
                onClick={() => sendQuickMessage(opt, 'gif')}
                disabled={sending}
                className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
              >
                <img src={opt} alt="GIF" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, theme.maxLength))}
              placeholder={theme.placeholder}
              maxLength={theme.maxLength}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-coral focus:outline-none focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50 dark:bg-terracotta dark:hover:bg-coral"
            >
              Envoyer
            </button>
          </form>
        )}
      </div>
    </div>
  );
}