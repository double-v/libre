'use client';

import { useState } from 'react';

interface ThemeInfo {
  themeId: string;
  inputType: string;
  placeholder: string;
  maxLength: number;
  allowFreeText: boolean;
  options: string[] | null;
}

const typeMap: Record<string, string> = {
  text: 'text',
  emoji: 'emoji',
  reactions: 'reaction',
  gif: 'gif',
  polite: 'polite',
  riddle: 'riddle',
};

export default function SquareInputArea({
  theme,
  onSend,
  sending,
}: {
  theme: ThemeInfo | null;
  onSend: (content: string, type: string) => Promise<void>;
  sending: boolean;
}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  if (!theme) {
    return null;
  }

  const messageType = typeMap[theme.inputType] ?? 'text';

  const handleSendText = async () => {
    if (!input.trim() || sending) return;
    setError('');
    try {
      await onSend(input.trim(), messageType);
      setInput('');
    } catch {
      setError('Erreur de connexion');
    }
  };

  const handleQuickSend = async (content: string, type: string) => {
    setError('');
    try {
      await onSend(content, type);
    } catch {
      setError('Erreur de connexion');
    }
  };

  const renderInput = () => {
    if (theme.inputType === 'reactions' || theme.inputType === 'emoji') {
      return (
        <div className="flex flex-wrap gap-2">
          {(theme.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => handleQuickSend(opt, theme.inputType === 'emoji' ? 'emoji' : 'reaction')}
              disabled={sending}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-lg hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    if (theme.inputType === 'polite') {
      return (
        <div className="flex flex-wrap gap-2">
          {(theme.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => handleQuickSend(opt, 'polite')}
              disabled={sending}
              className="rounded-full border border-coral/30 px-3 py-1.5 text-sm text-coral hover:bg-blush disabled:opacity-50 dark:border-coral/30 dark:hover:bg-coral/10"
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    if (theme.inputType === 'gif' && theme.options && theme.options.length > 0) {
      return (
        <div
          className="grid grid-cols-4 gap-2"
          role="group"
          aria-label="Choisir un GIF à envoyer"
        >
          {theme.options.slice(0, 8).map((opt, i) => (
            <button
              key={i}
              onClick={() => handleQuickSend(opt, 'gif')}
              disabled={sending}
              aria-label={`Envoyer le GIF ${i + 1}`}
              className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
            >
              <img src={opt} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      );
    }

    // text / riddle / default: free text input
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendText();
        }}
        className="flex gap-2"
      >
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
    );
  };

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950">
      {error && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {renderInput()}
    </div>
  );
}