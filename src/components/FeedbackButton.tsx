'use client';

import { useState, useRef, useEffect } from 'react';

type Category = 'bug' | 'suggestion' | 'question';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Listen for external open-feedback event (from BetaBanner)
  useEffect(() => {
    function onOpenFeedback() {
      setOpen(true);
    }
    window.addEventListener('open-feedback', onOpenFeedback);
    return () => window.removeEventListener('open-feedback', onOpenFeedback);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          url: window.location.href,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Une erreur est survenue');
        return;
      }
      setSubmitted(true);
      setMessage('');
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
      }, 2000);
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-chrome right-4 z-40" ref={panelRef}>
      {open && (
        <div className="mb-2 w-72 rounded-xl border border-hairline bg-surface p-4 shadow-lg">
          {submitted ? (
            <p className="py-4 text-center text-sm text-coral">
              Merci pour votre retour !
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-content">
                  Signaler / Suggérer
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted hover:text-content"
                  aria-label="Fermer"
                >
                  &times;
                </button>
              </div>

              <div className="mb-3 flex gap-2">
                {(['bug', 'suggestion', 'question'] as Category[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      category === cat
                        ? 'bg-coral text-white'
                        : 'bg-fill-subtle text-muted hover:bg-fill-subtle'
                    }`}
                  >
                    {cat === 'bug'
                      ? 'Bug'
                      : cat === 'suggestion'
                        ? 'Idée'
                        : 'Question'}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === 'bug'
                    ? 'Décrivez le problème...'
                    : category === 'suggestion'
                      ? 'Votre idée...'
                      : 'Votre question...'
                }
                className="mb-3 h-24 w-full resize-none rounded-lg border border-hairline bg-fill-subtle p-2 text-sm text-content focus:border-coral focus:outline-none dark:placeholder:text-muted"
                required
                minLength={5}
                maxLength={2000}
              />

              {error && (
                <p className="mb-2 text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || message.trim().length < 5}
                className="w-full rounded-lg bg-coral px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta disabled:opacity-50"
              >
                {submitting ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-coral text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Signaler un problème ou suggérer une amélioration"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}