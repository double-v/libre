'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import TagButton from '@/components/TagButton';
import TagSelector from '@/components/TagSelector';
import PrivacyTip from '@/components/PrivacyTip';
import ProfileCompleteness from '@/components/ProfileCompleteness';
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

function SectionHeader({ title, onEdit, editing }: { title: string; onEdit?: () => void; editing?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold">{title}</h2>
      {onEdit && !editing && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-gray-600 hover:text-black"
          aria-label={`Modifier ${title}`}
        >
          Modifier
        </button>
      )}
    </div>
  );
}

function EditActions({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-full bg-terracotta px-4 py-1.5 text-xs font-medium text-white hover:bg-coral-dark disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Annuler
      </button>
    </div>
  );
}

function ChipList({ items, dark }: { items: string[]; dark?: boolean }) {
  if (items.length === 0) return <span className="text-xs italic text-gray-600 dark:text-gray-400">Non renseigné</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            dark
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {item}
        </span>
      ))}
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

  // Edit state per section
  const [editBio, setEditBio] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGenderIdentity, setEditGenderIdentity] = useState('');
  const [editOrientation, setEditOrientation] = useState<string[]>([]);
  const [editRelationshipType, setEditRelationshipType] = useState<string[]>([]);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editPractices, setEditPractices] = useState<string[]>([]);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPhotoInput, setEditPhotoInput] = useState('');
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
    // Populate edit state from current profile (or defaults for first-time)
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
        <h1 className="text-2xl font-bold">Profil</h1>
        <button
          type="button"
          onClick={() => { signOut({ redirect: false }); router.push('/login'); }}
          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          Déconnexion
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {profile && (
        <ProfileCompleteness
          profile={profile as unknown as Record<string, unknown>}
          onSuggestionClick={startEdit}
        />
      )}

      {!profile ? (
        /* First-time profile creation */
        <div className="space-y-6">
          <p className="text-sm text-gray-600">Remplissez votre profil pour commencer à rencontrer des personnes.</p>
          <p className="text-sm text-gray-600">C&apos;est optionnel — vous pouvez toujours compléter plus tard.</p>
          {['identity', 'bio', 'orientation', 'interests', 'practices', 'photos', 'search', 'social'].map((s) => (
            <button key={s} onClick={() => startEdit(s)} className="text-sm text-coral underline">
              Commencer par {s === 'identity' ? 'votre identité' : s === 'bio' ? 'votre bio' : s === 'orientation' ? 'votre orientation' : s === 'interests' ? 'vos centres d\'intérêt' : s === 'practices' ? 'vos pratiques' : s === 'photos' ? 'vos photos' : s === 'search' ? 'vos préférences de recherche' : 'vos liens sociaux'}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ─── Identité ─────────────────────────────────────────────── */}
          <section className="rounded-lg border border-gray-200 p-4">
            <SectionHeader title="Identité" onEdit={() => startEdit('identity')} editing={editingSection === 'identity'} />
            <PrivacyTip tip="Utilisez un pseudo, pas votre vrai nom. Seul votre âge sera visible, pas votre date de naissance." />
            {editingSection === 'identity' ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Date de naissance</label>
                  <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Genre</label>
                  <select value={editGenderIdentity} onChange={(e) => setEditGenderIdentity(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none">
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ birthDate: editBirthDate ? new Date(editBirthDate).toISOString() : undefined, genderIdentity: editGenderIdentity || undefined })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <dl className="mt-2 space-y-1 text-sm">
                <div><dt className="text-xs text-gray-600 dark:text-gray-400">Âge</dt><dd>{age ?? <span className="italic text-gray-600 dark:text-gray-400">Non renseigné</span>} ans</dd></div>
                <div><dt className="text-xs text-gray-600 dark:text-gray-400">Genre</dt><dd>{GENDER_OPTIONS.find(g => g.value === profile.genderIdentity)?.label || profile.genderIdentity || <span className="italic text-gray-600 dark:text-gray-400">Non renseigné</span>}</dd></div>
              </dl>
            )}
          </section>

          {/* ─── Bio ──────────────────────────────────────────────────── */}
          <section className="rounded-lg border border-gray-200 p-4">
            <SectionHeader title="Bio" onEdit={() => startEdit('bio')} editing={editingSection === 'bio'} />
            {editingSection === 'bio' ? (
              <div className="mt-3 space-y-3">
                <textarea rows={3} maxLength={500} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Parlez un peu de vous..." className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none" />
                <p className="text-xs text-gray-600 dark:text-gray-400">{editBio.length}/500</p>
                <EditActions saving={saving} onSave={() => saveSection({ bio: editBio })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-700">{profile.bio || <span className="italic text-gray-600 dark:text-gray-400">Non renseigné</span>}</p>
            )}
          </section>

          {/* ─── Orientation & Relations ──────────────────────────────── */}
          <section className="rounded-lg border border-gray-200 p-4">
            <SectionHeader title="Orientation & Relations" onEdit={() => startEdit('orientation')} editing={editingSection === 'orientation'} />
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
                <div><p className="text-xs text-gray-600 dark:text-gray-400">Orientation</p><ChipList items={profile.orientation} /></div>
                <div><p className="text-xs text-gray-600 dark:text-gray-400">Type de relation</p><ChipList items={profile.relationshipType} /></div>
              </div>
            )}
          </section>

          {/* ─── Centres d'intérêt ──────────────────────────────────────── */}
          <section className="rounded-lg border border-gray-200 p-4">
            <SectionHeader title="Centres d&apos;intérêt" onEdit={() => startEdit('interests')} editing={editingSection === 'interests'} />
            <PrivacyTip tip="Ces centres d&apos;intérêt aident à trouver des personnes qui partagent vos passions." />
            {editingSection === 'interests' ? (
              <div className="mt-3 space-y-3">
                <TagSelector categories={INTEREST_CATEGORIES} selected={editInterests} onChange={setEditInterests} placeholder="Ajouter un centre d&apos;intérêt..." />
                <EditActions saving={saving} onSave={() => saveSection({ interests: editInterests })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2"><ChipList items={profile.interests} /></div>
            )}
          </section>

          {/* ─── Pratiques & Préférences ────────────────────────────────── */}
          <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-4">
            <SectionHeader title="Pratiques & Préférences" onEdit={() => startEdit('practices')} editing={editingSection === 'practices'} />
            <p className="mt-1 text-xs text-gray-600">
              Certaines personnes aiment explorer des pratiques sensuelles ou spécifiques. C&apos;est totalement optionnel.
            </p>
            <PrivacyTip tip="Ces préférences sont privées. Elles ne s&apos;affichent que pour vos matches, pas publiquement." />
            {editingSection === 'practices' ? (
              <div className="mt-3 space-y-3">
                <TagSelector categories={PRACTICE_CATEGORIES} selected={editPractices} onChange={setEditPractices} placeholder="Ajouter une pratique..." />
                <EditActions saving={saving} onSave={() => saveSection({ practices: editPractices })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2"><ChipList items={profile.practices} dark /></div>
            )}
          </section>

          {/* ─── Photos ───────────────────────────────────────────────── */}
          <section className="rounded-lg border border-gray-200 p-4">
            <SectionHeader title="Photos" onEdit={() => startEdit('photos')} editing={editingSection === 'photos'} />
            <PrivacyTip tip="Évitez les photos avec des détails identifiables (lieux, plaques, etc.)." />
            {editingSection === 'photos' ? (
              <div className="mt-3 space-y-3">
                {editPhotos.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={url} onChange={(e) => { const p = [...editPhotos]; p[i] = e.target.value; setEditPhotos(p); }} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-black focus:outline-none" />
                    <button type="button" onClick={() => setEditPhotos(editPhotos.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-700">✕</button>
                  </div>
                ))}
                {editPhotos.length < 6 && (
                  <div className="flex gap-2">
                    <input type="url" value={editPhotoInput} onChange={(e) => setEditPhotoInput(e.target.value)} placeholder="https://..." className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-black focus:outline-none" />
                    <button type="button" onClick={() => { if (editPhotoInput.trim()) { setEditPhotos([...editPhotos, editPhotoInput.trim()]); setEditPhotoInput(''); } }} disabled={!editPhotoInput.trim()} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40">Ajouter</button>
                  </div>
                )}
                <EditActions saving={saving} onSave={() => saveSection({ photos: editPhotos })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {profile.photos.length > 0 ? profile.photos.map((url, i) => (
                  <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                )) : <span className="text-xs italic text-gray-600 dark:text-gray-400">Non renseigné</span>}
              </div>
            )}
          </section>

          {/* ─── Préférences de recherche ───────────────────────────────── */}
          <section className="rounded-lg border border-gray-200 p-4">
            <SectionHeader title="Préférences de recherche" onEdit={() => startEdit('search')} editing={editingSection === 'search'} />
            {editingSection === 'search' ? (
              <div className="mt-3 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Âge minimum : {editAgeMin} ans</label>
                  <input type="range" min={18} max={99} value={editAgeMin} onChange={(e) => setEditAgeMin(Number(e.target.value))} className="block w-full accent-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Âge maximum : {editAgeMax} ans</label>
                  <input type="range" min={18} max={99} value={editAgeMax} onChange={(e) => setEditAgeMax(Number(e.target.value))} className="block w-full accent-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Distance maximale : {editMaxDistanceKm} km</label>
                  <input type="range" min={1} max={500} value={editMaxDistanceKm} onChange={(e) => setEditMaxDistanceKm(Number(e.target.value))} className="block w-full accent-black" />
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ ageMin: editAgeMin, ageMax: editAgeMax, maxDistanceKm: editMaxDistanceKm })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <dl className="mt-2 space-y-1 text-sm">
                <div><dt className="text-xs text-gray-600 dark:text-gray-400">Tranche d&apos;âge</dt><dd>{profile.ageMin} – {profile.ageMax} ans</dd></div>
                <div><dt className="text-xs text-gray-600 dark:text-gray-400">Distance max</dt><dd>{profile.maxDistanceKm} km</dd></div>
              </dl>
            )}
          </section>

          {/* ─── Liens sociaux ──────────────────────────────────────────── */}
          <section className="rounded-lg border border-gray-200 p-4">
            <SectionHeader title="Liens sociaux" onEdit={() => startEdit('social')} editing={editingSection === 'social'} />
            <PrivacyTip tip="Ne les partagez qu&apos;avec des personnes de confiance." />
            {editingSection === 'social' ? (
              <div className="mt-3 space-y-3">
                {Object.entries(editSocialLinks).map(([platform, url]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs font-medium text-gray-700">{platform}</span>
                    <input type="url" value={url} onChange={(e) => setEditSocialLinks({ ...editSocialLinks, [platform]: e.target.value })} className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-black focus:outline-none" />
                    <button type="button" onClick={() => { const c = { ...editSocialLinks }; delete c[platform]; setEditSocialLinks(c); }} className="text-xs text-red-500">✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <select value={editSocialPlatform} onChange={(e) => setEditSocialPlatform(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-xs">
                    {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="url" value={editSocialUrl} onChange={(e) => setEditSocialUrl(e.target.value)} placeholder="https://..." className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-black focus:outline-none" />
                  <button type="button" onClick={() => { if (editSocialUrl.trim()) { setEditSocialLinks({ ...editSocialLinks, [editSocialPlatform]: editSocialUrl.trim() }); setEditSocialUrl(''); } }} disabled={!editSocialUrl.trim()} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40">+</button>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ socialLinks: editSocialLinks })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2">
                {Object.keys(profile.socialLinks || {}).length > 0
                  ? <div className="flex flex-wrap gap-1">{Object.keys(profile.socialLinks).map((p) => <span key={p} className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{p}</span>)}</div>
                  : <span className="text-xs italic text-gray-600 dark:text-gray-400">Non renseigné</span>}
              </div>
            )}
          </section>

          {/* ─── Conseils vie privée ────────────────────────────────────── */}
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-base font-semibold">Conseils vie privée</h2>
            <ul className="mt-3 space-y-2 text-xs text-gray-600">
              <li className="flex gap-2"><span aria-hidden="true">•</span>N&apos;utilisez jamais votre vrai nom complet comme pseudo.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Ne faites pas confiance aveuglément à quelqu&apos;un en ligne, même sur Libre.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Ne partagez pas d&apos;informations sensibles (adresse, lieu de travail) dans votre bio.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Vos messages sont chiffrés de bout en bout, mais Libre ne peut pas garantir la bonne foi de votre interlocuteur.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Signalez tout comportement suspect. La modération communautaire est là pour ça.</li>
            </ul>
          </section>

          {/* ─── Zone dangereuse ─────────────────────────────────────────── */}
          <section className="rounded-lg border border-red-200 p-4">
            <h2 className="text-base font-semibold text-red-700">Zone dangereuse</h2>
            <p className="mt-2 text-xs text-gray-600">La suppression de votre compte est définitive. Toutes vos données seront effacées.</p>
            {!showDeleteConfirm ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Supprimer mon compte</button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-red-700">Etes-vous sûr ? Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDeleteAccount} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Oui, supprimer</button>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}