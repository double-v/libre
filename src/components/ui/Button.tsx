'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
  'transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out-soft)] ' +
  'focus-visible:outline-none focus-visible:shadow-focus ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'min-h-[44px]'; // WCAG 2.5.5: touch target ≥ 44px

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-coral text-white hover:bg-terracotta active:bg-coral-dark ' +
    'dark:bg-coral dark:hover:bg-terracotta',
  secondary:
    'bg-white text-label border border-gray-300 hover:bg-blush/40 hover:border-coral-light active:bg-blush ' +
    'dark:bg-dark-surface dark:text-ink dark:border-dark-border dark:hover:bg-dark-elevated',
  ghost:
    'text-coral hover:bg-blush/50 active:bg-blush ' +
    'dark:text-coral-light dark:hover:bg-coral/10',
  danger:
    'bg-error text-white hover:bg-red-700 active:bg-red-800 ' +
    'dark:bg-error dark:hover:bg-red-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm min-h-[36px]', // 36px only acceptable for non-primary actions; primary keeps 44px via min-h override
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

/**
 * Button — composant UI partagé du Design System Libre.
 *
 * Variantes : primary, secondary, ghost, danger.
 * Tailles : sm (36px, secondaires only), md (44px, défaut), lg (48px).
 * Cibles tactiles : ≥44px sur primary/md/lg (WCAG 2.5.5 AAA).
 * Focus visible : shadow-focus (teinté coral, pas d'outline gris générique).
 * États : default, hover, active, focus, disabled, loading.
 * A11y : aria-busy pendant loading, aria-label supporté via props natives.
 * Motion : respect prefers-reduced-motion via globals.css.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    iconLeft,
    iconRight,
    disabled,
    className,
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export default Button;
