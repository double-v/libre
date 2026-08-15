'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface FeedbackRow {
  id: string;
  category: string;
  message: string;
  url: string | null;
  userAgent: string | null;
  status: string;
  createdAt: string;
  user: { id: string; displayName: string } | null;
}

const categoryLabels: Record<string, string> = {
  bug: 'Bug',
  suggestion: 'Idée',
  question: 'Question',
};

const categoryStyles: Record<string, string> = {
  bug: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  suggestion: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  question: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const statusLabels: Record<string, string> = {
  open: 'À traiter',
  resolved: 'Traités',
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, page: String(page), perPage: '20' });
      if (category) params.set('category', category);
      const res = await fetch(`/api/admin/feedback?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setActionError('Impossible de charger les retours');
    } finally {
      setLoading(false);
    }
  }, [status, category, page]);

  useEffect(() => {
    // Fetch au montage : IIFE async → aucun setState synchrone dans le corps
    // de l'effet (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await fetchFeedback(); })();
  }, [fetchFeedback]);

  const handleStatus = async (id: string, next: 'open' | 'resolved') => {
    setActionError('');
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      fetchFeedback();
    } catch {
      setActionError('Erreur lors du traitement');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-content">Retours</h1>

      <div className="mb-3 flex gap-2">
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === key ? 'bg-coral text-white' : 'bg-fill-subtle text-muted hover:bg-fill-subtle'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => { setCategory(''); setPage(1); }}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${category === '' ? 'bg-content text-surface' : 'bg-fill-subtle text-muted'}`}
        >
          Toutes
        </button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setCategory(key); setPage(1); }}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${category === key ? 'bg-content text-surface' : 'bg-fill-subtle text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{actionError}</div>}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">Aucun retour.</p>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="rounded-xl border border-hairline p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryStyles[f.category] ?? 'bg-fill-subtle text-muted'}`}>
                      {categoryLabels[f.category] ?? f.category}
                    </span>
                    {f.user ? (
                      <Link href={`/admin/users/${f.user.id}`} className="text-sm font-medium text-coral hover:underline dark:text-coral-light">
                        {f.user.displayName}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">Anonyme</span>
                    )}
                    <span className="text-xs text-muted">
                      {new Date(f.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-content">{f.message}</p>

                  {f.url && (
                    <p className="mt-2 break-all text-xs text-muted">
                      Depuis : <span className="font-mono">{f.url}</span>
                    </p>
                  )}
                  {f.userAgent && (
                    <p className="mt-1 break-all text-xs text-muted">{f.userAgent}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {f.status === 'open' ? (
                  <button
                    onClick={() => handleStatus(f.id, 'resolved')}
                    className="rounded-md border border-hairline-strong px-3 py-1 text-xs font-medium text-muted hover:bg-fill-subtle"
                  >
                    Marquer traité
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatus(f.id, 'open')}
                    className="rounded-md border border-hairline-strong px-3 py-1 text-xs font-medium text-muted hover:bg-fill-subtle"
                  >
                    Rouvrir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-md border border-hairline-strong px-3 py-1 text-sm disabled:opacity-50">Précédent</button>
          <span className="px-3 py-1 text-sm text-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-md border border-hairline-strong px-3 py-1 text-sm disabled:opacity-50">Suivant</button>
        </div>
      )}
    </div>
  );
}
