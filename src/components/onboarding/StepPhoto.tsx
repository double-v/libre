'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import OnboardingShell from './OnboardingShell';
import Button from '@/components/ui/Button';
import { photoUrl } from '@/lib/photos';
import { uploadPhoto, type UploadPhotoResult } from '@/lib/photos-client';

/**
 * Étape 1 — une photo (spec 005). Même route, mêmes contraintes que la page
 * profil (`uploadPhoto`) : l'erreur serveur s'affiche telle quelle et laisse
 * réessayer ou passer. La saisie est enregistrée ici, indépendamment de la
 * suite (FR-007).
 */
export interface StepPhotoProps {
  displayName: string;
  onDone: () => void;
  upload?: (file: File) => Promise<UploadPhotoResult>;
}

export default function StepPhoto({ displayName, onDone, upload = uploadPhoto }: StepPhotoProps) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const initial = displayName.trim().charAt(0).toUpperCase() || '·';

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError('');
    setBusy(true);
    const result = await upload(file);
    setBusy(false);
    if (result.ok) setAdded(result.photo);
    else setError(result.error);
  }

  return (
    <OnboardingShell
      step={0}
      eyebrow={`Bienvenue, ${displayName}`}
      title="Une photo, pour commencer"
      lead="C'est ce qui donne envie de te découvrir. Une seule suffit, tu pourras en ajouter d'autres plus tard."
      primary={added ? { label: 'Continuer', onClick: onDone } : undefined}
      onLater={onDone}
    >
      {added ? (
        <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-sunken">
          <Image src={photoUrl(added)} alt="" fill sizes="512px" className="object-cover" unoptimized />
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-content backdrop-blur-sm">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
            Ajoutée
          </span>
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            Photo principale
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3.5 rounded-card border border-dashed border-coral-light bg-sunken px-4 py-7 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface text-4xl font-semibold text-coral-dark shadow-soft dark:text-coral-light">
            {initial}
          </div>
          <p className="text-sm leading-snug text-muted">
            JPG, PNG ou WebP · 10 Mo max
            <br />
            Visible par les membres, jamais en dehors de Libre.
          </p>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Ajouter une photo"
            disabled={busy}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Button type="button" variant="primary" loading={busy} onClick={() => document.getElementById(inputId)?.click()}>
            {error ? 'Réessayer' : 'Ajouter une photo'}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </OnboardingShell>
  );
}
