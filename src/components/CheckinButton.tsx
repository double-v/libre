'use client';

/**
 * CheckinButton — bouton de check-in de sécurité pour le chat 1:1.
 *
 * Cf. chantier 01 — Phase 3, tâche 3.5.
 *
 * Comportement :
 * - État inactif : bouton « Activer un check-in de sécurité » + tooltip.
 *   Clic → modal de choix de durée (30min/1h/2h/4h/8h) → POST /api/circle/check-in.
 * - État actif : bandeau countdown (aria-live) + bouton vert « Je suis safe »
 *   (POST .../validate) + lien « Annuler » (DELETE .../cancel).
 * - A11y : focus trap dans la modal, ESC ferme, aria-live="polite" sur le
 *   countdown, restore focus sur l'élément qui a ouvert la modal.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/lib/toast';

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 120, label: '2 h' },
  { value: 240, label: '4 h' },
  { value: 480, label: '8 h' },
];

interface ActiveCheckin {
  id: string;
  triggeredAt: string;
  expiresAt: string;
  secondsRemaining: number;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expiré';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} restantes`;
  }
  return `${m}:${String(s).padStart(2, '0')} restantes`;
}

export function CheckinButton() {
  const [active, setActive] = useState<ActiveCheckin | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [error, setError] = useState('');

  // Polling du checkin actif (1s tant qu'il y en a un)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/circle/check-in/active');
        if (cancelled) return;
        if (res.status === 204) {
          setActive(null);
        } else if (res.ok) {
          setActive(await res.json());
        }
      } catch {
        // ignore — pas critique, le bouton reste utilisable
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setActive((a) => {
        if (!a) return a;
        const next = a.secondsRemaining - 1;
        if (next <= 0) {
          // Check-in expiré : on invalide l'état local, le cron s'occupera du reste
          return null;
        }
        return { ...a, secondsRemaining: next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active?.id]);

  async function handleStart(durationMinutes: number) {
    setActionInFlight(true);
    setError('');
    try {
      const res = await fetch('/api/circle/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur de démarrage');
      }
      const data = await res.json();
      const expiresAt = new Date(data.expiresAt).getTime();
      setActive({
        id: data.id,
        triggeredAt: new Date().toISOString(),
        expiresAt: data.expiresAt,
        secondsRemaining: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
      });
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionInFlight(false);
    }
  }

  async function handleValidate() {
    if (!active || actionInFlight) return;
    setActionInFlight(true);
    setError('');
    try {
      const res = await fetch(`/api/circle/check-in/${active.id}/validate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erreur de validation');
      setActive(null);
      toast('Tu es de retour. Ton Cercle n\'a pas été alerté.', { icon: '🛡' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionInFlight(false);
    }
  }

  async function handleCancel() {
    if (!active || actionInFlight) return;
    if (!confirm('Annuler le check-in ? Ton Cercle ne sera pas alerté.')) return;
    setActionInFlight(true);
    setError('');
    try {
      const res = await fetch(`/api/circle/check-in/${active.id}/cancel`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Erreur d'annulation");
      setActive(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionInFlight(false);
    }
  }

  if (loading) return null;

  // ── État actif : bandeau countdown + actions ──
  if (active) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-2 rounded-xl border border-coral/30 bg-coral/5 p-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-coral-dark">
            ⏱ Check-in actif
          </span>
          <span
            className="font-mono text-sm font-semibold text-coral-dark"
            aria-atomic="true"
          >
            {formatRemaining(active.secondsRemaining)}
          </span>
        </div>
        <p className="text-xs text-gray-600">
          Si tu ne reviens pas à temps, ton Cercle est alerté automatiquement.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleValidate}
            disabled={actionInFlight}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-50"
          >
            ✓ Je suis safe
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={actionInFlight}
            className="rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── État inactif : bouton simple ──
  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title="Tu as un RDV ? Si tu ne reviens pas dans le temps choisi, ton Cercle est alerté."
        className="rounded-xl border border-coral/30 bg-white px-3 py-2 text-sm font-medium text-coral-dark hover:bg-coral/5 focus:outline-none focus:ring-2 focus:ring-coral"
      >
        🛡 Activer un check-in de sécurité
      </button>
      {showModal && (
        <DurationModal
          onClose={() => setShowModal(false)}
          onChoose={handleStart}
          inFlight={actionInFlight}
          error={error}
        />
      )}
    </>
  );
}

function DurationModal({
  onClose,
  onChoose,
  inFlight,
  error,
}: {
  onClose: () => void;
  onChoose: (durationMinutes: number) => void;
  inFlight: boolean;
  error: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Focus trap + ESC
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previousFocus.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-lg sm:rounded-2xl"
      >
        <h2
          id="checkin-modal-title"
          className="mb-1 text-lg font-semibold text-gray-900"
        >
          Durée du check-in
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Si tu ne valides pas avant la fin, ton Cercle est alerté.
        </p>

        {error && (
          <div role="alert" className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choisir une durée">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={inFlight}
              onClick={() => onChoose(d.value)}
              className="rounded-lg border border-coral/30 bg-white px-3 py-3 text-sm font-medium text-coral-dark hover:bg-coral/5 focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
            >
              {d.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={inFlight}
          className="mt-4 w-full rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
