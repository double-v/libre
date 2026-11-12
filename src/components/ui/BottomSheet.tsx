'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Feuille de confirmation (spec 012, DESIGN.md « Hub Membres »).
 *
 * En bas d'écran sous 900 px, centrée au-delà. `role="dialog"` modal, titre
 * relié, focus piégé dans la feuille, Échap et clic sur le voile ferment, et
 * le focus revient au bouton qui l'a ouverte. Aucune animation d'entrée :
 * rien à couper pour `prefers-reduced-motion`.
 */
export default function BottomSheet({
  titre,
  onClose,
  children,
}: {
  titre: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idTitre = useId();

  useEffect(() => {
    const declencheur = document.activeElement as HTMLElement | null;
    const feuille = ref.current;
    const focusables = () =>
      feuille ? [...feuille.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, a[href], [tabindex]:not([tabindex="-1"])')] : [];
    (focusables()[0] ?? feuille)?.focus();

    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const liste = focusables();
      if (liste.length === 0) return;
      const premier = liste[0];
      const dernier = liste[liste.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener('keydown', auClavier);
    return () => {
      document.removeEventListener('keydown', auClavier);
      declencheur?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 dark:bg-black/60 min-[900px]:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        className="grid max-h-[85vh] w-full max-w-[520px] gap-2.5 overflow-auto rounded-t-[14px] bg-surface pt-[18px] text-sm text-content shadow-pop focus:outline-none min-[900px]:rounded-[14px] pb-[calc(18px+env(safe-area-inset-bottom,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))]"
      >
        <h3 id={idTitre} className="text-lg font-semibold text-content">{titre}</h3>
        {children}
      </div>
    </div>
  );
}

/** Encadré « Le membre verra » (FR-021). */
export function MembreVerra({ texte }: { texte: string }) {
  return (
    <div className="rounded-lg bg-sunken px-3 py-2.5 text-[13px] text-content">
      <b className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Le membre verra</b>
      {texte}
    </div>
  );
}
