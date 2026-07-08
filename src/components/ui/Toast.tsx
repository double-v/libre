'use client';

/**
 * ToastHost — écoute les événements `libre:toast` et empile les toasts en bas
 * de l'écran (au-dessus de la tab bar). Monté une seule fois dans le layout.
 *
 * A11y : conteneur `role="status" aria-live="polite"` (annonce non-intrusive,
 * jamais un appât qui interrompt), bouton de fermeture 44px, auto-dismiss.
 * Motion : `animate-toast-in` (ramené à 80ms sous prefers-reduced-motion via
 * le bloc global de globals.css).
 */
import { useCallback, useEffect, useState } from 'react';
import { TOAST_EVENT, type ToastPayload, type ToastTone } from '@/lib/toast';

const MAX_VISIBLE = 3;

const TONE_CLASSES: Record<ToastTone, string> = {
  success:
    'bg-blush text-coral-dark border-coral/20 dark:bg-coral/10 dark:text-coral-light dark:border-coral/25',
  info: 'bg-white text-label border-sand dark:bg-dark-elevated dark:text-gray-100 dark:border-dark-border',
  error:
    'bg-blush text-coral-dark border-coral/30 dark:bg-coral/10 dark:text-coral-light dark:border-coral/30',
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastPayload;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`animate-toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-soft ${TONE_CLASSES[toast.tone]}`}
    >
      {toast.icon && (
        <span aria-hidden="true" className="text-lg leading-none">
          {toast.icon}
        </span>
      )}
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fermer"
        className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl leading-none opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-coral"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const onToast = (e: Event) => {
      const payload = (e as CustomEvent<ToastPayload>).detail;
      // Garde les MAX_VISIBLE plus récents pour ne jamais envahir l'écran.
      setToasts((prev) => [...prev, payload].slice(-MAX_VISIBLE));
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  // La région live reste montée en permanence (même vide) pour que les lecteurs
  // d'écran annoncent de façon fiable les toasts qui y sont injectés ensuite.
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-chrome z-[90] flex flex-col items-center gap-2 px-4 empty:hidden"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
