'use client';

import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { toast } from '@/lib/toast';

/**
 * Signaler ou bloquer un profil (#322).
 *
 * Les endpoints `/api/moderation/report` et `/api/blocks` existaient depuis
 * l'origine mais n'avaient aucun appelant : personne ne pouvait signaler ni
 * bloquer, alors que les CGU promettent les deux. Ce composant est le point
 * d'entrée manquant.
 *
 * Les deux actions vivent dans la même modale parce qu'elles répondent au même
 * moment vécu — « cette personne me pose un problème ». On n'oblige pas à
 * choisir d'emblée : après un signalement, on propose le blocage, sans le
 * présélectionner (signaler quelqu'un n'implique pas vouloir l'effacer).
 */

const REASONS = [
  { value: 'harassment', label: 'Harcèlement ou intimidation' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'fake', label: 'Faux profil' },
  { value: 'spam', label: 'Spam ou arnaque' },
  { value: 'other', label: 'Autre' },
] as const;

type Step = 'choose' | 'report' | 'block' | 'reported';

export default function ReportUserModal({
  userId,
  displayName,
  onClose,
  onBlocked,
}: {
  userId: string;
  displayName: string;
  onClose: () => void;
  /** Appelé après un blocage réussi — la surface appelante doit se retirer. */
  onBlocked?: () => void;
}) {
  const [step, setStep] = useState<Step>('choose');
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useFocusTrap(dialogRef, true);

  /** Traduit les erreurs de l'API en langage humain — jamais de code brut. */
  const messageForError = (status: number, payload: { error?: string }) => {
    if (status === 429) {
      return 'Tu as envoyé plusieurs signalements récemment. Réessaie dans un moment.';
    }
    if (status === 409) return 'Cette personne est déjà bloquée.';
    if (status === 401) return 'Ta session a expiré. Reconnecte-toi pour continuer.';
    return payload.error && !payload.error.includes('_') ? payload.error : 'Une erreur est survenue.';
  };

  const handleReport = async () => {
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportedId: userId, reason, description: description.trim() }),
      });
      if (!res.ok) {
        setError(messageForError(res.status, await res.json().catch(() => ({}))));
        return;
      }
      // Aucun délai promis : le traitement est humain, on ne s'engage pas
      // sur un SLA qu'on ne tient pas.
      toast('Merci. Un humain va regarder ce signalement.');
      setStep('reported');
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: userId }),
      });
      if (!res.ok) {
        setError(messageForError(res.status, await res.json().catch(() => ({}))));
        return;
      }
      toast(`${displayName} ne peut plus te contacter.`);
      onBlocked?.();
      onClose();
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-user-modal-title"
        className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'choose' && (
          <>
            <h3 id="report-user-modal-title" className="mb-1 text-lg font-semibold text-content">
              {displayName}
            </h3>
            <p className="mb-4 text-sm text-muted">Que veux-tu faire ?</p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStep('report')}
                className="min-h-11 rounded-md border border-hairline px-3 py-2 text-left text-sm text-content transition-colors hover:border-hairline-strong motion-reduce:transition-none"
              >
                <span className="font-medium">Signaler ce profil</span>
                <span className="block text-xs text-muted">Un humain le relira.</span>
              </button>
              <button
                type="button"
                onClick={() => setStep('block')}
                className="min-h-11 rounded-md border border-hairline px-3 py-2 text-left text-sm text-content transition-colors hover:border-hairline-strong motion-reduce:transition-none"
              >
                <span className="font-medium">Bloquer</span>
                <span className="block text-xs text-muted">Vous ne vous verrez plus.</span>
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-md px-4 py-2 text-sm text-muted hover:bg-fill-subtle"
              >
                Annuler
              </button>
            </div>
          </>
        )}

        {step === 'report' && (
          <>
            <h3 id="report-user-modal-title" className="mb-4 text-lg font-semibold text-content">
              Signaler {displayName}
            </h3>

            <div className="mb-4 flex flex-col gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  aria-pressed={reason === r.value}
                  className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm transition-colors motion-reduce:transition-none ${
                    reason === r.value
                      ? 'border-coral bg-coral/10 text-coral dark:border-coral dark:bg-coral/20 dark:text-coral-light'
                      : 'border-hairline text-muted hover:border-hairline-strong'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <label htmlFor="report-description" className="mb-1 block text-xs font-medium text-muted">
              Précisions (facultatif)
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              className="mb-4 h-20 w-full resize-none rounded-md border border-hairline bg-fill-subtle p-2 text-sm text-content focus:border-coral focus:outline-none"
              placeholder="Ce qui s'est passé, si tu veux le préciser."
            />

            {error && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="min-h-11 rounded-md px-4 py-2 text-sm text-muted hover:bg-fill-subtle"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={!reason || loading}
                className="min-h-11 rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-50 motion-reduce:transition-none"
              >
                {loading ? 'Envoi…' : 'Signaler'}
              </button>
            </div>
          </>
        )}

        {step === 'block' && (
          <>
            <h3 id="report-user-modal-title" className="mb-3 text-lg font-semibold text-content">
              Bloquer {displayName} ?
            </h3>
            {/* L'API supprime les matches, et les conversations tombent en
                cascade. On le dit avant, pas après. */}
            <p className="mb-4 text-sm text-muted">
              Vous ne vous verrez plus et cette personne ne pourra plus te contacter.
              Si vous étiez en lien, votre conversation sera supprimée.
            </p>

            {error && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="min-h-11 rounded-md px-4 py-2 text-sm text-muted hover:bg-fill-subtle"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleBlock}
                disabled={loading}
                className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 motion-reduce:transition-none dark:bg-red-700 dark:hover:bg-red-600"
              >
                {loading ? 'Blocage…' : 'Bloquer'}
              </button>
            </div>
          </>
        )}

        {step === 'reported' && (
          <>
            <h3 id="report-user-modal-title" className="mb-3 text-lg font-semibold text-content">
              C&apos;est envoyé
            </h3>
            <p className="mb-4 text-sm text-muted">
              Veux-tu aussi bloquer {displayName} ? Ce n&apos;est pas obligatoire —
              le signalement est traité dans tous les cas.
            </p>

            {error && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-md px-4 py-2 text-sm text-muted hover:bg-fill-subtle"
              >
                Non, merci
              </button>
              <button
                type="button"
                onClick={handleBlock}
                disabled={loading}
                className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 motion-reduce:transition-none dark:bg-red-700 dark:hover:bg-red-600"
              >
                {loading ? 'Blocage…' : 'Bloquer aussi'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
