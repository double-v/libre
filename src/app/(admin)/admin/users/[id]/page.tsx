'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminUserPhotos from '@/components/admin/AdminUserPhotos';
import AdminUserKeyState from '@/components/admin/AdminUserKeyState';
import { AdminIndicesFiabilite, type IndiceFiabilite, type Niveau } from '@/components/admin/AdminFiabilite';

interface UserDetail {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isBanned: boolean;
  isVerified: boolean;
  retraitAt: string | null;
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
  // Classification des photos (#330), servie avec la fiche.
  const [photoSensitivity, setPhotoSensitivity] = useState<Record<string, string>>({});
  const [fiabilite, setFiabilite] = useState<{ niveau: Niveau; invitation: { depuis: string } | null; indices: IndiceFiabilite[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [verifEnCours, setVerifEnCours] = useState(false);

  useEffect(() => {
    params.then((p) => setUserId(p.id));
  }, [params]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // IIFE async → pas de setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/users/${userId}`);
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (!cancelled) {
          setUser(data.user);
          setPhotoSensitivity(data.photoSensitivity ?? {});
          setFiabilite(data.fiabilite ?? null);
        }
      } catch {
        if (!cancelled) setError('Impossible de charger l\'utilisateur');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  // Inviter au selfie sans bloquer : même effet que l'automate de la spec 010.
  const handleInvitation = async () => {
    if (!user || !fiabilite) return;
    setVerifEnCours(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/invitation`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFiabilite({ ...fiabilite, invitation: data.invitation });
    } catch {
      alert('Erreur lors de l\'invitation');
    } finally {
      setVerifEnCours(false);
    }
  };

  // Mettre en retrait (ou lever le retrait) : même décision que la file
  // « Profils à vérifier » (spec 006), journalisée de la même façon.
  const handleRetrait = async (decision: 'verification' | 'rien') => {
    if (!user) return;
    setVerifEnCours(true);
    try {
      const res = await fetch(`/api/admin/profils-a-verifier/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error();
      setUser({ ...user, retraitAt: decision === 'verification' ? new Date().toISOString() : null });
    } catch {
      alert('Erreur lors de l\'action');
    } finally {
      setVerifEnCours(false);
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

  if (loading) return <div className="text-center text-muted">Chargement…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>;
  if (!user) return null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/users" className="text-sm text-coral hover:underline">← Utilisateurs</Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-content">{user.displayName}</h1>

      {fiabilite && <AdminIndicesFiabilite {...fiabilite} />}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-hairline p-4">
            <h2 className="mb-3 font-semibold text-content">Informations</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{user.email}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Rôle</dt><dd>{user.role}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Statut</dt><dd>{user.isBanned ? 'Banni' : user.isVerified ? 'Vérifié' : 'Actif'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Inscrit</dt><dd>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Dernière activité</dt><dd>{new Date(user.lastActive).toLocaleDateString('fr-FR')}</dd></div>
              {user.profile && (
                <>
                  <div className="flex justify-between"><dt className="text-muted">Bio</dt><dd className="max-w-[200px] truncate">{user.profile.bio}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Photos</dt><dd>{user.profile.photos.length}</dd></div>
                </>
              )}
            </dl>
          </div>

          {/* Clé de messagerie (#341) — le support ne répond plus à l'aveugle */}
          <AdminUserKeyState userId={user.id} />
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-hairline p-4">
            <h2 className="mb-3 font-semibold text-content">
              {user.isBanned ? 'Débannir' : 'Bannir'}
            </h2>
            <input
              type="text"
              placeholder="Raison (optionnel)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="mb-3 w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
            />
            <button
              onClick={handleBanToggle}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${user.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {user.isBanned ? 'Débannir' : 'Bannir'}
            </button>
          </div>

          <div className="rounded-xl border border-hairline p-4">
            <h2 className="mb-3 font-semibold text-content">Vérification du profil</h2>
            {user.isVerified ? (
              <p className="text-sm text-muted">Profil déjà vérifié par selfie.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <button
                    onClick={handleInvitation}
                    disabled={verifEnCours || !!fiabilite?.invitation}
                    className="rounded-md border border-hairline-strong px-4 py-2 text-sm font-medium hover:bg-fill-subtle disabled:opacity-50"
                  >
                    {fiabilite?.invitation ? 'Invitation déjà envoyée' : 'Demander une vérification'}
                  </button>
                  <p className="mt-1 text-xs text-muted">Sans blocage : le profil reste visible et peut écrire.</p>
                </div>
                <div>
                  {user.retraitAt ? (
                    <button
                      onClick={() => handleRetrait('rien')}
                      disabled={verifEnCours}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Lever le retrait
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRetrait('verification')}
                      disabled={verifEnCours}
                      className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Demander une vérification et mettre en retrait
                    </button>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    {user.retraitAt
                      ? `En retrait depuis le ${new Date(user.retraitAt).toLocaleDateString('fr-FR')} : invisible pour les autres, ni like ni message, jusqu'au selfie approuvé.`
                      : 'Avec blocage : invisible pour les autres, ni like ni message, jusqu\'au selfie approuvé. Effacé après 90 jours sans selfie.'}
                  </p>
                </div>
              </div>
            )}
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
                  <button onClick={() => setShowDeleteConfirm(false)} className="rounded-md border border-hairline-strong px-4 py-2 text-sm">Annuler</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photos — modération (#323). Extrait en composant : la fiche devenait
          longue, et un composant isolé se valide sur pixels sans session admin. */}
      <AdminUserPhotos
        userId={user.id}
        displayName={user.displayName}
        photos={user.profile?.photos ?? []}
        sensitivity={photoSensitivity}
        onPhotosChange={(photos) =>
          setUser({ ...user, profile: user.profile ? { ...user.profile, photos } : null })
        }
      />

      {/* Reports received */}
      {user.reportsReceived.length > 0 && (
        <div className="mt-6 rounded-xl border border-hairline p-4">
          <h2 className="mb-3 font-semibold text-content">Signalements reçus</h2>
          <div className="space-y-2">
            {user.reportsReceived.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-fill-subtle p-2">
                <div>
                  <p className="text-sm"><span className="font-medium">{r.reason}</span> — par {r.reporter.displayName}</p>
                  {r.description && <p className="text-xs text-muted">{r.description}</p>}
                </div>
                <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}