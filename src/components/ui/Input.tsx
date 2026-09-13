'use client';

import { forwardRef, useId, useState } from 'react';
import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from 'react';

export type InputSize = 'sm' | 'md';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: string;
  error?: string;
  size?: InputSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Render as a textarea (multi-line) instead of a single-line input. */
  multiline?: boolean;
  /**
   * Affiche l'œil « voir le mot de passe » sur un champ `type="password"`.
   * Activé par défaut : sur mobile, taper un mot de passe à l'aveugle est la
   * première cause d'échec de connexion. Passer `false` pour un champ où la
   * révélation n'a pas de sens (saisie en public imposée, par exemple).
   */
  revealable?: boolean;
  /** Number of visible rows when multiline. Defaults to 4. */
  rows?: number;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-9 text-sm',
  md: 'h-11 text-sm', // 44px touch target (WCAG 2.5.5)
};

const baseFieldClasses =
  'block w-full rounded-control border bg-surface text-content shadow-sm ' +
  'placeholder:text-placeholder placeholder:italic ' +
  'transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out-soft)] ' +
  'focus:outline-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.5 0 10 6 10 6a17.6 17.6 0 0 1-3.2 3.9" />
      <path d="M6.6 6.7A17.4 17.4 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4.2-.9" />
      <path d="m3 3 18 18" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

/**
 * Input — composant UI partagé du Design System Libre.
 *
 * Toujours accompagné d'un `<label>` visible (cf. PRODUCT.md, a11y).
 * Hiérarchie visuelle : label > valeur (ink) > hint (secondary) > error (error).
 * A11y :
 *  - `<label htmlFor>` lié à l'input
 *  - `aria-invalid` quand error
 *  - `aria-describedby` pointe vers hint ET error
 *  - `aria-live="polite"` sur la zone error (mais seulement quand error non vide)
 *  - l'œil des champs mot de passe est un vrai `<button>` avec `aria-pressed`
 *    et un `aria-label` qui dit l'action à venir, pas l'état courant
 * Cibles tactiles : 44px par défaut (md).
 * Motion : respect prefers-reduced-motion via globals.css.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    size = 'md',
    leadingIcon,
    trailingIcon,
    multiline = false,
    revealable = true,
    rows = 4,
    id,
    type,
    className,
    disabled,
    required,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? `libre-input-${reactId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const hasError = Boolean(error);

  // Révélation du mot de passe : on bascule `type` entre password et text
  // plutôt que d'exposer une valeur en clair ailleurs dans le DOM.
  const [revealed, setRevealed] = useState(false);
  const canReveal = revealable && !multiline && type === 'password';
  const effectiveType = canReveal && revealed ? 'text' : type;

  const stateClasses = hasError
    ? 'border-error focus:border-error focus:shadow-[0_0_0_3px_rgb(220_38_38_/_0.25)]'
    : 'border-hairline-strong focus:border-coral focus:shadow-focus dark:focus:border-coral-light';

  // Les deux côtés sont toujours explicites : une icône à gauche ne doit pas
  // faire perdre la gouttière de droite (et réciproquement).
  const paddingClasses = [
    leadingIcon ? 'pl-10' : 'pl-3',
    trailingIcon || canReveal ? 'pr-11' : 'pr-3',
  ].join(' ');

  const fieldClasses = [
    baseFieldClasses,
    sizeClasses[size],
    stateClasses,
    paddingClasses,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const fieldProps = {
    ...rest,
    type: effectiveType,
    id: inputId,
    disabled,
    required,
    'aria-invalid': hasError || undefined,
    'aria-describedby': describedBy,
    className: fieldClasses,
  };

  return (
    <div className="block w-full">
      <label
        htmlFor={inputId}
        className="mb-1 block text-sm font-medium text-label dark:text-foreground"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-error">
            *
          </span>
        )}
      </label>

      <div className="relative">
        {leadingIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
          >
            {leadingIcon}
          </span>
        )}

        {multiline ? (
          <textarea
            {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            rows={rows}
            ref={ref as React.Ref<HTMLTextAreaElement>}
          />
        ) : (
          <input {...fieldProps} ref={ref} />
        )}

        {canReveal && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            disabled={disabled}
            aria-pressed={revealed}
            aria-controls={inputId}
            aria-label={revealed ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
            title={revealed ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-control text-secondary transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out-soft)] hover:text-content focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}

        {trailingIcon && !canReveal && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
          >
            {trailingIcon}
          </span>
        )}
      </div>

      {hint && !hasError && (
        <p
          id={hintId}
          className="mt-1 text-xs text-secondary dark:text-secondary"
        >
          {hint}
        </p>
      )}

      {hasError && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-1 text-xs text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
