'use client';

import { useState } from 'react';

interface ProfileSectionProps {
  title: string;
  onEdit?: () => void;
  editing?: boolean;
  surface?: 'white' | 'blush' | 'sand';
  complete?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const surfaceClasses: Record<string, string> = {
  white: 'bg-white dark:bg-gray-800',
  blush: 'bg-blush dark:bg-coral/10',
  sand: 'bg-sand dark:bg-coral-dark/20',
};

export default function ProfileSection({
  title,
  onEdit,
  editing,
  surface = 'white',
  complete = false,
  defaultOpen = true,
  children,
}: ProfileSectionProps) {
  // When editing, the user MUST see the form. We force open and disable the toggle.
  const forceOpen = !!editing;
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = forceOpen || open;
  const showPencil = !!onEdit && !editing;

  return (
    <section
      className={`${surfaceClasses[surface]} rounded-xl border border-gray-200 p-4 sm:p-5 dark:border-gray-700`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => !forceOpen && setOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls={`profile-section-${title}`}
          className="flex flex-1 items-center gap-2 rounded text-left transition-colors hover:text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-1 disabled:cursor-default"
          disabled={forceOpen}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
              className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            className="h-11 w-11 flex items-center justify-center rounded-full transition-colors hover:bg-blush dark:hover:bg-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5 text-gray-400 hover:text-coral"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>
        )}
      </div>
      {isOpen && (
        <div id={`profile-section-${title}`}>
          {children}
        </div>
      )}
    </section>
  );
}
