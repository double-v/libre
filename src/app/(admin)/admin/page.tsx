'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  totalUsers: number;
  bannedUsers: number;
  pendingReports: number;
  pendingVerifications: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      })
      .then(setStats)
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center text-gray-500">Chargement…</div>;
  }

  if (error) {
    return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>;
  }

  if (!stats) return null;

  const cards = [
    { label: 'Utilisateurs', value: stats.totalUsers, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Bannis', value: stats.bannedUsers, color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Signalements en attente', value: stats.pendingReports, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Vérifications en attente', value: stats.pendingVerifications, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de bord</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl border border-gray-200 p-4 dark:border-gray-700 ${card.color}`}>
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="mt-1 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}