'use client';

import { useState } from 'react';
import Image from 'next/image';
import OnboardingShell from './OnboardingShell';
import PhotoDropZone from '@/components/PhotoDropZone';
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
        <PhotoDropZone initial={initial} busy={busy} error={error} onFile={(f) => void onFile(f)} />
      )}
    </OnboardingShell>
  );
}
