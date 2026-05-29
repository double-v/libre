'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReportRow {
  id: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  reporter: { id: string; displayName: string };
  reported: { id: string; displayName: string; isBanned: boolean };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, page: String(page), perPage: '20' });
      const res = await fetch(`/api/admin/reports?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data.reports);
      setTotal(data.total);
    } catch {
      // handled below
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleAction = async (reportId: string, action: 'DISMISS_REPORT' | 'BAN' | 'WARNING', reason?: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error();
      fetchReports();
    } catch {
      setActionError('Erreur lors du traitement');
    }
  };

  const totalPages = Math.ceil(total / 20);

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    resolved: 'Résolu',
    dismissed: 'Ignoré',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Signalements</h1>

      <div className="mb-4 flex gap-2">
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === key ? 'bg-coral text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{actionError}</div>}

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500">Aucun signalement.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{r.reported.displayName}</span>
                    <span className="text-gray-500"> signalé par </span>
                    <span className="font-medium">{r.reporter.displayName}</span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-coral dark:text-coral-light">{r.reason}</p>
                  {r.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{r.description}</p>}
                  <p className="mt-1 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                {r.reported.isBanned && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">Banni</span>}
              </div>
              {status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleAction(r.id, 'DISMISS_REPORT')} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">
                    Ignorer
                  </button>
                  <button onClick={() => handleAction(r.id, 'WARNING')} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                    Avertissement
                  </button>
                  <button onClick={() => handleAction(r.id, 'BAN')} className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    Bannir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600">Précédent</button>
          <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600">Suivant</button>
        </div>
      )}
    </div>
  );
}