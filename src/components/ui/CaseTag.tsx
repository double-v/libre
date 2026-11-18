import type { ReactNode } from 'react';

export type CaseTagVariant = 'bad' | 'warn' | 'info' | 'ok' | 'neutre';

// Même palette de statut que `Tag` (pending, refused, verified).
const VARIANTES: Record<CaseTagVariant, string> = {
  bad: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  warn: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ok: 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  neutre: 'bg-sunken text-muted',
};

/**
 * Étiquette de cas, de statut ou de fiabilité du back-office (spec 012,
 * DESIGN.md « Hub Membres ») : 10 px, capitales espacées, rayon 3 px.
 */
export default function CaseTag({ variant = 'neutre', children }: { variant?: CaseTagVariant; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-[3px] px-1.5 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.06em] ${VARIANTES[variant]}`}>
      {children}
    </span>
  );
}
