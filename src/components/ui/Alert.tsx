'use client';

import { useId, type ReactNode } from 'react';

export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  variant: AlertVariant;
  /** Optional headline, rendered bold above children. */
  title?: string;
  /** Optional click-to-dismiss. Renders a × button on the right. */
  onDismiss?: () => void;
  /** Optional icon override. Defaults to an inline SVG matched to the variant. */
  icon?: ReactNode;
  children: ReactNode;
}

const baseClasses =
  'flex items-start gap-3 rounded-md p-3 text-sm ' +
  'transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out-soft)]';

const variantClasses: Record<AlertVariant, string> = {
  success:
    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning:
    'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  error:
    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  info:
    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const iconStrokeClasses: Record<AlertVariant, string> = {
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
};

function DefaultIcon({ variant }: { variant: AlertVariant }) {
  // Compact 20×20 icon, semantically meaningful per variant.
  const stroke = iconStrokeClasses[variant];
  switch (variant) {
    case 'success':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={stroke} aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'warning':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={stroke} aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'error':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={stroke} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case 'info':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={stroke} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

/**
 * Alert — composant UI partagé du Design System Libre.
 *
 * Variantes : success, warning, error, info.
 * Structure : icon à gauche (auto par variant), contenu au centre
 * (title optionnel + children), bouton dismiss à droite optionnel.
 *
 * A11y :
 *  - role="alert" pour que les screen readers interrompent et annoncent
 *  - aria-live="polite" pour que les alertes dynamiques (error après submit)
 *    soient lues sans interrompre l'utilisateur brutalement
 *  - icon décorative (aria-hidden), titre sémantique s'il y en a un
 *
 * Motion : respect prefers-reduced-motion via globals.css.
 * Tokens : aucune valeur inline, palette via @theme (green-50,
 * red-50, etc. sont des Tailwind tokens sémantiques standards).
 */
export default function Alert({
  variant,
  title,
  onDismiss,
  icon,
  children,
}: AlertProps) {
  const titleId = useId();
  const hasTitle = Boolean(title);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-labelledby={hasTitle ? titleId : undefined}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <span className="shrink-0 pt-0.5">
        {icon ?? <DefaultIcon variant={variant} />}
      </span>

      <div className="flex-1">
        {title && (
          <p id={titleId} className="font-medium">
            {title}
          </p>
        )}
        <div className={hasTitle ? 'mt-1' : ''}>{children}</div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="shrink-0 -m-1 p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
