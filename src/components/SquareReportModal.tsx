'use client';

import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { toast } from '@/lib/toast';

const REASONS = [
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'harassment', label: 'Harcèlement' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Autre' },
] as const;

export default function SquareReportModal({
  messageId,
  onClose,
  onReported,
}: {
  messageId: string;
  onClose: () => void;
  onReported: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Trap focus inside the modal
  useFocusTrap(dialogRef, true);

  const handleReport = async () => {
    if (!reason) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/square/messages/${messageId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors du signalement');
        return;
      }

      toast('Merci, c\'est signalé. On regarde ça.');
      onReported();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="square-report-modal-title"
        className="mx-4 w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="square-report-modal-title"
          className="mb-4 text-lg font-semibold text-content"
        >
          Signaler ce message
        </h3>

        <div className="mb-4 flex flex-col gap-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                reason === r.value
                  ? 'border-coral bg-coral/10 text-coral dark:border-coral dark:bg-coral/20 dark:text-coral-light'
                  : 'border-hairline text-muted hover:border-hairline-strong'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-muted hover:bg-fill-subtle"
          >
            Annuler
          </button>
          <button
            onClick={handleReport}
            disabled={!reason || loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {loading ? 'Envoi…' : 'Signaler'}
          </button>
        </div>
      </div>
    </div>
  );
}
