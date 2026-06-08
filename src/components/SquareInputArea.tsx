'use client';

import { useState } from 'react';
import type { ThemeInfo } from './SquareThemeBanner';
import GifPicker from './GifPicker';

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
  onSend: (content: string, type: string, gifUrl?: string) => void;
  sending: boolean;
}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);

  if (!theme) {
    return null;
  }

  const messageType = typeMap[theme.inputType] ?? 'text';

  const handleSendText = () => {
    if (!input.trim() || sending) return;
    setError('');
    onSend(input.trim(), messageType);
    setInput('');
  };

  const handleQuickSend = (content: string, type: string) => {
    setError('');
    onSend(content, type);
  };

  const handleGifSelect = (gif: { id: string; url: string; title: string }) => {
    setShowGifPicker(false);
    setError('');
    // Content vide : le message affichera uniquement le GIF.
    onSend('', 'gif', gif.url);
  };

  const renderInput = () => {
    if (theme.inputType === 'reactions' || theme.inputType === 'emoji') {
      return (
        <div className="flex flex-wrap gap-2">
          {(theme.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() =>
                handleQuickSend(
                  opt,
                  theme.inputType === 'emoji' ? 'emoji' : 'reaction',
                )
              }
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

    if (theme.inputType === 'gif') {
      return (
        <>
          <button
            onClick={() => setShowGifPicker(true)}
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-coral/40 bg-blush px-4 py-3 text-sm font-medium text-coral transition-colors hover:bg-coral/10 disabled:opacity-50 dark:border-coral/30 dark:hover:bg-coral/10"
            aria-label="Choisir un GIF"
          >
            🎬 Choisir un GIF
          </button>
          {showGifPicker && (
            <GifPicker
              onSelect={handleGifSelect}
              onClose={() => setShowGifPicker(false)}
            />
          )}
        </>
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
