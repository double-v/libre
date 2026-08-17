'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { purgerSecretsLocaux } from '@/lib/session-cleanup';
import TagButton from '@/components/TagButton';
import TagSelector from '@/components/TagSelector';
import PrivacyTip from '@/components/PrivacyTip';
import { SENSITIVITY_LABELS, SENSITIVITY_THRESHOLDS, THRESHOLD_LABELS } from '@/lib/photo-sensitivity';
import ProfileCompleteness from '@/components/ProfileCompleteness';
import ProfilePhotoHero from '@/components/ProfilePhotoHero';
import ProfileSection from '@/components/ProfileSection';
import PublicProfilePreview from '@/components/PublicProfilePreview';
import ProfileField from '@/components/ProfileField';
import ChipList from '@/components/ChipList';
import SearchFilters, { type SearchFiltersValue } from '@/components/SearchFilters';
import { toast } from '@/lib/toast';
import Image from 'next/image';
import { INTEREST_CATEGORIES, PRACTICE_CATEGORIES, GENDER_OPTIONS } from '@/lib/taxonomy';

interface ProfileData {
  userId: string;
  displayName: string;
  isVerified: boolean;
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
  searchGenders: string[];
  searchOrientations: string[];
  searchInterests: string[];
  searchDistanceKm: number | null;
  practicesVisibility: string;
  photoSensitivityOptIn: string;
  invisibleMode: boolean;
}

const ORIENTATION_OPTIONS = ['hétéro', 'homo', 'bi', 'pan', 'ace', 'autre'];
const RELATIONSHIP_TYPE_OPTIONS = ['libre', 'poly', 'casual', 'sérieux', 'autre'];
const SOCIAL_PLATFORMS = ['Instagram', 'Snapchat', 'TikTok', 'Twitter', 'Telegram', 'Discord'];

const INPUT_CLASS = 'mt-1 block w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm text-content shadow-sm placeholder:text-muted focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral dark:placeholder:text-muted';

const INPUT_CLASS_SM = 'mt-1 block w-full rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-xs text-content shadow-sm placeholder:text-muted focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral dark:placeholder:text-muted';

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
        className="rounded-full border border-hairline-strong bg-surface px-4 py-1.5 text-xs font-medium text-muted hover:bg-fill-subtle focus:outline-none focus:ring-2 focus:ring-coral"
      >
        Annuler
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // « Maintenant » figé au montage : Date.now() est impur, on ne l'appelle pas
  // au rendu (react-hooks/purity) — il est fixé dans un effet ci-dessous.
  const [now, setNow] = useState(0);

  const [editBio, setEditBio] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGenderIdentity, setEditGenderIdentity] = useState('');
  const [editOrientation, setEditOrientation] = useState<string[]>([]);
  const [editRelationshipType, setEditRelationshipType] = useState<string[]>([]);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editPractices, setEditPractices] = useState<string[]>([]);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  // Classification de ses propres photos (#330) : le propriétaire les voit
  // nettes, mais doit savoir lesquelles arrivent floutées aux autres.
  const [photoSensitivity, setPhotoSensitivity] = useState<Record<string, string>>({});
  const [declareSensitive, setDeclareSensitive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [editSearchFilters, setEditSearchFilters] = useState<SearchFiltersValue>({
    genders: [], orientations: [], ageMin: 18, ageMax: 99, interests: [], distanceKm: null,
  });
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
      setDisplayName(data.displayName ?? '');
      setIsVerified(Boolean(data.isVerified));
      setPhotoSensitivity(data.photoSensitivity ?? {});
    } catch {
      setError('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Fetch au montage : IIFE async → aucun setState synchrone dans le corps
    // de l'effet (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await fetchProfile(); })();
  }, [fetchProfile]);

  useEffect(() => {
    // Date.now() dans une IIFE async → hors du corps synchrone de l'effet
    // (react-hooks/set-state-in-effect) et hors du rendu (react-hooks/purity).
    void (async () => { setNow(Date.now()); })();
  }, []);

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
      setEditSearchFilters({
        genders: profile?.searchGenders ?? [],
        orientations: profile?.searchOrientations ?? [],
        ageMin: profile?.ageMin ?? 18,
        ageMax: profile?.ageMax ?? 99,
        interests: profile?.searchInterests ?? [],
        distanceKm: profile?.searchDistanceKm ?? null,
      });
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
      toast('Profil enregistré.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Visibilité des pratiques (#328) — enregistrée au clic, sans passer par le
   * mode édition : un réglage de confidentialité doit être lisible et
   * modifiable en permanence, pas caché derrière un bouton « Modifier ».
   * Optimiste, avec retour arrière si l'écriture échoue.
   */
  const savePracticesVisibility = async (visibility: string) => {
    if (!profile || profile.practicesVisibility === visibility) return;
    const previous = profile.practicesVisibility;
    setProfile({ ...profile, practicesVisibility: visibility });
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practicesVisibility: visibility }),
      });
      if (!res.ok) throw new Error();
      toast(
        visibility === 'public'
          ? 'Tes pratiques sont visibles par tout le monde.'
          : 'Tes pratiques ne sont visibles que par tes matches.',
      );
    } catch {
      setProfile((p) => (p ? { ...p, practicesVisibility: previous } : p));
      setError('Impossible d\'enregistrer ce réglage, réessaie.');
    }
  };

  /**
   * Seuil de consentement aux photos sensibles (#331). Enregistré au clic, hors
   * mode édition, pour la même raison que la visibilité des pratiques : un
   * réglage de confidentialité doit rester lisible et modifiable en permanence.
   */
  const savePhotoSensitivityOptIn = async (threshold: string) => {
    if (!profile || profile.photoSensitivityOptIn === threshold) return;
    const previous = profile.photoSensitivityOptIn;
    setProfile({ ...profile, photoSensitivityOptIn: threshold });
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoSensitivityOptIn: threshold }),
      });
      if (!res.ok) throw new Error();
      toast('Réglage enregistré.');
    } catch {
      setProfile((p) => (p ? { ...p, photoSensitivityOptIn: previous } : p));
      setError('Impossible d\'enregistrer ce réglage, réessaie.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      purgerSecretsLocaux();
      await signOut({ redirect: false });
      router.push('/');
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted">Chargement...</p></div>;
  }

  const age = profile?.birthDate && now
    ? Math.floor((now - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content">Profil</h1>
        <button
          type="button"
          onClick={() => { purgerSecretsLocaux(); signOut({ redirect: false }); router.push('/login'); }}
          className="rounded-full border border-hairline-strong px-3 py-1 text-xs font-medium text-muted hover:bg-fill-subtle hover:text-content"
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
          displayName={displayName || 'Vous'}
          age={age ?? undefined}
          bio={profile.bio}
          photos={profile.photos}
          interests={profile.interests}
          isVerified={isVerified}
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
          <p className="text-sm text-muted">Remplissez votre profil pour commencer à rencontrer des personnes.</p>
          <p className="text-sm text-muted">C&apos;est optionnel — vous pouvez toujours compléter plus tard.</p>
          {['identity', 'bio', 'orientation', 'interests', 'practices', 'photos', 'search', 'social'].map((s) => (
            <button key={s} onClick={() => startEdit(s)} className="text-sm text-coral underline hover:text-terracotta">
              Commencer par {s === 'identity' ? 'votre identité' : s === 'bio' ? 'votre bio' : s === 'orientation' ? 'votre orientation' : s === 'interests' ? 'vos centres d\'intérêt' : s === 'practices' ? 'vos pratiques' : s === 'photos' ? 'vos photos' : s === 'search' ? 'vos préférences de recherche' : 'vos liens sociaux'}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">

          {/* Identité */}
          <ProfileSection sectionId="identity" title="Identité" onEdit={() => startEdit('identity')} editing={editingSection === 'identity'} complete={!!profile.birthDate && !!profile.genderIdentity}>
            <PrivacyTip tip="Utilisez un pseudo, pas votre vrai nom. Seul votre âge sera visible, pas votre date de naissance." />
            {editingSection === 'identity' ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted">Date de naissance</label>
                  <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted">Genre</label>
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
          <ProfileSection sectionId="bio" title="Bio" surface="blush" onEdit={() => startEdit('bio')} editing={editingSection === 'bio'} complete={profile.bio.length > 0}>
            {editingSection === 'bio' ? (
              <div className="mt-3 space-y-3">
                <textarea rows={3} maxLength={500} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Parlez un peu de vous..." className={INPUT_CLASS} />
                <p className="text-xs text-muted">{editBio.length}/500</p>
                <EditActions saving={saving} onSave={() => saveSection({ bio: editBio })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">{profile.bio || <span className="italic text-muted">Non renseigné</span>}</p>
            )}
          </ProfileSection>

          {/* Orientation & Relations */}
          <ProfileSection sectionId="orientation" title="Orientation & Relations" onEdit={() => startEdit('orientation')} editing={editingSection === 'orientation'} complete={profile.orientation.length > 0 || profile.relationshipType.length > 0}>
            {editingSection === 'orientation' ? (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Orientation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORIENTATION_OPTIONS.map((opt) => (
                      <TagButton key={opt} label={opt} selected={editOrientation.includes(opt)} onClick={() => setEditOrientation(editOrientation.includes(opt) ? editOrientation.filter((o) => o !== opt) : [...editOrientation, opt])} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Type de relation</p>
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
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Orientation</p>
                  <ChipList items={profile.orientation} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Type de relation</p>
                  <ChipList items={profile.relationshipType} />
                </div>
              </div>
            )}
          </ProfileSection>

          {/* Centres d'intérêt */}
          <ProfileSection sectionId="interests" title="Centres d'intérêt" onEdit={() => startEdit('interests')} editing={editingSection === 'interests'} complete={profile.interests.length > 0}>
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
          <ProfileSection sectionId="practices" title="Pratiques & Préférences" surface="sand" onEdit={() => startEdit('practices')} editing={editingSection === 'practices'} complete={profile.practices.length > 0}>
            <p className="mt-1 text-xs text-muted">
              Certaines personnes aiment explorer des pratiques sensuelles ou spécifiques. C&apos;est totalement optionnel.
            </p>
            {/* Réglage de visibilité (#328) : la phrase qui vivait ici
                promettait « réservé aux matches » alors que l'API renvoyait le
                champ à tout compte connecté. Elle décrit désormais un réglage
                réel, et laisse le choix. */}
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                Qui peut les voir
              </p>
              <div className="flex flex-wrap gap-1.5">
                <TagButton
                  label="Mes matches"
                  selected={profile.practicesVisibility !== 'public'}
                  onClick={() => savePracticesVisibility('matches')}
                />
                <TagButton
                  label="Tout le monde"
                  selected={profile.practicesVisibility === 'public'}
                  onClick={() => savePracticesVisibility('public')}
                />
              </div>
            </div>
            <PrivacyTip
              tip={
                profile.practicesVisibility === 'public'
                  ? 'Ces pratiques sont visibles par tous les comptes, y compris dans les découvertes. Tu peux revenir en arrière à tout moment.'
                  : 'Seules les personnes avec qui tu as matché voient ces pratiques. Elles n\'apparaissent ni dans les découvertes, ni sur ta fiche publique.'
              }
            />
            {editingSection === 'practices' ? (
              <div className="mt-3 space-y-3">
                <TagSelector categories={PRACTICE_CATEGORIES} selected={editPractices} onChange={setEditPractices} placeholder="Ajouter une pratique..." />
                <EditActions saving={saving} onSave={() => saveSection({ practices: editPractices })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2"><ChipList items={profile.practices} variant="practices" /></div>
            )}
          </ProfileSection>

          {/* Photos sensibles — réglage du LECTEUR (#331), distinct de la
              classification de ses propres photos. */}
          <ProfileSection sectionId="photo-sensitivity" title="Photos sensibles" surface="blush" complete>
            <p className="mt-1 text-xs text-muted">
              Certaines photos sont classées par la modération ou par leur auteur.
              Tu choisis ce qui s&apos;affiche sans que tu aies à le demander.
            </p>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                J&apos;accepte de voir
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SENSITIVITY_THRESHOLDS.map((threshold) => (
                  <TagButton
                    key={threshold}
                    label={THRESHOLD_LABELS[threshold]}
                    selected={(profile.photoSensitivityOptIn || 'none') === threshold}
                    onClick={() => savePhotoSensitivityOptIn(threshold)}
                  />
                ))}
              </div>
            </div>
            <PrivacyTip
              tip={
                profile.photoSensitivityOptIn === 'explicit'
                  ? 'Toutes les photos s\'affichent directement, sans flou.'
                  : profile.photoSensitivityOptIn === 'suggestive'
                    ? 'Les photos suggestives s\'affichent directement. Les photos explicites restent floutées.'
                    : 'Les photos classées arrivent floutées. Tu peux toujours en révéler une au cas par cas.'
              }
            />
          </ProfileSection>

          {/* Photos */}
          <ProfileSection sectionId="photos" title="Photos" onEdit={() => startEdit('photos')} editing={editingSection === 'photos'} complete={profile.photos.length > 0}>
            <PrivacyTip tip="Évitez les photos avec des détails identifiables (lieux, plaques, etc.)." />
            {editingSection === 'photos' ? (
              <div className="mt-3 space-y-3">
                {editPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editPhotos.map((url, i) => (
                      <div key={i} className="group relative aspect-square">
                        <Image src={`/api/photos/${encodeURIComponent(url)}`} alt={`Photo ${i + 1}`} fill className="rounded-lg object-cover" unoptimized />
                        {photoSensitivity[url] && (
                          /* Ses propres photos restent nettes, mais la
                             classification doit se voir : sinon c'est une
                             sanction invisible (#330). */
                          <span className="absolute bottom-1 left-1 rounded-full bg-ink/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {SENSITIVITY_LABELS[photoSensitivity[url] as keyof typeof SENSITIVITY_LABELS] ?? 'Sensible'}
                          </span>
                        )}
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
                {/* Auto-déclaration (#332) : le chemin sain, la modération a
                    posteriori arrivant toujours après que quelqu'un a vu la
                    photo. Copie descriptive, sans jugement sur ce qu'on publie. */}
                <label className="flex items-start gap-2 text-sm text-content">
                  <input
                    type="checkbox"
                    checked={declareSensitive}
                    onChange={(e) => setDeclareSensitive(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-coral"
                  />
                  <span>
                    Ma prochaine photo est suggestive
                    <span className="block text-xs text-muted">
                      Elle arrivera floutée aux personnes qui n&apos;ont pas demandé à voir ce contenu.
                    </span>
                  </span>
                </label>
                {editPhotos.length < 6 && (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-hairline-strong bg-fill-subtle p-4 transition-colors hover:border-coral hover:bg-blush dark:hover:border-coral-light dark:hover:bg-coral/10">
                    {uploading ? (
                      <span className="text-xs text-muted">Envoi en cours...</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-muted">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.329 47.329 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-3.246 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                        </svg>
                        <span className="mt-1 text-xs text-muted">JPG, PNG ou WebP — 5 Mo max</span>
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
                          // Auto-déclaration (#332) : se classer soi-même évite
                          // que quelqu'un voie la photo avant la modération.
                          if (declareSensitive) formData.append('sensitivity', 'suggestive');
                          const res = await fetch('/api/users/photos', { method: 'POST', body: formData });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Erreur');
                          setEditPhotos(data.photos);
                          if (profile) setProfile({ ...profile, photos: data.photos });
                          if (declareSensitive) {
                            setPhotoSensitivity((m) => ({ ...m, [data.photo]: 'suggestive' }));
                            setDeclareSensitive(false);
                          }
                          toast('Photo ajoutée.');
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
                  className="rounded-full border border-hairline-strong bg-surface px-4 py-1.5 text-xs font-medium text-muted hover:bg-fill-subtle"
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

          {/* Préférences de recherche — même composant que /discover (#235) */}
          <ProfileSection sectionId="search" title="Préférences de recherche" surface="blush" onEdit={() => startEdit('search')} editing={editingSection === 'search'} complete>
            <p className="mt-1 text-xs text-muted">
              Qui souhaitez-vous rencontrer ? Ces préférences filtrent aussi votre page Découvrir.
            </p>
            {editingSection === 'search' ? (
              <div className="mt-3 space-y-4">
                <SearchFilters
                  value={editSearchFilters}
                  onChange={setEditSearchFilters}
                  framed={false}
                />
                <EditActions
                  saving={saving}
                  onSave={() => saveSection({
                    ageMin: editSearchFilters.ageMin,
                    ageMax: editSearchFilters.ageMax,
                    searchDistanceKm: editSearchFilters.distanceKm,
                    searchGenders: editSearchFilters.genders,
                    searchOrientations: editSearchFilters.orientations,
                    searchInterests: editSearchFilters.interests,
                  })}
                  onCancel={() => setEditingSection(null)}
                />
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Genre recherché</p>
                  {profile.searchGenders.length > 0
                    ? <ChipList items={profile.searchGenders.map((g) => GENDER_OPTIONS.find((o) => o.value === g)?.label || g)} />
                    : <span className="text-xs italic text-muted">Tous</span>}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Orientation recherchée</p>
                  {profile.searchOrientations.length > 0
                    ? <ChipList items={profile.searchOrientations} />
                    : <span className="text-xs italic text-muted">Toutes</span>}
                </div>
                <ProfileField label="Tranche d'âge">{profile.ageMin} – {profile.ageMax} ans</ProfileField>
                <ProfileField label="Distance max">
                  {profile.searchDistanceKm !== null ? `${profile.searchDistanceKm} km` : 'Partout'}
                </ProfileField>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Centres d&apos;intérêt recherchés</p>
                  {profile.searchInterests.length > 0
                    ? <ChipList items={profile.searchInterests} />
                    : <span className="text-xs italic text-muted">Peu importe</span>}
                </div>
              </div>
            )}
          </ProfileSection>

          {/* Liens sociaux */}
          <ProfileSection sectionId="social" title="Liens sociaux" onEdit={() => startEdit('social')} editing={editingSection === 'social'} complete={Object.keys(profile.socialLinks || {}).length > 0}>
            <PrivacyTip tip="Ne les partagez qu&apos;avec des personnes de confiance." />
            {editingSection === 'social' ? (
              <div className="mt-3 space-y-3">
                {Object.entries(editSocialLinks).map(([platform, url]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs font-medium text-muted">{platform}</span>
                    <input type="url" value={url} onChange={(e) => setEditSocialLinks({ ...editSocialLinks, [platform]: e.target.value })} className={INPUT_CLASS_SM} />
                    <button type="button" onClick={() => { const c = { ...editSocialLinks }; delete c[platform]; setEditSocialLinks(c); }} className="text-xs text-red-500 dark:text-red-400">✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <select value={editSocialPlatform} onChange={(e) => setEditSocialPlatform(e.target.value)} className="rounded-md border border-hairline-strong px-2 py-1.5 text-xs">
                    {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="url" value={editSocialUrl} onChange={(e) => setEditSocialUrl(e.target.value)} placeholder="https://..." className={INPUT_CLASS_SM} />
                  <button type="button" onClick={() => { if (editSocialUrl.trim()) { setEditSocialLinks({ ...editSocialLinks, [editSocialPlatform]: editSocialUrl.trim() }); setEditSocialUrl(''); } }} disabled={!editSocialUrl.trim()} className="rounded-md border border-hairline-strong px-3 py-1.5 text-xs disabled:opacity-40">+</button>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ socialLinks: editSocialLinks })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2">
                {Object.keys(profile.socialLinks || {}).length > 0
                  ? <ChipList items={Object.keys(profile.socialLinks)} />
                  : <span className="text-xs italic text-muted">Non renseigné</span>}
              </div>
            )}
          </ProfileSection>

          {/* Conseils vie privée */}
          <section className="rounded-xl border border-hairline bg-fill-subtle p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-content">Conseils vie privée</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted">
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
            <p className="mt-2 text-xs text-muted">La suppression de votre compte est définitive. Toutes vos données seront effacées.</p>
            {!showDeleteConfirm ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30">Supprimer mon compte</button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Etes-vous sûr ? Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDeleteAccount} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Oui, supprimer</button>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-md border border-hairline-strong px-3 py-1.5 text-xs font-medium text-muted hover:bg-fill-subtle">Annuler</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}