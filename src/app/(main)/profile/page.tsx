'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/logout';
import { purgerSecretsLocaux } from '@/lib/session-cleanup';
import { photoUrl } from '@/lib/photos';
import TagButton from '@/components/TagButton';
import TagSelector from '@/components/TagSelector';
import PrivacyTip from '@/components/PrivacyTip';
import ConsentSensibleField, { COPY_CONSENT_SENSIBLE } from '@/components/ConsentSensibleField';
import { porteDonneeSensible } from '@/lib/consentement-sensible-champs';
import { SENSITIVITY_LABELS, SENSITIVITY_THRESHOLDS, THRESHOLD_LABELS } from '@/lib/photo-sensitivity';
import ProfileGlance from '@/components/ProfileGlance';
import PhotoDropZone from '@/components/PhotoDropZone';
import { CameraIcon, HeartIcon, LinesIcon, IdCardIcon, SparkIcon, LoupeIcon, EyeIcon, EyeOffIcon, LinkIcon, ShieldIcon, WarnIcon } from '@/components/ui/SectionIcons';
import { uploadPhoto } from '@/lib/photos-client';
import Link from 'next/link';
import ProfileSection from '@/components/ProfileSection';
import PublicProfilePreview from '@/components/PublicProfilePreview';
import ProfileField from '@/components/ProfileField';
import ChipList from '@/components/ChipList';
import SearchFilters, { type SearchFiltersValue } from '@/components/SearchFilters';
import { toast } from '@/lib/toast';
import Image from 'next/image';
import { INTEREST_CATEGORIES, PRACTICE_CATEGORIES, GENDER_OPTIONS, RELATIONSHIP_TYPE_OPTIONS } from '@/lib/taxonomy';
import SiteShell from '@/components/ui/SiteShell';
import ProfilePositionCard from '@/components/ProfilePositionCard';
import ProfileAnswers from '@/components/ProfileAnswers';

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
  searchRelationshipTypes: string[];
  searchInterests: string[];
  searchDistanceKm: number | null;
  practicesVisibility: string;
  photoSensitivityOptIn: string;
  invisibleMode: boolean;
  // Ville saisie à la main (spec 004) — privés, renvoyés à la membre seule.
  positionSource?: 'device' | 'city' | null;
  cityLabel?: string | null;
  /** Même source que la carte de relance de Découvrir : une géoloc d'avant
   *  #402 a `lastGeolocAt` sans `positionSource`. */
  lastGeolocAt?: string | null;
}

const ORIENTATION_OPTIONS = ['hétéro', 'homo', 'bi', 'pan', 'ace', 'autre'];
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
  // Art. 9 (#425) : tant que le compte n'a pas consenti, chaque section qui
  // touche l'orientation, le genre, les pratiques ou les personnes cherchées
  // montre la case, et la première écriture l'emporte avec elle.
  const [sensitiveConsent, setSensitiveConsent] = useState(false);
  const [editConsent, setEditConsent] = useState(false);
  // « Voir comme les autres » (#413) : l'aperçu public à la demande, plus en tête de page.
  const [showPreview, setShowPreview] = useState(false);
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
    genders: [], orientations: [], relationshipTypes: [], ageMin: 18, ageMax: 99, interests: [], distanceKm: null,
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
      setSensitiveConsent(Boolean(data.sensitiveConsent));
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
    if (!showPreview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPreview(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPreview]);

  useEffect(() => {
    // Date.now() dans une IIFE async → hors du corps synchrone de l'effet
    // (react-hooks/set-state-in-effect) et hors du rendu (react-hooks/purity).
    void (async () => { setNow(Date.now()); })();
  }, []);

  const startEdit = (section: string) => {
    setEditingSection(section);
    setEditConsent(false);
    setConsentError('');
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
        relationshipTypes: profile?.searchRelationshipTypes ?? [],
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
        throw new Error(result.error === 'consent_required' ? COPY_CONSENT_SENSIBLE.requis : result.error || 'Erreur');
      }
      const result = await res.json();
      setProfile(result.profile);
      if (data.sensitiveConsent) setSensitiveConsent(true);
      setEditingSection(null);
      toast('Profil enregistré.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Écriture d'une section sensible : sans consentement actif, une valeur non
   * vide exige la case cochée — refus sur place, pas d'aller-retour. Vider un
   * champ ne demande rien.
   */
  const [consentError, setConsentError] = useState('');
  const saveSensible = (data: Record<string, unknown>) => {
    if (sensitiveConsent || !porteDonneeSensible(data)) return saveSection(data);
    if (!editConsent) {
      setConsentError(COPY_CONSENT_SENSIBLE.requis);
      return Promise.resolve();
    }
    return saveSection({ ...data, sensitiveConsent: true });
  };
  const consentField = sensitiveConsent ? null : (
    <ConsentSensibleField
      checked={editConsent}
      onChange={(v) => { setEditConsent(v); setConsentError(''); }}
      error={consentError}
    />
  );

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

  /**
   * Envoi d'une photo — même route et mêmes contraintes que le parcours
   * d'accueil (`uploadPhoto`). Sert à la zone d'ajout en tête de page (#413)
   * comme au mode édition de la section Photos.
   */
  const handleUpload = async (file: File) => {
    setUploading(true);
    setPhotoError('');
    // Auto-déclaration (#332) : se classer soi-même évite que quelqu'un voie
    // la photo avant la modération.
    const result = await uploadPhoto(file, { sensitive: declareSensitive });
    setUploading(false);
    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }
    setEditPhotos(result.photos);
    setProfile((p) => (p ? { ...p, photos: result.photos } : p));
    if (declareSensitive) {
      setPhotoSensitivity((m) => ({ ...m, [result.photo]: 'suggestive' }));
      setDeclareSensitive(false);
    }
    toast('Photo ajoutée.');
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted">Chargement...</p></div>;
  }

  const age = profile?.birthDate && now
    ? Math.floor((now - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const initial = (displayName.trim().charAt(0) || '·').toUpperCase();
  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
  const genderLabel = (v: string) => GENDER_OPTIONS.find((g) => g.value === v)?.label || v;

  // Résumés d'une ligne des sections repliées (#413) : ce qui est réglé se lit
  // sans ouvrir. Les listes vides se disent « tous » / « aucune ».
  const searchSummary = profile
    ? [
        profile.searchGenders.length ? profile.searchGenders.map(genderLabel).join(', ') : 'Tous les genres',
        profile.searchOrientations.length ? profile.searchOrientations.join(', ') : 'toutes orientations',
        profile.searchRelationshipTypes.length ? profile.searchRelationshipTypes.join(', ') : 'tous types',
        `${profile.ageMin}–${profile.ageMax} ans`,
        profile.searchDistanceKm !== null ? `${profile.searchDistanceKm} km` : 'partout',
        profile.searchInterests.length ? `intérêts : ${profile.searchInterests.join(', ')}` : 'intérêts : peu importe',
      ].join(' · ')
    : '';
  const practicesSummary = profile
    ? `${profile.practices.length ? profile.practices.join(', ') : 'Aucune pratique'} · visibles par ${
        profile.practicesVisibility === 'public' ? 'tout le monde' : 'mes matches seulement'
      }`
    : '';
  const sensitivitySummary = profile
    ? `J'accepte de voir : ${THRESHOLD_LABELS[(profile.photoSensitivityOptIn || 'none') as keyof typeof THRESHOLD_LABELS].toLowerCase()}`
    : '';
  const socialSummary = profile && Object.keys(profile.socialLinks || {}).length > 0
    ? Object.keys(profile.socialLinks).join(', ')
    : 'Aucun lien';

  return (
    <SiteShell width="reading" className="py-6 md:pb-section md:pt-11">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-content">Profil</h1>
        <div className="flex items-center gap-1">
          {profile && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-coral hover:bg-blush/50 dark:hover:bg-coral/10"
            >
              <EyeIcon className="h-4 w-4" />
              Voir comme les autres
            </button>
          )}
          <button
            type="button"
            onClick={() => { purgerSecretsLocaux(); void logout().then(() => router.push('/login')); }}
            className="rounded-full border border-hairline-strong px-3 py-1 text-xs font-medium text-muted hover:bg-fill-subtle hover:text-content"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Aperçu public à la demande (#413) : en tête de page il occupait tout
          le premier écran, vide chez un nouvel inscrit. */}
      {profile && showPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ton profil vu par les autres"
          className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div className="mx-auto max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setShowPreview(false)} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-content shadow-soft" autoFocus>
                Fermer
              </button>
            </div>
            <PublicProfilePreview
              displayName={displayName || 'Vous'}
              age={age ?? undefined}
              bio={profile.bio}
              photos={profile.photos}
              interests={profile.interests}
              isVerified={isVerified}
            />
          </div>
        </div>
      )}

      {!profile ? (
        // Compte sans ligne de profil (d'avant la spec 005) : un PUT vide
        // crée la ligne (upsert) — recharger ne changerait rien.
        <div className="space-y-3">
          <p className="text-sm text-muted">Ton profil n&apos;est pas encore créé.</p>
          <button type="button" onClick={() => void saveSection({})} disabled={saving} className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta disabled:opacity-50">
            Créer mon profil
          </button>
        </div>
      ) : (
        <>
          {/* En-tête compact quand il y a une photo : qui je suis, en une ligne. */}
          {profile.photos.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-sunken">
                <Image src={photoUrl(profile.photos[0])} alt="" fill sizes="64px" className="object-cover" unoptimized />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-content">
                  {displayName || 'Vous'}{age ? `, ${age}` : ''}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {[profile.bio ? profile.bio.split('\n')[0] : null, profile.cityLabel].filter(Boolean).join(' · ') || 'Ton profil'}
                </p>
              </div>
            </div>
          )}

          <ProfileGlance profile={{ ...profile, lastGeolocAt: profile.lastGeolocAt ?? null, cityLabel: profile.cityLabel ?? null }} />

          <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">Ce que les autres voient</p>
          <div className="space-y-2.5">

          {/* Photos — d'abord : c'est ce qui permet d'être choisi·e */}
          <ProfileSection
            sectionId="photos"
            title="Photos"
            icon={<CameraIcon className="h-5 w-5" />}
            status={profile.photos.length === 0 ? 'todo' : undefined}
            onEdit={profile.photos.length > 0 ? () => startEdit('photos') : undefined}
            editing={editingSection === 'photos'}
            complete={profile.photos.length > 0}
            defaultOpen
          >
            {editingSection === 'photos' ? (
              <div className="mt-3 space-y-3">
                {editPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editPhotos.map((url, i) => (
                      <div key={i} className="group relative aspect-square">
                        <Image src={photoUrl(url)} alt={`Photo ${i + 1}`} fill className="rounded-lg object-cover" unoptimized />
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 rounded-full bg-ink/60 px-2 py-0.5 text-[11px] font-semibold text-white">Principale</span>
                        )}
                        {photoSensitivity[url] && (
                          /* Ses propres photos restent nettes, mais la
                             classification doit se voir : sinon c'est une
                             sanction invisible (#330). */
                          <span className="absolute right-1 bottom-1 rounded-full bg-ink/60 px-2 py-0.5 text-[11px] font-semibold text-white">
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
                                setProfile((p) => (p ? { ...p, photos: data.photos } : p));
                              }
                            } catch { /* ignore */ }
                          }}
                          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                          aria-label="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photoError && <p role="alert" className="text-xs text-error">{photoError}</p>}
                {/* Auto-déclaration (#332) : le chemin sain, la modération a
                    posteriori arrivant toujours après que quelqu'un a vu la
                    photo. Copie descriptive, sans jugement sur ce qu'on publie. */}
                <label className="flex items-start gap-2 text-sm text-content">
                  <input type="checkbox" checked={declareSensitive} onChange={(e) => setDeclareSensitive(e.target.checked)} className="mt-1 h-4 w-4 accent-coral" />
                  <span>
                    Ma prochaine photo est suggestive
                    <span className="block text-xs text-muted">Elle arrivera floutée aux personnes qui n&apos;ont pas demandé à voir ce contenu.</span>
                  </span>
                </label>
                {editPhotos.length < 6 && (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-hairline-strong bg-fill-subtle p-4 transition-colors hover:border-coral hover:bg-blush dark:hover:border-coral-light dark:hover:bg-coral/10">
                    {uploading ? (
                      <span className="text-xs text-muted">Envoi en cours...</span>
                    ) : (
                      <>
                        <CameraIcon className="h-8 w-8 text-muted" />
                        <span className="mt-1 text-xs text-muted">JPG, PNG ou WebP — 5 Mo max</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ''; }}
                    />
                  </label>
                )}
                <button type="button" onClick={() => setEditingSection(null)} className="rounded-full border border-hairline-strong bg-surface px-4 py-1.5 text-xs font-medium text-muted hover:bg-fill-subtle">
                  Fermer
                </button>
              </div>
            ) : profile.photos.length === 0 ? (
              <div className="mt-3 space-y-3">
                <PhotoDropZone initial={initial} busy={uploading} error={photoError} onFile={(f) => void handleUpload(f)} />
                <label className="flex items-start gap-2 text-sm text-content">
                  <input type="checkbox" checked={declareSensitive} onChange={(e) => setDeclareSensitive(e.target.checked)} className="mt-1 h-4 w-4 accent-coral" />
                  <span>
                    Ma prochaine photo est suggestive
                    <span className="block text-xs text-muted">Elle arrivera floutée à qui n&apos;a pas demandé à la voir.</span>
                  </span>
                </label>
                <PrivacyTip tip="Évite les détails identifiables : lieux, plaques, nom sur un vêtement." />
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {/* Grille de vignettes (proto #413) : la première est la
                    principale, une case « + Ajouter » tant qu'il reste de la
                    place. Le grand hero vivait ici et faisait 900 px en desktop. */}
                <div className="grid grid-cols-3 gap-2" aria-label="Mes photos">
                  {profile.photos.map((key, i) => (
                    <div key={key} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-fill-subtle">
                      <Image src={photoUrl(key)} alt={i === 0 ? 'Photo principale' : `Photo ${i + 1}`} fill sizes="240px" className="object-cover" unoptimized />
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/60 px-2 py-0.5 text-[10px] font-semibold text-white">Principale</span>
                      )}
                    </div>
                  ))}
                  {profile.photos.length < 6 && (
                    <button
                      type="button"
                      onClick={() => startEdit('photos')}
                      className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed border-coral-light bg-sunken text-xs font-medium text-coral hover:border-coral"
                    >
                      + Ajouter
                    </button>
                  )}
                </div>
                <PrivacyTip tip="La première est ta photo principale. Évite les détails identifiables (lieux, plaques, etc.)." />
              </div>
            )}
          </ProfileSection>

          {/* Ce que je cherche — type de relation d'abord (même vocabulaire que
              le parcours et le filtre) ; complet seulement s'il est renseigné. */}
          <ProfileSection
            sectionId="seeking"
            title="Ce que je cherche"
            icon={<HeartIcon className="h-5 w-5" />}
            status={profile.relationshipType.length === 0 ? 'todo' : undefined}
            onEdit={() => startEdit('orientation')}
            editing={editingSection === 'orientation'}
            complete={profile.relationshipType.length > 0}
            defaultOpen
          >
            {editingSection === 'orientation' ? (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Type de relation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
                      <TagButton key={opt} label={cap(opt)} selected={editRelationshipType.includes(opt)} onClick={() => setEditRelationshipType(editRelationshipType.includes(opt) ? editRelationshipType.filter((r) => r !== opt) : [...editRelationshipType, opt])} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Plusieurs possibles.</p>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Orientation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORIENTATION_OPTIONS.map((opt) => (
                      <TagButton key={opt} label={cap(opt)} selected={editOrientation.includes(opt)} onClick={() => setEditOrientation(editOrientation.includes(opt) ? editOrientation.filter((o) => o !== opt) : [...editOrientation, opt])} />
                    ))}
                  </div>
                </div>
                {consentField}
                <EditActions saving={saving} onSave={() => void saveSensible({ orientation: editOrientation, relationshipType: editRelationshipType })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Type de relation</p>
                  {profile.relationshipType.length > 0
                    ? <ChipList items={profile.relationshipType} />
                    : (
                      <button type="button" onClick={() => startEdit('orientation')} className="mt-1 text-sm text-coral hover:text-terracotta">
                        Choisir — libre, poly, casual, sérieux, autre
                      </button>
                    )}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Orientation</p>
                  {profile.orientation.length > 0 ? <ChipList items={profile.orientation} /> : <span className="text-xs italic text-muted">Non renseignée</span>}
                </div>
              </div>
            )}
          </ProfileSection>

          {/* Bio */}
          <ProfileSection sectionId="bio" title="Bio" icon={<LinesIcon className="h-5 w-5" />} surface="blush" onEdit={() => startEdit('bio')} editing={editingSection === 'bio'} complete={profile.bio.length > 0} defaultOpen>
            {editingSection === 'bio' ? (
              <div className="mt-3 space-y-3">
                <textarea rows={3} maxLength={500} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Parle un peu de toi…" className={INPUT_CLASS} />
                <p className="text-xs text-muted">{editBio.length}/500</p>
                <EditActions saving={saving} onSave={() => saveSection({ bio: editBio })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">{profile.bio || <span className="italic">Quelques mots sur toi — ce que tu aimes, ce que tu cherches ici.</span>}</p>
            )}
          </ProfileSection>

          {/* Questions en miroir (spec 009) : répondre donne de quoi t'écrire et
              ouvre la lecture des réponses des autres aux mêmes questions. */}
          <ProfileSection sectionId="questions" title="Mes questions" icon={<SparkIcon className="h-5 w-5" />} status="optional" defaultOpen>
            <div className="mt-3">
              <ProfileAnswers />
            </div>
          </ProfileSection>

          {/* Identité */}
          <ProfileSection sectionId="identity" title="Identité" icon={<IdCardIcon className="h-5 w-5" />} onEdit={() => startEdit('identity')} editing={editingSection === 'identity'} complete={!!profile.birthDate && !!profile.genderIdentity} defaultOpen>
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
                {editGenderIdentity ? consentField : null}
                <EditActions saving={saving} onSave={() => void saveSensible({ birthDate: editBirthDate ? new Date(editBirthDate).toISOString() : undefined, genderIdentity: editGenderIdentity || undefined })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-content">
                  <strong>{age ? `${age} ans` : 'Âge non renseigné'}</strong>
                  {profile.genderIdentity ? ` · ${genderLabel(profile.genderIdentity)}` : ''}
                </p>
                <PrivacyTip tip="Seul ton âge est visible, jamais ta date de naissance. Un pseudo, pas ton vrai nom." />
              </div>
            )}
          </ProfileSection>

          {/* Centres d'intérêt */}
          <ProfileSection sectionId="interests" title="Centres d'intérêt" icon={<SparkIcon className="h-5 w-5" />} onEdit={() => startEdit('interests')} editing={editingSection === 'interests'} complete={profile.interests.length > 0} defaultOpen>
            {editingSection === 'interests' ? (
              <div className="mt-3 space-y-3">
                <TagSelector categories={INTEREST_CATEGORIES} selected={editInterests} onChange={setEditInterests} placeholder="Ajouter un centre d&apos;intérêt..." />
                <EditActions saving={saving} onSave={() => saveSection({ interests: editInterests })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ChipList items={profile.interests} />
                <button type="button" onClick={() => startEdit('interests')} className="rounded-full border border-dashed border-coral-light px-3 py-1 text-xs font-medium text-coral hover:bg-blush/50">
                  + ajouter
                </button>
              </div>
            )}
          </ProfileSection>
          </div>

          <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-muted">Où et qui je cherche</p>
          <div className="space-y-2.5">

          {/* Ta position — ville saisie à la main en repli de la géoloc (spec 004) */}
          <ProfilePositionCard
            positionSource={profile.positionSource ?? null}
            cityLabel={profile.cityLabel ?? null}
            invisibleMode={profile.invisibleMode}
            onChanged={fetchProfile}
          />

          {/* Préférences de recherche — même composant que /discover (#235) */}
          <ProfileSection
            sectionId="search"
            title="Préférences de recherche"
            icon={<LoupeIcon className="h-5 w-5" />}
            surface="blush"
            status="set"
            summary={searchSummary}
            defaultOpen={false}
            onEdit={() => startEdit('search')}
            editing={editingSection === 'search'}
          >
            <p className="mt-1 text-xs text-muted">Qui souhaites-tu rencontrer ? Ces préférences filtrent aussi ta page Découvrir.</p>
            {editingSection === 'search' ? (
              <div className="mt-3 space-y-4">
                {/* Filtre d'intention ignoré tant que la sienne n'est pas dite (spec 008). */}
                <SearchFilters
                  value={editSearchFilters}
                  onChange={setEditSearchFilters}
                  framed={false}
                  intentionDeclared={profile.relationshipType.length > 0}
                />
                {consentField}
                <EditActions
                  saving={saving}
                  onSave={() => void saveSensible({
                    ageMin: editSearchFilters.ageMin,
                    ageMax: editSearchFilters.ageMax,
                    searchDistanceKm: editSearchFilters.distanceKm,
                    searchGenders: editSearchFilters.genders,
                    searchOrientations: editSearchFilters.orientations,
                    searchRelationshipTypes: editSearchFilters.relationshipTypes,
                    searchInterests: editSearchFilters.interests,
                  })}
                  onCancel={() => setEditingSection(null)}
                />
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Genre recherché</p>
                  {profile.searchGenders.length > 0 ? <ChipList items={profile.searchGenders.map(genderLabel)} /> : <span className="text-xs italic text-muted">Tous</span>}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Orientation recherchée</p>
                  {profile.searchOrientations.length > 0 ? <ChipList items={profile.searchOrientations} /> : <span className="text-xs italic text-muted">Toutes</span>}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Type de relation recherché</p>
                  {profile.searchRelationshipTypes.length > 0 ? <ChipList items={profile.searchRelationshipTypes} /> : <span className="text-xs italic text-muted">Tous</span>}
                </div>
                <ProfileField label="Tranche d'âge">{profile.ageMin} – {profile.ageMax} ans</ProfileField>
                <ProfileField label="Distance max">{profile.searchDistanceKm !== null ? `${profile.searchDistanceKm} km` : 'Partout'}</ProfileField>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Centres d&apos;intérêt recherchés</p>
                  {profile.searchInterests.length > 0 ? <ChipList items={profile.searchInterests} /> : <span className="text-xs italic text-muted">Peu importe</span>}
                </div>
              </div>
            )}
          </ProfileSection>
          </div>

          <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-muted">Intimité et confidentialité</p>
          <div className="space-y-2.5">

          {/* Pratiques & Préférences — la visibilité reste modifiable au clic,
              hors mode édition (#328). */}
          <ProfileSection
            sectionId="practices"
            title="Pratiques & préférences"
            icon={<EyeIcon className="h-5 w-5" />}
            surface="sand"
            status="optional"
            summary={practicesSummary}
            defaultOpen={false}
            onEdit={() => startEdit('practices')}
            editing={editingSection === 'practices'}
          >
            <p className="mt-1 text-xs text-muted">Certaines personnes aiment explorer des pratiques sensuelles ou spécifiques. C&apos;est totalement optionnel.</p>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Qui peut les voir</p>
              <div className="flex flex-wrap gap-1.5">
                <TagButton label="Mes matches" selected={profile.practicesVisibility !== 'public'} onClick={() => savePracticesVisibility('matches')} />
                <TagButton label="Tout le monde" selected={profile.practicesVisibility === 'public'} onClick={() => savePracticesVisibility('public')} />
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
                {consentField}
                <EditActions saving={saving} onSave={() => void saveSensible({ practices: editPractices })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Mes pratiques</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ChipList items={profile.practices} variant="practices" />
                  <button type="button" onClick={() => startEdit('practices')} className="rounded-full border border-dashed border-coral-light px-3 py-1 text-xs font-medium text-coral hover:bg-blush/50">+ ajouter</button>
                </div>
              </div>
            )}
          </ProfileSection>

          {/* Photos sensibles — réglage du LECTEUR (#331), distinct de la
              classification de ses propres photos. */}
          <ProfileSection
            sectionId="photo-sensitivity"
            title="Photos sensibles"
            icon={<EyeOffIcon className="h-5 w-5" />}
            surface="blush"
            status="set"
            summary={sensitivitySummary}
            defaultOpen={false}
          >
            <p className="mt-1 text-xs text-muted">Certaines photos sont classées par la modération ou par leur auteur. Tu choisis ce qui s&apos;affiche sans que tu aies à le demander.</p>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">J&apos;accepte de voir</p>
              <div className="flex flex-wrap gap-1.5">
                {SENSITIVITY_THRESHOLDS.map((threshold) => (
                  <TagButton key={threshold} label={THRESHOLD_LABELS[threshold]} selected={(profile.photoSensitivityOptIn || 'none') === threshold} onClick={() => savePhotoSensitivityOptIn(threshold)} />
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

          {/* Liens sociaux */}
          <ProfileSection
            sectionId="social"
            title="Liens sociaux"
            icon={<LinkIcon className="h-5 w-5" />}
            status="optional"
            summary={socialSummary}
            defaultOpen={false}
            onEdit={() => startEdit('social')}
            editing={editingSection === 'social'}
          >
            <PrivacyTip tip="Ne les partage qu'avec des personnes de confiance." />
            {editingSection === 'social' ? (
              <div className="mt-3 space-y-3">
                {Object.entries(editSocialLinks).map(([platform, url]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs font-medium text-muted">{platform}</span>
                    <input type="url" value={url} onChange={(e) => setEditSocialLinks({ ...editSocialLinks, [platform]: e.target.value })} className={INPUT_CLASS_SM} />
                    <button type="button" onClick={() => { const c = { ...editSocialLinks }; delete c[platform]; setEditSocialLinks(c); }} className="text-xs text-red-500 dark:text-red-400" aria-label={`Retirer ${platform}`}>✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <select value={editSocialPlatform} onChange={(e) => setEditSocialPlatform(e.target.value)} className="rounded-md border border-hairline-strong px-2 py-1.5 text-xs" aria-label="Plateforme">
                    {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="url" value={editSocialUrl} onChange={(e) => setEditSocialUrl(e.target.value)} placeholder="https://..." className={INPUT_CLASS_SM} aria-label="Adresse du profil" />
                  <button type="button" onClick={() => { if (editSocialUrl.trim()) { setEditSocialLinks({ ...editSocialLinks, [editSocialPlatform]: editSocialUrl.trim() }); setEditSocialUrl(''); } }} disabled={!editSocialUrl.trim()} className="rounded-md border border-hairline-strong px-3 py-1.5 text-xs disabled:opacity-40" aria-label="Ajouter ce lien">+</button>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ socialLinks: editSocialLinks })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2">
                {Object.keys(profile.socialLinks || {}).length > 0
                  ? <ChipList items={Object.keys(profile.socialLinks)} />
                  : <span className="text-xs italic text-muted">Instagram, Snapchat, TikTok, Twitter, Telegram, Discord.</span>}
              </div>
            )}
          </ProfileSection>

          {/* Conseils vie privée */}
          <ProfileSection sectionId="privacy-tips" title="Conseils vie privée" icon={<ShieldIcon className="h-5 w-5" />} summary="Pseudo, prudence, signalement" defaultOpen={false}>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li className="flex gap-2"><span aria-hidden="true">•</span>N&apos;utilise jamais ton vrai nom complet comme pseudo.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Ne fais pas confiance aveuglément à quelqu&apos;un en ligne, même sur Libre.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Ne partage pas d&apos;informations sensibles (adresse, lieu de travail) dans ta bio.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Tes messages sont chiffrés, mais Libre ne peut pas garantir la bonne foi de la personne en face.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Signale tout comportement suspect. La modération communautaire est là pour ça.</li>
            </ul>
          </ProfileSection>

          {/* Supprimer mon compte — le parcours complet (confirmation par mot
              de passe) vit dans Paramètres ; ici on y mène, on ne le duplique
              plus (la copie d'ici appelait DELETE sans mot de passe → 400). */}
          <ProfileSection sectionId="danger" title="Supprimer mon compte" icon={<WarnIcon className="h-5 w-5" />} surface="danger" summary="Définitif : profil, photos, conversations" defaultOpen={false}>
            <p className="mt-2 text-xs text-muted">La suppression est définitive : profil, photos et conversations sont effacés. Elle se confirme avec ton mot de passe, dans Paramètres.</p>
            <Link href="/settings#zone-dangereuse" className="mt-3 inline-flex min-h-[44px] items-center rounded-md border border-error/40 px-3 text-sm font-medium text-error hover:bg-red-50 dark:hover:bg-red-950/30">
              Supprimer mon compte…
            </Link>
          </ProfileSection>
          </div>
        </>
      )}
    </SiteShell>
  );
}
