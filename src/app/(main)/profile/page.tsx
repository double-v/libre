'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import TagButton from '@/components/TagButton';
import TagSelector from '@/components/TagSelector';
import PrivacyTip from '@/components/PrivacyTip';
import ProfileCompleteness from '@/components/ProfileCompleteness';
import ProfilePhotoHero from '@/components/ProfilePhotoHero';
import ProfileSection from '@/components/ProfileSection';
import PublicProfilePreview from '@/components/PublicProfilePreview';
import ProfileField from '@/components/ProfileField';
import ChipList from '@/components/ChipList';
import Image from 'next/image';
import { INTEREST_CATEGORIES, PRACTICE_CATEGORIES, GENDER_OPTIONS } from '@/lib/taxonomy';

interface ProfileData {
  userId: string;
  bio: string;
  birthDate: string;
  genderIdentity: string;
  orientation: string[];
  relationshipType: string[];
  interests: string[];
  practices: string[];
  socialLinks: Record<string, string>;
  photos: string[];
  maxDistanceKm: number;
  ageMin: number;
  ageMax: number;
  invisibleMode: boolean;
}

const ORIENTATION_OPTIONS = ['hétéro', 'homo', 'bi', 'pan', 'ace', 'autre'];
const RELATIONSHIP_TYPE_OPTIONS = ['libre', 'poly', 'casual', 'sérieux', 'autre'];
const SOCIAL_PLATFORMS = ['Instagram', 'Snapchat', 'TikTok', 'Twitter', 'Telegram', 'Discord'];

const INPUT_CLASS = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500';

const INPUT_CLASS_SM = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500';

function EditActions({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-full bg-coral px-4 py-1.5 text-xs font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      >
        Annuler
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editBio, setEditBio] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGenderIdentity, setEditGenderIdentity] = useState('');
  const [editOrientation, setEditOrientation] = useState<string[]>([]);
  const [editRelationshipType, setEditRelationshipType] = useState<string[]>([]);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editPractices, setEditPractices] = useState<string[]>([]);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [editAgeMin, setEditAgeMin] = useState(18);
  const [editAgeMax, setEditAgeMax] = useState(99);
  const [editMaxDistanceKm, setEditMaxDistanceKm] = useState(50);
  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>({});
  const [editSocialPlatform, setEditSocialPlatform] = useState('Instagram');
  const [editSocialUrl, setEditSocialUrl] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/profile');
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch {
      setError('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const startEdit = (section: string) => {
    setEditingSection(section);
    if (section === 'identity') {
      setEditBirthDate(profile?.birthDate ? profile.birthDate.split('T')[0] : '');
      setEditGenderIdentity(profile?.genderIdentity ?? '');
    }
    if (section === 'bio') setEditBio(profile?.bio ?? '');
    if (section === 'orientation') {
      setEditOrientation(profile?.orientation ?? []);
      setEditRelationshipType(profile?.relationshipType ?? []);
    }
    if (section === 'interests') setEditInterests(profile?.interests ?? []);
    if (section === 'practices') setEditPractices(profile?.practices ?? []);
    if (section === 'photos') setEditPhotos(profile?.photos ?? []);
    if (section === 'search') {
      setEditAgeMin(profile?.ageMin ?? 18);
      setEditAgeMax(profile?.ageMax ?? 99);
      setEditMaxDistanceKm(profile?.maxDistanceKm ?? 50);
    }
    if (section === 'social') setEditSocialLinks(profile?.socialLinks ?? {});
  };

  const saveSection = async (data: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Erreur');
      }
      const result = await res.json();
      setProfile(result.profile);
      setEditingSection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await signOut({ redirect: false });
      router.push('/');
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-600 dark:text-gray-400">Chargement...</p></div>;
  }

  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profil</h1>
        <button
          type="button"
          onClick={() => { signOut({ redirect: false }); router.push('/login'); }}
          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          Déconnexion
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {profile && (
        <PublicProfilePreview
          displayName="Vous"
          age={age ?? undefined}
          bio={profile.bio}
          photos={profile.photos}
          interests={profile.interests}
          isVerified={false}
        />
      )}

      {profile && (
        <ProfileCompleteness
          profile={profile as unknown as Record<string, unknown>}
          onSuggestionClick={startEdit}
        />
      )}

      {!profile ? (
        <div className="space-y-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">Remplissez votre profil pour commencer à rencontrer des personnes.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">C&apos;est optionnel — vous pouvez toujours compléter plus tard.</p>
          {['identity', 'bio', 'orientation', 'interests', 'practices', 'photos', 'search', 'social'].map((s) => (
            <button key={s} onClick={() => startEdit(s)} className="text-sm text-coral underline hover:text-terracotta">
              Commencer par {s === 'identity' ? 'votre identité' : s === 'bio' ? 'votre bio' : s === 'orientation' ? 'votre orientation' : s === 'interests' ? 'vos centres d\'intérêt' : s === 'practices' ? 'vos pratiques' : s === 'photos' ? 'vos photos' : s === 'search' ? 'vos préférences de recherche' : 'vos liens sociaux'}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">

          {/* Identité */}
          <ProfileSection title="Identité" onEdit={() => startEdit('identity')} editing={editingSection === 'identity'} complete={!!profile.birthDate && !!profile.genderIdentity}>
            <PrivacyTip tip="Utilisez un pseudo, pas votre vrai nom. Seul votre âge sera visible, pas votre date de naissance." />
            {editingSection === 'identity' ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Date de naissance</label>
                  <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Genre</label>
                  <select value={editGenderIdentity} onChange={(e) => setEditGenderIdentity(e.target.value)} className={INPUT_CLASS}>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ birthDate: editBirthDate ? new Date(editBirthDate).toISOString() : undefined, genderIdentity: editGenderIdentity || undefined })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <ProfileField label="Âge">{age ? `${age} ans` : ''}</ProfileField>
                <ProfileField label="Genre">{GENDER_OPTIONS.find(g => g.value === profile.genderIdentity)?.label || profile.genderIdentity}</ProfileField>
              </div>
            )}
          </ProfileSection>

          {/* Bio */}
          <ProfileSection title="Bio" surface="blush" onEdit={() => startEdit('bio')} editing={editingSection === 'bio'} complete={profile.bio.length > 0}>
            {editingSection === 'bio' ? (
              <div className="mt-3 space-y-3">
                <textarea rows={3} maxLength={500} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Parlez un peu de vous..." className={INPUT_CLASS} />
                <p className="text-xs text-gray-600 dark:text-gray-400">{editBio.length}/500</p>
                <EditActions saving={saving} onSave={() => saveSection({ bio: editBio })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{profile.bio || <span className="italic text-gray-600 dark:text-gray-400">Non renseigné</span>}</p>
            )}
          </ProfileSection>

          {/* Orientation & Relations */}
          <ProfileSection title="Orientation & Relations" onEdit={() => startEdit('orientation')} editing={editingSection === 'orientation'} complete={profile.orientation.length > 0 || profile.relationshipType.length > 0}>
            {editingSection === 'orientation' ? (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Orientation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORIENTATION_OPTIONS.map((opt) => (
                      <TagButton key={opt} label={opt} selected={editOrientation.includes(opt)} onClick={() => setEditOrientation(editOrientation.includes(opt) ? editOrientation.filter((o) => o !== opt) : [...editOrientation, opt])} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Type de relation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
                      <TagButton key={opt} label={opt} selected={editRelationshipType.includes(opt)} onClick={() => setEditRelationshipType(editRelationshipType.includes(opt) ? editRelationshipType.filter((r) => r !== opt) : [...editRelationshipType, opt])} />
                    ))}
                  </div>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ orientation: editOrientation, relationshipType: editRelationshipType })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">Orientation</p>
                  <ChipList items={profile.orientation} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">Type de relation</p>
                  <ChipList items={profile.relationshipType} />
                </div>
              </div>
            )}
          </ProfileSection>

          {/* Centres d'intérêt */}
          <ProfileSection title="Centres d'intérêt" onEdit={() => startEdit('interests')} editing={editingSection === 'interests'} complete={profile.interests.length > 0}>
            <PrivacyTip tip="Ces centres d&apos;intérêt aident à trouver des personnes qui partagent vos passions." />
            {editingSection === 'interests' ? (
              <div className="mt-3 space-y-3">
                <TagSelector categories={INTEREST_CATEGORIES} selected={editInterests} onChange={setEditInterests} placeholder="Ajouter un centre d&apos;intérêt..." />
                <EditActions saving={saving} onSave={() => saveSection({ interests: editInterests })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2"><ChipList items={profile.interests} /></div>
            )}
          </ProfileSection>

          {/* Pratiques & Préférences */}
          <ProfileSection title="Pratiques & Préférences" surface="sand" onEdit={() => startEdit('practices')} editing={editingSection === 'practices'} complete={profile.practices.length > 0}>
            <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
              Certaines personnes aiment explorer des pratiques sensuelles ou spécifiques. C&apos;est totalement optionnel.
            </p>
            <PrivacyTip tip="Ces préférences sont privées. Elles ne s&apos;affichent que pour vos matches, pas publiquement." />
            {editingSection === 'practices' ? (
              <div className="mt-3 space-y-3">
                <TagSelector categories={PRACTICE_CATEGORIES} selected={editPractices} onChange={setEditPractices} placeholder="Ajouter une pratique..." />
                <EditActions saving={saving} onSave={() => saveSection({ practices: editPractices })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2"><ChipList items={profile.practices} variant="practices" /></div>
            )}
          </ProfileSection>

          {/* Photos */}
          <ProfileSection title="Photos" onEdit={() => startEdit('photos')} editing={editingSection === 'photos'} complete={profile.photos.length > 0}>
            <PrivacyTip tip="Évitez les photos avec des détails identifiables (lieux, plaques, etc.)." />
            {editingSection === 'photos' ? (
              <div className="mt-3 space-y-3">
                {editPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editPhotos.map((url, i) => (
                      <div key={i} className="group relative aspect-square">
                        <Image src={`/api/photos/${encodeURIComponent(url)}`} alt={`Photo ${i + 1}`} fill className="rounded-lg object-cover" unoptimized />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/users/photos', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ photoKey: url }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setEditPhotos(data.photos);
                                if (profile) setProfile({ ...profile, photos: data.photos });
                              }
                            } catch { /* ignore */ }
                          }}
                          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photoError && <p className="text-xs text-red-600 dark:text-red-400">{photoError}</p>}
                {editPhotos.length < 6 && (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:border-coral hover:bg-blush dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-coral-light dark:hover:bg-coral/10">
                    {uploading ? (
                      <span className="text-xs text-gray-600 dark:text-gray-400">Envoi en cours...</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.329 47.329 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-3.246 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                        </svg>
                        <span className="mt-1 text-xs text-gray-600 dark:text-gray-400">JPG, PNG ou WebP — 5 Mo max</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        setPhotoError('');
                        try {
                          const formData = new FormData();
                          formData.append('photo', file);
                          const res = await fetch('/api/users/photos', { method: 'POST', body: formData });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Erreur');
                          setEditPhotos(data.photos);
                          if (profile) setProfile({ ...profile, photos: data.photos });
                        } catch (err) {
                          setPhotoError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
                        } finally {
                          setUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <ProfilePhotoHero
                  photos={profile.photos}
                  onAddClick={() => setEditingSection('photos')}
                />
              </div>
            )}
          </ProfileSection>

          {/* Préférences de recherche */}
          <ProfileSection title="Préférences de recherche" surface="blush" onEdit={() => startEdit('search')} editing={editingSection === 'search'} complete>
            {editingSection === 'search' ? (
              <div className="mt-3 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Âge minimum : {editAgeMin} ans</label>
                  <input type="range" min={18} max={99} value={editAgeMin} onChange={(e) => setEditAgeMin(Number(e.target.value))} className="block w-full accent-coral" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Âge maximum : {editAgeMax} ans</label>
                  <input type="range" min={18} max={99} value={editAgeMax} onChange={(e) => setEditAgeMax(Number(e.target.value))} className="block w-full accent-coral" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Distance maximale : {editMaxDistanceKm} km</label>
                  <input type="range" min={1} max={500} value={editMaxDistanceKm} onChange={(e) => setEditMaxDistanceKm(Number(e.target.value))} className="block w-full accent-coral" />
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ ageMin: editAgeMin, ageMax: editAgeMax, maxDistanceKm: editMaxDistanceKm })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <ProfileField label="Tranche d'âge">{profile.ageMin} – {profile.ageMax} ans</ProfileField>
                <ProfileField label="Distance max">{profile.maxDistanceKm} km</ProfileField>
              </div>
            )}
          </ProfileSection>

          {/* Liens sociaux */}
          <ProfileSection title="Liens sociaux" onEdit={() => startEdit('social')} editing={editingSection === 'social'} complete={Object.keys(profile.socialLinks || {}).length > 0}>
            <PrivacyTip tip="Ne les partagez qu&apos;avec des personnes de confiance." />
            {editingSection === 'social' ? (
              <div className="mt-3 space-y-3">
                {Object.entries(editSocialLinks).map(([platform, url]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">{platform}</span>
                    <input type="url" value={url} onChange={(e) => setEditSocialLinks({ ...editSocialLinks, [platform]: e.target.value })} className={INPUT_CLASS_SM} />
                    <button type="button" onClick={() => { const c = { ...editSocialLinks }; delete c[platform]; setEditSocialLinks(c); }} className="text-xs text-red-500 dark:text-red-400">✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <select value={editSocialPlatform} onChange={(e) => setEditSocialPlatform(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                    {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="url" value={editSocialUrl} onChange={(e) => setEditSocialUrl(e.target.value)} placeholder="https://..." className={INPUT_CLASS_SM} />
                  <button type="button" onClick={() => { if (editSocialUrl.trim()) { setEditSocialLinks({ ...editSocialLinks, [editSocialPlatform]: editSocialUrl.trim() }); setEditSocialUrl(''); } }} disabled={!editSocialUrl.trim()} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">+</button>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ socialLinks: editSocialLinks })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2">
                {Object.keys(profile.socialLinks || {}).length > 0
                  ? <ChipList items={Object.keys(profile.socialLinks)} />
                  : <span className="text-xs italic text-gray-600 dark:text-gray-400">Non renseigné</span>}
              </div>
            )}
          </ProfileSection>

          {/* Conseils vie privée */}
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Conseils vie privée</h2>
            <ul className="mt-3 space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <li className="flex gap-2"><span aria-hidden="true">•</span>N&apos;utilisez jamais votre vrai nom complet comme pseudo.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Ne faites pas confiance aveuglément à quelqu&apos;un en ligne, même sur Libre.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Ne partagez pas d&apos;informations sensibles (adresse, lieu de travail) dans votre bio.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Vos messages sont chiffrés de bout en bout, mais Libre ne peut pas garantir la bonne foi de votre interlocuteur.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Signalez tout comportement suspect. La modération communautaire est là pour ça.</li>
            </ul>
          </section>

          {/* Zone dangereuse */}
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 sm:p-5">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Zone dangereuse</h2>
            <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">La suppression de votre compte est définitive. Toutes vos données seront effacées.</p>
            {!showDeleteConfirm ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30">Supprimer mon compte</button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Etes-vous sûr ? Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDeleteAccount} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Oui, supprimer</button>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Annuler</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}