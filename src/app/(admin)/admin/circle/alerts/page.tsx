'use client';

import { useState, useEffect, useCallback } from 'react';

interface AlertRow {
  id: string;
  contactId: string;
  deliveryStatus: string;
  sentAt: string;
  checkin: {
    id: string;
    userId: string;
    status: string;
    triggeredAt: string;
    expiresAt: string;
    user: { id: string; displayName: string };
  };
  contact: { id: string; displayName: string };
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'En file',
  sent: 'Envoyée',
  failed: 'Échouée',
  handled: 'Traitée',
};

const STATUS_DOT: Record<string, string> = {
  queued: 'bg-amber-400',
  sent: 'bg-blue-500',
  failed: 'bg-red-500',
  handled: 'bg-emerald-500',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminCircleAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('sent');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [handling, setHandling] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, page: String(page), perPage: '20' });
      const res = await fetch(`/api/admin/circle/alerts?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAlerts(data.alerts);
      setTotal(data.total);
    } catch {
      setActionError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    // Fetch au montage : IIFE async → aucun setState synchrone dans le corps
    // de l'effet (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await fetchAlerts(); })();
  }, [fetchAlerts]);

  const handleAlert = async (alertId: string) => {
    setHandling(alertId);
    setActionError('');
    try {
      const res = await fetch(`/api/admin/circle/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'HANDLE' }),
      });
      if (!res.ok) throw new Error();
      fetchAlerts();
    } catch {
      setActionError('Erreur lors du traitement');
    } finally {
      setHandling(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Alertes de sécurité du Cercle
      </h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Alertes envoyées aux contacts de confiance lorsqu&apos;un check-in de
        sécurité expire. Marquez-les comme traitées une fois suivies.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1); }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              status === key
                ? 'bg-coral text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[key] ?? 'bg-gray-400'}`} />
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <div role="alert" className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {actionError}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : alerts.length === 0 ? (
        <p className="text-gray-500">Aucune alerte dans cette catégorie.</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              data-testid="alert-row"
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {a.checkin.user.displayName}
                    </span>
                    <span className="text-gray-500"> · check-in </span>
                    <span className="font-mono text-xs text-gray-500">{a.checkin.id.slice(0, 8)}</span>
                    <span className="text-gray-500"> ({a.checkin.status})</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Alerte envoyée à{' '}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {a.contact.displayName}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Expirait le {formatDate(a.checkin.expiresAt)} · alerte du {formatDate(a.sentAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300`}
                  >
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[a.deliveryStatus] ?? 'bg-gray-400'}`} />
                    {STATUS_LABELS[a.deliveryStatus] ?? a.deliveryStatus}
                  </span>
                </div>
              </div>
              {a.deliveryStatus !== 'handled' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAlert(a.id)}
                    disabled={handling === a.id}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                  >
                    {handling === a.id ? 'Traitement…' : 'Marquer comme traité'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
