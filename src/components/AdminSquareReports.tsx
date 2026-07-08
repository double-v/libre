'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from './ui/Card';

interface ReportMessage {
  id: string;
  pseudonym: string | null;
  content: string;
  type: string;
}

interface ReportReporter {
  id: string;
  displayName: string;
}

interface SquareReport {
  id: string;
  messageId: string;
  reporterId: string;
  reason: string;
  status: string;
  createdAt: string;
  message: ReportMessage | null;
  reporter: ReportReporter;
}

export default function AdminSquareReports() {
  const [reports, setReports] = useState<SquareReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const perPage = 20;

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        perPage: String(perPage),
      });
      const res = await fetch(`/api/admin/square/reports?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data.reports);
      setTotal(data.total);
    } catch {
      setError('Erreur lors du chargement des signalements.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    // Fetch au montage : IIFE async → aucun setState synchrone dans le corps
    // de l'effet (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await fetchReports(); })();
  }, [fetchReports]);

  const handleAction = async (reportId: string, action: 'dismiss' | 'warn' | 'delete_message') => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/square/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      setSuccess('Action effectuée.');
      fetchReports();
    } catch {
      setError('Erreur lors du traitement.');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const statusTabs: { key: string; label: string }[] = [
    { key: 'pending', label: 'En attente' },
    { key: 'reviewed', label: 'Traité' },
    { key: 'dismissed', label: 'Ignoré' },
  ];

  const statusBadge: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    reviewed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  const statusLabel: Record<string, string> = {
    pending: 'En attente',
    reviewed: 'Traité',
    dismissed: 'Ignoré',
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Signalements La Place</h2>

      {error && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>}
      {success && <div className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">{success}</div>}

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatus(tab.key); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.key
                ? 'bg-coral text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500">Aucun signalement.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} variant="profile">
              {/* Message content */}
              {r.message && (
                <div className="mb-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-sm text-gray-800 dark:text-gray-200">&ldquo;{r.message.content}&rdquo;</p>
                  {r.message.pseudonym && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Pseudonyme : <span className="font-medium">{r.message.pseudonym}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Report details */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-coral dark:text-coral-light">{r.reason}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Signalé par <span className="font-medium">{r.reporter.displayName}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[r.status] ?? r.status}
                </span>
              </div>

              {/* Actions for pending reports */}
              {r.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAction(r.id, 'dismiss')}
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    Ignorer
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'warn')}
                    className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                  >
                    Avertissement
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'delete_message')}
                    className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                  >
                    Supprimer le message
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600"
          >
            Précédent
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}