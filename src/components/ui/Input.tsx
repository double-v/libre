'use client';

import { forwardRef, useId } from 'react';
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
  /** Number of visible rows when multiline. Defaults to 4. */
  rows?: number;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-9 text-sm',
  md: 'h-11 text-sm', // 44px touch target (WCAG 2.5.5)
};

const baseFieldClasses =
  'block w-full rounded-md border bg-white text-ink shadow-sm ' +
  'placeholder:text-placeholder placeholder:italic ' +
  'transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out-soft)] ' +
  'focus:outline-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'dark:bg-dark-surface dark:text-foreground';

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
    rows = 4,
    id,
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

  const stateClasses = hasError
    ? 'border-error focus:border-error focus:shadow-[0_0_0_3px_rgb(220_38_38_/_0.25)]'
    : 'border-gray-300 focus:border-coral focus:shadow-focus dark:border-dark-border dark:focus:border-coral-light';

  const paddingClasses = leadingIcon
    ? 'pl-10'
    : trailingIcon
    ? 'pr-10'
    : 'px-3';

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

        {trailingIcon && (
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
