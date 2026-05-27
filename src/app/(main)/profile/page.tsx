'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEncryptedChat } from '@/hooks/useEncryptedChat';

interface Profile {
  userId: string;
  bio: string;
  birthDate: string;
  genderIdentity: string;
  orientation: string[];
  relationshipType: string[];
  interests: string[];
  maxDistanceKm: number;
}

const ORIENTATION_OPTIONS = ['hétéro', 'homo', 'bi', 'pan', 'ace', 'autre'];
const RELATIONSHIP_TYPE_OPTIONS = ['libre', 'poly', 'casual', 'sérieux', 'autre'];

function TagButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
        selected
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function ProfileForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Profile;
  onSubmit: (data: Profile) => void;
  submitting: boolean;
}) {
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [birthDate, setBirthDate] = useState(
    initial?.birthDate ? initial.birthDate.split('T')[0] : '',
  );
  const [genderIdentity, setGenderIdentity] = useState(initial?.genderIdentity ?? '');
  const [orientation, setOrientation] = useState<string[]>(initial?.orientation ?? []);
  const [relationshipType, setRelationshipType] = useState<string[]>(
    initial?.relationshipType ?? [],
  );
  const [interestsInput, setInterestsInput] = useState(initial?.interests?.join(', ') ?? '');
  const [maxDistanceKm, setMaxDistanceKm] = useState(initial?.maxDistanceKm ?? 50);

  function toggleTag(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const interests = interestsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onSubmit({
      userId: '',
      bio,
      birthDate: new Date(birthDate).toISOString(),
      genderIdentity,
      orientation,
      relationshipType,
      interests,
      maxDistanceKm,
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Formulaire du profil" className="space-y-5">
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Parlez un peu de vous..."
        />
        <p className="mt-1 text-xs text-gray-500">{bio.length}/500</p>
      </div>

      <div>
        <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Date de naissance
        </label>
        <input
          id="birthDate"
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      <div>
        <label htmlFor="genderIdentity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Identité de genre
        </label>
        <input
          id="genderIdentity"
          type="text"
          required
          maxLength={50}
          value={genderIdentity}
          onChange={(e) => setGenderIdentity(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Femme, Homme, Non-binaire, Autre..."
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Orientation
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {ORIENTATION_OPTIONS.map((opt) => (
            <TagButton
              key={opt}
              label={opt}
              selected={orientation.includes(opt)}
              onClick={() => setOrientation(toggleTag(orientation, opt))}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Type de relation
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
            <TagButton
              key={opt}
              label={opt}
              selected={relationshipType.includes(opt)}
              onClick={() => setRelationshipType(toggleTag(relationshipType, opt))}
            />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="interests" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Centres d&apos;intérêt
        </label>
        <input
          id="interests"
          type="text"
          value={interestsInput}
          onChange={(e) => setInterestsInput(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          placeholder="musique, randonnée, cuisine..."
        />
        <p className="mt-1 text-xs text-gray-500">Séparés par des virgules</p>
      </div>

      <div>
        <label htmlFor="maxDistanceKm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Distance maximale : {maxDistanceKm} km
        </label>
        <input
          id="maxDistanceKm"
          type="range"
          min={1}
          max={500}
          value={maxDistanceKm}
          onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
          className="mt-1 block w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1 km</span>
          <span>500 km</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {submitting ? 'Enregistrement...' : 'Enregistrer le profil'}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { hasKeys, generateKeys } = useEncryptedChat();
  const [keyPassword, setKeyPassword] = useState('');
  const [keyMessage, setKeyMessage] = useState('');

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
    } catch {
      setError('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleProfileSubmit(data: Profile) {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ageMin: 18,
          ageMax: 99,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to save profile');
      }

      const result = await res.json();
      setProfile(result.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete account');
      }
      await signOut({ redirect: false });
      router.push('/');
    } catch {
      setError('Erreur lors de la suppression du compte');
    }
  }

  async function handleGenerateKeys() {
    if (!keyPassword) {
      setKeyMessage('Veuillez entrer un mot de passe pour protéger votre clé privée');
      return;
    }
    try {
      setKeyMessage('');
      await generateKeys(keyPassword);
      setKeyPassword('');
      setKeyMessage('Clés E2E générées avec succès !');
    } catch {
      setKeyMessage('Erreur lors de la génération des clés');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Profil</h1>

      {error && (
        <div role="alert" aria-live="polite" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!profile ? (
        <ProfileForm onSubmit={handleProfileSubmit} submitting={submitting} />
      ) : (
        <div className="space-y-6">
          {/* Profile info */}
          <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-3 text-lg font-semibold">Informations</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Bio</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {profile.bio || <span className="italic text-gray-400">Non renseigné</span>}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Date de naissance</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {new Date(profile.birthDate).toLocaleDateString('fr-FR')}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Identité de genre</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {profile.genderIdentity}
                </dd>
              </div>
              {profile.orientation.length > 0 && (
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Orientation</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-1">
                    {profile.orientation.map((o) => (
                      <span
                        key={o}
                        className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      >
                        {o}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {profile.relationshipType.length > 0 && (
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Type de relation</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-1">
                    {profile.relationshipType.map((r) => (
                      <span
                        key={r}
                        className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      >
                        {r}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {profile.interests.length > 0 && (
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">Centres d&apos;intérêt</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-1">
                    {profile.interests.map((i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {i}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Distance maximale</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {profile.maxDistanceKm} km
                </dd>
              </div>
            </dl>
          </section>

          {/* E2E Key Generation */}
          <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="mb-3 text-lg font-semibold">Chiffrement E2E</h2>
            {hasKeys ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                Vos clés de chiffrement de bout en bout sont configurées.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Générez une paire de clés pour activer le chiffrement de bout en bout de vos messages.
                  Votre clé privée sera chiffrée avec un mot de passe et stockée localement.
                </p>
                <div>
                  <label htmlFor="keyPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mot de passe de protection
                  </label>
                  <input
                    id="keyPassword"
                    type="password"
                    value={keyPassword}
                    onChange={(e) => setKeyPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="Mot de passe pour protéger la clé privée"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGenerateKeys}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Générer les clés
                </button>
                {keyMessage && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{keyMessage}</p>
                )}
              </div>
            )}
          </section>

          {/* Delete Account */}
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
              <div role="alert" className="space-y-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Etes-vous sûr ? Cette action est irréversible.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Oui, supprimer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}