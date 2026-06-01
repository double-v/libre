'use client';

import { useState } from 'react';

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

      onReported();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500'
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
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
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