'use client';

import { useState, useEffect, useCallback } from 'react';

interface LogRow {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string;
  admin: { id: string; displayName: string };
  targetUser: { id: string; displayName: string };
}

const actionLabels: Record<string, string> = {
  BAN: 'Bannissement',
  UNBAN: 'Débannissement',
  WARNING: 'Avertissement',
  DELETE_USER: 'Suppression',
  APPROVE_VERIFICATION: 'Vérification approuvée',
  REJECT_VERIFICATION: 'Vérification refusée',
  DISMISS_REPORT: 'Signalement ignoré',
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      // handled below
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Logs de modération</h1>

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">Aucun log.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Admin</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Cible</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Action</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Raison</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 text-gray-400">{new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3 py-2">{log.admin.displayName}</td>
                    <td className="px-3 py-2">{log.targetUser.displayName}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.action === 'BAN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : log.action === 'UNBAN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {actionLabels[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{log.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600">Précédent</button>
              <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600">Suivant</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}