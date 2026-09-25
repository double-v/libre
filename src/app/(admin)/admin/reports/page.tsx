'use client';

import { useState, useEffect, useCallback } from 'react';
import { choiceLabels, questionByKey } from '@/lib/questions';

interface ReportRow {
  id: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  reporter: { id: string; displayName: string };
  reported: {
    id: string;
    displayName: string;
    isBanned: boolean;
    profileAnswers?: { id: string; questionKey: string; choices: string[]; text: string; removedAt?: string | null }[];
  };
  /** Réponses copiées au moment du signalement (spec 009) : la preuve. */
  answersSnapshot?: { questionKey: string; choices: string[]; text: string }[] | null;
}

/** Réponse lisible par l'admin : intitulé, choix en clair, texte. */
function AnswerForReview({ a, onRemove }: { a: { id?: string; questionKey: string; choices: string[]; text: string; removedAt?: string | null }; onRemove?: (id: string) => void }) {
  const q = questionByKey(a.questionKey);
  const choix = choiceLabels(a.questionKey, a.choices).join(' · ');
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg bg-fill-subtle p-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">
          {q?.label ?? a.questionKey}
          {a.removedAt && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Réécrite après un retrait</span>}
        </p>
        {choix && <p className="mt-0.5 text-sm font-medium text-content">{choix}</p>}
        {a.text && <p className="mt-0.5 whitespace-pre-line text-sm text-content">{a.text}</p>}
      </div>
      {onRemove && a.id && (
      <button
        onClick={() => onRemove(a.id!)}
        className="shrink-0 rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
      >
        Retirer cette réponse
      </button>
      )}
    </li>
  );
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

  // Spec 009 (US3) : retirer une réponse publique jugée inappropriée.
  const removeAnswer = async (id: string) => {
    setActionError('');
    try {
      const res = await fetch(`/api/admin/answers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'removed' }),
      });
      if (!res.ok) throw new Error();
      await fetchReports();
    } catch {
      setActionError('Impossible de retirer cette réponse. Réessaie.');
    }
  };

  useEffect(() => {
    // Fetch au montage : IIFE async → aucun setState synchrone dans le corps
    // de l'effet (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await fetchReports(); })();
  }, [fetchReports]);

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
      <h1 className="mb-6 text-2xl font-bold text-content">Signalements</h1>

      <div className="mb-4 flex gap-2">
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

      {actionError && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{actionError}</div>}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : reports.length === 0 ? (
        <p className="text-muted">Aucun signalement.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-hairline p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-content">{r.reported.displayName}</span>
                    <span className="text-muted"> signalé par </span>
                    <span className="font-medium">{r.reporter.displayName}</span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-coral dark:text-coral-light">{r.reason}</p>
                  {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
                  <p className="mt-1 text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                {r.reported.isBanned && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">Banni</span>}
              </div>
              {r.answersSnapshot && r.answersSnapshot.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Ses réponses au moment du signalement</p>
                  <ul className="space-y-2">
                    {r.answersSnapshot.map((a) => (
                      <AnswerForReview key={a.questionKey} a={a} />
                    ))}
                  </ul>
                </div>
              )}
              {r.reported.profileAnswers && r.reported.profileAnswers.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Ses réponses aujourd’hui</p>
                  <ul className="space-y-2">
                    {r.reported.profileAnswers.map((a) => (
                      <AnswerForReview key={a.id} a={a} onRemove={(id) => void removeAnswer(id)} />
                    ))}
                  </ul>
                </div>
              )}
              {status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleAction(r.id, 'DISMISS_REPORT')} className="rounded-md border border-hairline-strong px-3 py-1 text-xs font-medium text-muted hover:bg-fill-subtle">
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
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-md border border-hairline-strong px-3 py-1 text-sm disabled:opacity-50">Précédent</button>
          <span className="px-3 py-1 text-sm text-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-md border border-hairline-strong px-3 py-1 text-sm disabled:opacity-50">Suivant</button>
        </div>
      )}
    </div>
  );
}