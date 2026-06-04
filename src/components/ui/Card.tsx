'use client';

import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'profile' | 'modal' | 'filter' | 'empty';

export type CardElement = 'div' | 'article' | 'section' | 'aside';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** Adds hover affordance + focus ring for clickable cards. */
  interactive?: boolean;
  /** Semantic element. Default is 'div'. Use 'article' for profile
   *  cards, 'section' for grouped content, 'aside' for sidebars. */
  as?: CardElement;
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  profile:
    'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-4 shadow-soft',
  modal:
    'bg-white dark:bg-dark-surface rounded-lg p-6 shadow-pop',
  filter:
    'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-4',
  empty:
    'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-8 text-center',
};

/**
 * Card — conteneur partagé pour absorber les patterns dupliqués
 * `rounded-xl border p-4` etc. (cf. .hermes/plans/spec-card.md).
 *
 * Variantes : profile (default), modal, filter, empty.
 * Modificateur : interactive (hover + focus visible).
 * Sémantique : as='article' | 'section' | 'aside' pour la bonne balise.
 *
 * Les tokens (bg-white, dark:bg-dark-surface, shadow-soft, etc.) sont
 * alignés avec le DS et l'audit 2026-06-04.
 */
export default function Card({
  variant = 'profile',
  interactive = false,
  as = 'div',
  className = '',
  children,
  ...rest
}: CardProps) {
  const base = variantClasses[variant];
  const hover = interactive
    ? 'cursor-pointer transition-shadow duration-[var(--motion-fast)] hover:shadow-pop focus-visible:outline-none focus-visible:shadow-focus'
    : '';
  const merged = [base, hover, className].filter(Boolean).join(' ');

  const Element = as;
  return (
    <Element className={merged} {...rest}>
      {children}
    </Element>
  );
}
