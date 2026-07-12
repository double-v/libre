'use client';

import { useState, useEffect } from 'react';

interface ProfileSectionProps {
  title: string;
  onEdit?: () => void;
  editing?: boolean;
  surface?: 'white' | 'blush' | 'sand';
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
  const forceOpen = !!editing || complete;

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

  return (
    <section
      className={`${surfaceClasses[surface]} rounded-xl border border-hairline p-4 sm:p-5`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={`profile-section-${sectionId ?? title}`}
          className="flex flex-1 items-center gap-2 rounded text-left transition-colors hover:text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-1 disabled:cursor-default"
          disabled={forceOpen}
        >
          <h3 className="text-lg font-semibold text-content">
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
      {isOpen && (
        <div id={`profile-section-${sectionId ?? title}`}>
          {children}
        </div>
      )}
    </section>
  );
}
