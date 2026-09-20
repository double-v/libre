'use client';

import { useId } from 'react';
import Button from '@/components/ui/Button';

/**
 * Zone d'ajout d'une première photo — la même invitation dans le parcours
 * d'accueil (`StepPhoto`) et en tête du profil sans photo (#413) : avatar à
 * l'initiale, contraintes, un bouton. L'erreur serveur s'affiche telle
 * quelle et laisse réessayer.
 */
export interface PhotoDropZoneProps {
  initial: string;
  onFile: (file: File) => void;
  busy?: boolean;
  error?: string;
  lead?: string;
}

export default function PhotoDropZone({
  initial,
  onFile,
  busy = false,
  error = '',
  lead = "C'est ce qui donne envie de te découvrir. Une seule suffit.",
}: PhotoDropZoneProps) {
  const inputId = useId();
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-card border border-dashed border-coral-light bg-sunken px-4 py-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface text-3xl font-semibold text-coral-dark shadow-soft dark:text-coral-light">
        {initial}
      </div>
      <p className="text-sm leading-snug text-muted">
        {lead}
        <br />
        <span className="text-xs">JPG, PNG ou WebP · 10 Mo max · 6 photos</span>
      </p>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Ajouter une photo"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
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
  );
}
