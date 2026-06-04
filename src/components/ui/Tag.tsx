'use client';

import type { HTMLAttributes, ReactNode } from 'react';

export type TagVariant =
  | 'default' // intérêts : gray neutre
  | 'selected' // filtre actif : coral plein
  | 'accent' // practices, etc. : sand/coral
  | 'verified' // badge vérification : bleu
  | 'online' // indicateur "en ligne" : vert
  | 'beta'; // bannière bêta : warning ambre

export type TagSize = 'sm' | 'md';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  size?: TagSize;
  children: ReactNode;
}

const baseClasses =
  'inline-flex items-center rounded-full font-medium whitespace-nowrap';

const sizeClasses: Record<TagSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

const variantClasses: Record<TagVariant, string> = {
  default:
    'bg-gray-100 text-gray-700 dark:bg-dark-elevated dark:text-gray-300',
  selected:
    'bg-coral text-white dark:bg-coral dark:text-white',
  accent:
    'bg-sand text-coral-dark dark:bg-coral/20 dark:text-coral-light',
  verified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  online: 'bg-success text-white',
  beta: 'bg-warning text-ink',
};

/**
 * Tag — composant UI partagé du Design System Libre.
 *
 * Variantes : default, selected, accent, verified, online, beta.
 * Tailles : sm (12px), md (14px).
 * Forme : pill (rounded-full), non-interactive par défaut.
 *
 * Si tu as besoin d'un tag cliquable (filtre), wraps-le dans un <button>
 * et passe variant="selected" pour l'état actif. Un composant FilterChip
 * dédié pourrait être ajouté plus tard si le besoin se confirme.
 *
 * Pour les indicateurs d'état à fort contraste (online, beta), préfère
 * toujours cette variante plutôt que d'inventer des couleurs inline.
 */
export default function Tag({
  variant = 'default',
  size = 'sm',
  className,
  children,
  ...rest
}: TagProps) {
  const classes = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
