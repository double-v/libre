'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface UserDetail {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isBanned: boolean;
  isVerified: boolean;
  createdAt: string;
  lastActive: string;
  profile?: {
    bio: string;
    photos: string[];
    genderIdentity: string;
    orientation: string[];
    interests: string[];
  } | null;
  reportsReceived: { id: string; reason: string; description: string; createdAt: string; reporter: { displayName: string } }[];
  verificationRequests: { id: string; selfieUrl: string; status: string; createdAt: string }[];
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [userId, setUserId] = useState<string>('');
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    params.then((p) => setUserId(p.id));
  }, [params]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/admin/users/${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => setError('Impossible de charger l\'utilisateur'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleBanToggle = async () => {
    if (!user) return;
    const banned = !user.isBanned;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned, reason: banReason || undefined }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser({ ...user, isBanned: data.user.isBanned });
      setBanReason('');
    } catch {
      alert('Erreur lors de l\'action');
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      window.location.href = '/admin/users';
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="text-center text-gray-500">Chargement…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>;
  if (!user) return null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/users" className="text-sm text-coral hover:underline">← Utilisateurs</Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">{user.displayName}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User info */}
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Informations</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{user.email}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Rôle</dt><dd>{user.role}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Statut</dt><dd>{user.isBanned ? 'Banni' : user.isVerified ? 'Vérifié' : 'Actif'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Inscrit</dt><dd>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Dernière activité</dt><dd>{new Date(user.lastActive).toLocaleDateString('fr-FR')}</dd></div>
            {user.profile && (
              <>
                <div className="flex justify-between"><dt className="text-gray-500">Bio</dt><dd className="max-w-[200px] truncate">{user.profile.bio}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Photos</dt><dd>{user.profile.photos.length}</dd></div>
              </>
            )}
          </dl>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
              {user.isBanned ? 'Débannir' : 'Bannir'}
            </h2>
            <input
              type="text"
              placeholder="Raison (optionnel)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="mb-3 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={handleBanToggle}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${user.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {user.isBanned ? 'Débannir' : 'Bannir'}
            </button>
          </div>

          <div className="rounded-xl border border-red-200 p-4 dark:border-red-900/50">
            <h2 className="mb-3 font-semibold text-red-700 dark:text-red-400">Zone danger</h2>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                Supprimer l&apos;utilisateur
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-600">Êtes-vous sûr·e ? Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <button onClick={handleDelete} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Confirmer</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">Annuler</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reports received */}
      {user.reportsReceived.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Signalements reçus</h2>
          <div className="space-y-2">
            {user.reportsReceived.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                <div>
                  <p className="text-sm"><span className="font-medium">{r.reason}</span> — par {r.reporter.displayName}</p>
                  {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                </div>
                <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}