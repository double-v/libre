'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminVerificationCard, { type Decision, type VerificationRow } from '@/components/AdminVerificationCard';

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      const res = await fetch(`/api/admin/verifications?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVerifications(data.verifications);
    } catch {
      // handled below
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    // Fetch au montage : IIFE async → aucun setState synchrone dans le corps
    // de l'effet (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await fetchVerifications(); })();
  }, [fetchVerifications]);

  const handleDecision = async (verificationId: string, decision: Decision) => {
    setActionError('');
    try {
      const res = await fetch(`/api/admin/verifications/${verificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision),
      });
      if (!res.ok) throw new Error();
      await fetchVerifications();
    } catch {
      setActionError('Erreur lors du traitement');
    }
  };

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    approved: 'Validées',
    rejected: 'Refusées',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-content">Vérifications</h1>

      <div className="mb-4 flex gap-2">
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={status === key}
            onClick={() => setStatus(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === key ? 'bg-coral text-white' : 'bg-fill-subtle text-muted hover:bg-fill-subtle'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{actionError}</div>}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : verifications.length === 0 ? (
        <p className="text-muted">Aucune vérification.</p>
      ) : (
        <div className="space-y-3">
          {verifications.map((v) => (
            <AdminVerificationCard key={v.id} v={v} onDecision={(d) => handleDecision(v.id, d)} />
          ))}
        </div>
      )}
    </div>
  );
}