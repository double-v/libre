'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * ActionMenu — le « ⋯ » du Design System (#417).
 *
 * Quand une ligne porte plus d'actions qu'elle n'a de place (l'en-tête d'un
 * fil à 390 px : prénom + deux actions), on garde le contenu lisible et on
 * range les actions derrière un seul déclencheur de 44 px. Le composant ne
 * porte que la mécanique : ouverture, fermeture (Échap, clic dehors, choix),
 * focus. Les éléments sont fournis par l'appelant via une fonction qui reçoit
 * `fermer`, pour que l'action choisie referme le menu elle-même — un lien ou
 * un bouton déjà existant y entre tel quel avec `role="menuitem"`.
 *
 * Pas d'animation : un menu de deux lignes qui apparaît n'a rien à montrer,
 * et c'est la version `prefers-reduced-motion` de toute façon.
 */
interface ActionMenuProps {
  /** Nom accessible du déclencheur (« Plus d’actions »). */
  label: string;
  children: (fermer: () => void) => ReactNode;
  /** Bord auquel le menu s'aligne. Fin de ligne par défaut (le « ⋯ » y vit). */
  align?: 'end' | 'start';
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export default function ActionMenu({ label, children, align = 'end' }: ActionMenuProps) {
  const [ouvert, setOuvert] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const declencheurRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const fermer = useCallback(() => setOuvert(false), []);

  // Clic-dehors + Échap ferment (même mécanique que ThemeMenu).
  useEffect(() => {
    if (!ouvert) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) fermer();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fermer();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ouvert, fermer]);

  // À l'ouverture, focus le premier élément ; à la fermeture, rendre au « ⋯ ».
  const etaitOuvert = useRef(false);
  useEffect(() => {
    if (ouvert) {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    } else if (etaitOuvert.current) {
      declencheurRef.current?.focus();
    }
    etaitOuvert.current = ouvert;
  }, [ouvert]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={declencheurRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={ouvert ? menuId : undefined}
        onClick={() => setOuvert((o) => !o)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control text-muted hover:bg-fill-subtle hover:text-content focus-visible:outline-none focus-visible:shadow-focus"
      >
        <DotsIcon />
      </button>
      {ouvert && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={`absolute top-full z-30 mt-1 flex min-w-[220px] flex-col rounded-card border border-hairline bg-surface p-1 shadow-pop ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {children(fermer)}
        </div>
      )}
    </div>
  );
}
