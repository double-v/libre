'use client';

import { useState } from 'react';
import { photoUrl } from '@/lib/photos';
import { SENSITIVITY_LABELS, SENSITIVITY_LEVELS, type SensitivityLevel } from '@/lib/photo-sensitivity';

/**
 * Galerie de modération des photos d'un profil (#323).
 *
 * L'avatar est distingué visuellement : c'est la seule photo publique pour
 * tout compte connecté, donc la priorité absolue en modération. Les autres ne
 * sont visibles que des matches (et de l'admin, via la dérogation tracée du
 * proxy `/api/photos/[key]`).
 */
export default function AdminUserPhotos({
  userId,
  displayName,
  photos,
  onPhotosChange,
  sensitivity = {},
}: {
  userId: string;
  displayName: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  /** Classification actuelle, par clé R2 (#330). */
  sensitivity?: Record<string, string>;
}) {
  const [photoToRemove, setPhotoToRemove] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);
  // Classement (#330) : état séparé du retrait — ce sont deux gestes distincts,
  // et confondre leurs panneaux ferait cliquer « supprimer » en croyant classer.
  const [photoToClassify, setPhotoToClassify] = useState<string | null>(null);
  const [level, setLevel] = useState<SensitivityLevel>('suggestive');
  const [classifyReason, setClassifyReason] = useState('');
  const [classifyError, setClassifyError] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [levels, setLevels] = useState<Record<string, string>>(sensitivity);

  const handleRemove = async () => {
    if (!photoToRemove) return;
    if (reason.trim().length < 3) {
      setError('Indique un motif — un retrait sans motif est indéfendable si la personne conteste.');
      return;
    }
    setError('');
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoKey: photoToRemove, reason: reason.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onPhotosChange(data.photos);
      setPhotoToRemove(null);
      setReason('');
    } catch {
      setError('Erreur lors du retrait');
    } finally {
      setRemoving(false);
    }
  };

  const handleClassify = async () => {
    if (!photoToClassify) return;
    if (classifyReason.trim().length < 3) {
      setClassifyError('Indique un motif — classer est invisible pour la personne concernée.');
      return;
    }
    setClassifyError('');
    setClassifying(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/photos/sensitivity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoKey: photoToClassify, sensitivity: level, reason: classifyReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Erreur');
      }
      setLevels((m) => ({ ...m, [photoToClassify]: level }));
      setPhotoToClassify(null);
      setClassifyReason('');
    } catch (err) {
      setClassifyError(err instanceof Error ? err.message : 'Erreur lors du classement');
    } finally {
      setClassifying(false);
    }
  };

  const handleDeclassify = async (key: string) => {
    const motif = window.prompt('Motif du déclassement (obligatoire) :')?.trim() ?? '';
    if (motif.length < 3) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/photos/sensitivity`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoKey: key, reason: motif }),
      });
      if (!res.ok) throw new Error();
      setLevels((m) => {
        const next = { ...m };
        delete next[key];
        return next;
      });
    } catch {
      setError('Erreur lors du déclassement');
    }
  };

  const isAvatar = photoToRemove !== null && photos[0] === photoToRemove;

  return (
    <div className="mt-6 rounded-xl border border-hairline p-4">
      <h2 className="mb-3 font-semibold text-content">Photos</h2>

      {photos.length === 0 ? (
        <p className="text-sm text-muted">Aucune photo.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {photos.map((key, i) => (
            <figure key={key} className="w-32">
              {/* `overflow-hidden` + fond neutre : une clé orpheline (objet R2
                  disparu) rendait le texte alt en clair, débordant de la
                  vignette et cassant l'alignement de la rangée. */}
              <div className="h-32 w-32 overflow-hidden rounded-lg border border-hairline bg-fill-subtle">
                {/* Le proxy redirige vers une URL R2 signée à TTL court :
                    next/image la mettrait en cache sous une clé périmée. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(key)}
                  alt={`Photo ${i + 1} de ${displayName}`}
                  className="h-32 w-32 object-cover text-xs text-muted"
                />
              </div>
              {/* Légende empilée : à 128px de large, le libellé et le bouton
                  côte à côte se chevauchaient dès que le libellé passait à la
                  ligne (« Avatar (public) »). */}
              <figcaption className="mt-1.5">
                <span className={`block truncate text-xs font-medium ${i === 0 ? 'text-coral dark:text-coral-light' : 'text-muted'}`}>
                  {i === 0 ? 'Avatar (public)' : `Photo ${i + 1}`}
                </span>
                <span className="block truncate text-xs text-muted">
                  {levels[key]
                    ? SENSITIVITY_LABELS[levels[key] as SensitivityLevel] ?? 'Classée'
                    : 'Non classée'}
                </span>
                {levels[key] ? (
                  <button
                    type="button"
                    onClick={() => handleDeclassify(key)}
                    className="mt-1 w-full rounded-md border border-hairline-strong px-2 py-1 text-xs font-medium text-content hover:bg-fill-subtle"
                  >
                    Déclasser
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setPhotoToClassify(key); setClassifyReason(''); setClassifyError(''); }}
                    className="mt-1 w-full rounded-md border border-hairline-strong px-2 py-1 text-xs font-medium text-content hover:bg-fill-subtle"
                  >
                    Classer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setPhotoToRemove(key); setReason(''); setError(''); }}
                  className="mt-1 w-full rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  Retirer
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {photoToClassify && (
        <div className="mt-4 rounded-lg border border-hairline-strong p-3">
          <p className="mb-2 text-sm text-content">
            Classer cette photo comme sensible. Elle <strong>reste en ligne</strong> : elle
            arrivera floutée aux personnes qui n&apos;ont pas demandé à voir ce contenu,
            avec un bouton pour la révéler.
          </p>
          {photos[0] === photoToClassify && (
            <p className="mb-2 text-sm text-muted">
              C&apos;est l&apos;avatar : il restera l&apos;avatar, mais s&apos;affichera flouté
              dans les découvertes.
            </p>
          )}

          <fieldset className="mb-2">
            <legend className="sr-only">Niveau de classification</legend>
            <div className="flex gap-2">
              {SENSITIVITY_LEVELS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={level === value}
                  onClick={() => setLevel(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    level === value
                      ? 'bg-coral text-white'
                      : 'border border-hairline-strong text-content hover:bg-fill-subtle'
                  }`}
                >
                  {SENSITIVITY_LABELS[value]}
                </button>
              ))}
            </div>
          </fieldset>

          <label htmlFor="classify-photo-reason" className="sr-only">Motif du classement</label>
          <input
            id="classify-photo-reason"
            type="text"
            placeholder="Motif (obligatoire)"
            value={classifyReason}
            onChange={(e) => setClassifyReason(e.target.value)}
            className="mb-2 w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm text-content"
          />
          {classifyError && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{classifyError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClassify}
              disabled={classifying}
              className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta disabled:opacity-50"
            >
              {classifying ? 'Classement…' : 'Classer'}
            </button>
            <button
              type="button"
              onClick={() => { setPhotoToClassify(null); setClassifyError(''); }}
              className="rounded-md border border-hairline-strong px-4 py-2 text-sm text-content"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {photoToRemove && (
        <div className="mt-4 rounded-lg border border-red-200 p-3 dark:border-red-900/50">
          <p className="mb-2 text-sm text-content">
            Retirer cette photo ? Elle sera supprimée du profil et du stockage — c&apos;est irréversible.
          </p>
          {/* Les deux conséquences se disent avant l'acte, pas après. */}
          {isAvatar && photos.length > 1 && (
            <p className="mb-2 text-sm text-muted">
              C&apos;est l&apos;avatar : la photo suivante prendra sa place.
            </p>
          )}
          {photos.length === 1 && (
            <p className="mb-2 text-sm text-muted">
              C&apos;est la seule photo : le profil se retrouvera sans avatar.
            </p>
          )}

          <label htmlFor="remove-photo-reason" className="sr-only">Motif du retrait</label>
          <input
            id="remove-photo-reason"
            type="text"
            placeholder="Motif (obligatoire)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-2 w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm text-content"
          />
          {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {removing ? 'Retrait…' : 'Confirmer le retrait'}
            </button>
            <button
              type="button"
              onClick={() => { setPhotoToRemove(null); setError(''); }}
              className="rounded-md border border-hairline-strong px-4 py-2 text-sm text-content"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
