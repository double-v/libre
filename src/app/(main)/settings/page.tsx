'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { toast } from '@/lib/toast';
import AppearanceSettings from '@/components/AppearanceSettings';

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
    // IIFE async → pas de setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => {
      await fetchProfile();
    })();
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
      toast(
        result.profile.invisibleMode
          ? 'Tu es maintenant invisible.'
          : 'Ton profil est à nouveau visible.',
      );
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
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-content">Paramètres</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <AppearanceSettings />

        {/* Invisible mode */}
        <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-content">Mode invisible</h2>
              <p className="mt-1 text-sm text-muted">
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
                profile?.invisibleMode ? 'bg-coral' : 'bg-fill-subtle'
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
        <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-content">Vérification</h2>
          {isVerified ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-block h-5 w-5 rounded-full bg-green-500" aria-hidden="true" />
              <p className="text-sm text-green-700 dark:text-green-400">
                Votre identité est vérifiée
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-muted">
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
        <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-content">Session</h2>
          <p className="mt-1 text-sm text-muted">
            Déconnectez-vous de votre compte.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 rounded-md border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-fill-subtle"
          >
            Se déconnecter
          </button>
        </section>

        {/* Delete account */}
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 sm:p-5">
          <h2 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">
            Zone dangereuse
          </h2>
          <p className="mb-3 text-sm text-muted">
            La suppression de votre compte est définitive. Toutes vos données seront effacées.
          </p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
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
                  className="rounded-md border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-fill-subtle"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RGPD: Data export & legal links */}
        <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-content">Vos droits RGPD</h2>
          <p className="mt-1 text-sm text-muted">
            Conformément au RGPD, vous pouvez exporter ou supprimer vos données.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch('/api/users/me/export');
                  if (!res.ok) throw new Error('Export failed');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'libre_data_export.json';
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  setError("Erreur lors de l'export de vos données");
                }
              }}
              className="rounded-md border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-fill-subtle"
            >
              Exporter mes données (JSON)
            </button>
            <a
              href="/confidentialite"
              className="rounded-md border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-fill-subtle"
            >
              Politique de confidentialité
            </a>
          </div>
        </section>

        {/* Informations légales — regroupées ici (remplace l'ancien footer
            flottant global au-dessus de la tab bar, cf. refonte chrome mobile). */}
        <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-content">Informations légales</h2>
          <p className="mt-1 text-sm text-muted">
            Notre manifeste et les documents qui encadrent Libre.
          </p>
          <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-700">
            {[
              { href: '/manifesto', label: 'Manifeste' },
              { href: '/cgu', label: "Conditions d'utilisation" },
              { href: '/confidentialite', label: 'Politique de confidentialité' },
              { href: '/mentions-legales', label: 'Mentions légales' },
            ].map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="flex min-h-11 items-center justify-between gap-2 py-3 text-sm font-medium text-muted transition-colors hover:text-coral dark:hover:text-coral-light"
                >
                  {link.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}