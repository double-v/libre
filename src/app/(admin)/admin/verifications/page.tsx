'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';

interface VerificationRow {
  id: string;
  selfieUrl: string;
  status: string;
  createdAt: string;
  user: { id: string; displayName: string; email: string };
}

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

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const handleAction = async (verificationId: string, action: 'APPROVE_VERIFICATION' | 'REJECT_VERIFICATION', reason?: string) => {
    try {
      const res = await fetch(`/api/admin/verifications/${verificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error();
      fetchVerifications();
    } catch {
      setActionError('Erreur lors du traitement');
    }
  };

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvées',
    rejected: 'Refusées',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Vérifications</h1>

      <div className="mb-4 flex gap-2">
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === key ? 'bg-coral text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{actionError}</div>}

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : verifications.length === 0 ? (
        <p className="text-gray-500">Aucune vérification.</p>
      ) : (
        <div className="space-y-3">
          {verifications.map((v) => (
            <Card key={v.id} variant="profile">
              <div className="flex items-start gap-4">
                <img src={v.selfieUrl} alt="Selfie de vérification" className="h-24 w-24 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{v.user.displayName}</p>
                  <p className="text-sm text-gray-500">{v.user.email}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(v.createdAt).toLocaleDateString('fr-FR')}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    v.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : v.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {statusLabels[v.status] ?? v.status}
                  </span>
                </div>
                {status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(v.id, 'APPROVE_VERIFICATION')} className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                      Approuver
                    </button>
                    <button onClick={() => handleAction(v.id, 'REJECT_VERIFICATION')} className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}