'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface Profile {
  userId: string;
  invisibleMode: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invisibleToggling, setInvisibleToggling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/profile');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      const data = await res.json();
      setProfile(data.profile);
      setIsVerified(data.isVerified ?? false);
    } catch {
      setError('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleToggleInvisible() {
    if (!profile || invisibleToggling) return;
    setInvisibleToggling(true);
    setError('');

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invisibleMode: !profile.invisibleMode }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to update');
      }

      const result = await res.json();
      setProfile(result.profile);
    } catch {
      setError('Erreur lors de la mise à jour du mode invisible');
    } finally {
      setInvisibleToggling(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete account');
      }
      await signOut({ redirect: false });
      router.push('/');
    } catch {
      setError('Erreur lors de la suppression du compte');
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Paramètres</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Invisible mode */}
        <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Mode invisible</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Vous n&apos;apparaîtrez plus dans les découvertes ni dans les passages proches.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={profile?.invisibleMode ?? false}
              disabled={invisibleToggling || !profile}
              onClick={handleToggleInvisible}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 ${
                profile?.invisibleMode ? 'bg-coral' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  profile?.invisibleMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Verification status */}
        <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Vérification</h2>
          {isVerified ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-block h-5 w-5 rounded-full bg-green-500" aria-hidden="true" />
              <p className="text-sm text-green-700 dark:text-green-400">
                Votre identité est vérifiée
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Obtenez le badge vérifié pour augmenter la confiance des autres utilisateurs.
              </p>
              <button
                type="button"
                onClick={() => router.push('/verify')}
                className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2"
              >
                Obtenir le badge
              </button>
            </div>
          )}
        </section>

        {/* Sign out */}
        <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Session</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Déconnectez-vous de votre compte.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Se déconnecter
          </button>
        </section>

        {/* Delete account */}
        <section className="rounded-lg border border-red-200 p-4 dark:border-red-900/50">
          <h2 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">
            Zone dangereuse
          </h2>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            La suppression de votre compte est définitive. Toutes vos données seront effacées.
          </p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Etes-vous sûr ? Cette action est irréversible.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Suppression...' : 'Oui, supprimer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}