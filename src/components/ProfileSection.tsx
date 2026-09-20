'use client';

import { useState, useEffect } from 'react';

export type SectionStatus = 'todo' | 'set' | 'optional';

interface ProfileSectionProps {
  title: string;
  /** Pictogramme du titre (#413) : lire la page d'un coup d'œil. */
  icon?: React.ReactNode;
  /**
   * Badge d'état (#413) : `todo` (coral, « À compléter »), `set` (« Réglé »),
   * `optional` (« Facultatif »). Absent = pas de badge. `todo` teinte aussi la
   * bordure : ce qui manque se voit sans lire.
   */
  status?: SectionStatus;
  /** Libellé du badge `todo`, quand « À compléter » ne convient pas. */
  todoLabel?: string;
  /** Une ligne montrée quand la section est repliée : ce qui est réglé, sans ouvrir. */
  summary?: React.ReactNode;
  onEdit?: () => void;
  editing?: boolean;
  surface?: 'white' | 'blush' | 'sand' | 'danger';
  complete?: boolean;
  defaultOpen?: boolean;
  /**
   * Stable id used to persist the open/collapsed state in localStorage
   * across mounts. When set, the user comes back to the same expansion
   * state they left. When omitted, state is in-memory only (back-compat).
   */
  sectionId?: string;
  children: React.ReactNode;
}

const surfaceClasses: Record<string, string> = {
  white: 'bg-surface',
  blush: 'bg-blush dark:bg-coral/10',
  sand: 'bg-sand dark:bg-coral-dark/20',
  danger: 'bg-surface border-error/30',
};

const STATUS_LABELS: Record<SectionStatus, string> = {
  todo: 'À compléter',
  set: 'Réglé',
  optional: 'Facultatif',
};

const STORAGE_PREFIX = 'libre-profile-section-';

function readPersisted(sectionId: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + sectionId);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return null;
  } catch {
    return null;
  }
}

function writePersisted(sectionId: string, open: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + sectionId, open ? '1' : '0');
  } catch {
    // Quota exceeded or storage disabled — fail silently, the section
    // still works in-memory for this session.
  }
}

export default function ProfileSection({
  title,
  icon,
  status,
  todoLabel,
  summary,
  onEdit,
  editing,
  surface = 'white',
  complete = false,
  defaultOpen = true,
  sectionId,
  children,
}: ProfileSectionProps) {
  // When editing, the user MUST see the form. We force open and disable the toggle.
  // Sections marked complete are also always open — collapsing them would hide
  // good content and re-open them later for no reason, so we lock them open.
  // #413 : une section « À compléter » reste ouverte aussi — ce qui manque
  // doit se voir, et la tuile du haut y mène.
  const forceOpen = !!editing || complete || status === 'todo';

  // Initial value: persisted > defaultOpen. We seed with defaultOpen and
  // let the effect below read the storage value on mount to avoid SSR
  // hydration mismatches.
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (!sectionId) return;
    const persisted = readPersisted(sectionId);
    // Lecture localStorage post-hydratation : SSR seed = defaultOpen, on aligne
    // sur la valeur persistée après montage → un seul flip, SSR-safe (cf. commentaire
    // ci-dessus + #193).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (persisted !== null) setOpen(persisted);
  }, [sectionId]);

  const isOpen = forceOpen || open;
  const showPencil = !!onEdit && !editing;

  const toggle = () => {
    if (forceOpen) return;
    setOpen((v) => {
      const next = !v;
      if (sectionId) writePersisted(sectionId, next);
      return next;
    });
  };

  const contentId = `profile-section-${sectionId ?? title}-content`;

  return (
    <section
      // L'ancre porte sur la section, pas sur son contenu : un lien
      // `/profile#profile-section-photos` doit arriver même repliée.
      id={`profile-section-${sectionId ?? title}`}
      data-status={status}
      className={`${surfaceClasses[surface]} rounded-xl border p-4 sm:p-5 ${
        status === 'todo' ? 'border-coral/45' : surface === 'danger' ? '' : 'border-hairline'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded text-left transition-colors hover:text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-1 disabled:cursor-default"
          disabled={forceOpen}
        >
          {icon && (
            <span className={`h-5 w-5 shrink-0 ${surface === 'danger' ? 'text-error' : 'text-coral'}`}>
              {icon}
            </span>
          )}
          <h3 className="min-w-0 text-base font-semibold leading-tight text-content sm:text-lg">
            {title}
          </h3>
          {complete && (
            <span
              role="img"
              aria-label={`${title} — rempli`}
              data-testid="section-complete"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
          {status && (
            <span
              data-testid="section-status"
              className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                status === 'todo' ? 'bg-coral text-white' : 'bg-fill-subtle text-muted'
              }`}
            >
              {status === 'todo' && todoLabel ? todoLabel : STATUS_LABELS[status]}
            </span>
          )}
          {!forceOpen && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-4 w-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        {showPencil && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Modifier ${title}`}
            className="h-11 w-11 flex items-center justify-center rounded-full transition-colors hover:bg-sunken"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5 text-muted hover:text-coral"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>
        )}
      </div>
      {!isOpen && summary && (
        <p className="mt-1.5 text-[13px] text-muted">{summary}</p>
      )}
      {isOpen && (
        <div id={contentId}>
          {children}
        </div>
      )}
    </section>
  );
}
