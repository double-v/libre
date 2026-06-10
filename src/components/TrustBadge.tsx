'use client';

/**
 * TrustBadge — halo coral progressif selon le band de confiance.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md (tâche 3.3).
 *
 * Affichage : un anneau (et éventuellement une icône) autour d'un enfant
 * (typiquement un <Avatar />). Le composant ne gère PAS l'avatar lui-même —
 * il le wrap. C'est un overlay.
 *
 * Respect des contraintes :
 * - Pas de gris neutre : halo **toujours** coral (intensité variable)
 * - prefers-reduced-motion : le globals.css force animation-duration à 80ms
 *   pour tout `*`, donc le pulsant anchor est automatiquement neutralisé.
 *   On n'a pas besoin de logique JS additionnelle.
 * - A11y : role="img" + aria-label descriptif (« Niveau de confiance : Membre »)
 */
import { type ReactNode } from 'react';
import type { TrustBand } from '@/lib/trust/compute-level';

export type TrustBadgeSize = 'sm' | 'md' | 'lg';

export interface TrustBadgeProps {
  band: TrustBand;
  size?: TrustBadgeSize;
  /** Si true, affiche un label texte à côté du halo (« Membre », « Ancre »). */
  showLabel?: boolean;
  /** L'élément à wrapper (avatar, etc.). Optionnel — un TrustBadge peut s'utiliser seul (halo vide). */
  children?: ReactNode;
  /** Classes additionnelles sur le wrapper. */
  className?: string;
}

const SIZE_PX: Record<TrustBadgeSize, number> = {
  sm: 32,
  md: 48,
  lg: 80,
};

const LABEL_FR: Record<TrustBand, string> = {
  newcomer: 'Nouveau',
  member: 'Membre',
  trusted: 'Fiable',
  anchor: 'Ancre',
};

const ARIA_FR: Record<TrustBand, string> = {
  newcomer: 'Niveau de confiance : Nouveau',
  member: 'Niveau de confiance : Membre',
  trusted: 'Niveau de confiance : Fiable',
  anchor: 'Niveau de confiance : Ancre',
};

/**
 * Variantes visuelles. Les couleurs coral-* sont des tokens Tailwind du DESIGN.md.
 * L'opacité module l'intensité perçue du halo (50% → 70% → 90% → 100%).
 */
const VARIANT_CLASS: Record<TrustBand, string> = {
  // newcomer : pas de halo, on laisse passer l'enfant tel quel
  newcomer: '',
  // member : anneau 1px coral 50%
  member: 'ring-1 ring-coral/50',
  // trusted : anneau 2px coral + icône check en bas-droite
  trusted: 'ring-2 ring-coral ring-offset-2 ring-offset-white',
  // anchor : anneau 3px coral + pulse + icône cœur-soleil centrale
  // Note : on utilise animate-pulse natif. Le globals.css neutralise cette
  // animation si prefers-reduced-motion: reduce (cf. commentaire header).
  anchor: 'ring-[3px] ring-coral ring-offset-2 ring-offset-white animate-pulse',
};

export function TrustBadge({
  band,
  size = 'md',
  showLabel = false,
  children,
  className = '',
}: TrustBadgeProps) {
  const dim = SIZE_PX[size];
  const variantClass = VARIANT_CLASS[band];

  return (
    <div
      className={`relative inline-flex flex-col items-center gap-1 ${className}`}
      role="img"
      aria-label={ARIA_FR[band]}
    >
      <div
        className={`relative rounded-full inline-block ${variantClass}`}
        style={{ width: dim, height: dim }}
      >
        {children}

        {/* trusted : petite icône check en bas-droite */}
        {band === 'trusted' && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-coral text-white text-xs shadow-soft"
          >
            ✓
          </span>
        )}

        {/* anchor : icône cœur-soleil centrale (overlay sur l'avatar) */}
        {band === 'anchor' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            {/* Cœur-soleil simplifié : 4 rayons coral + cœur blanc au centre */}
            <svg
              width={dim * 0.4}
              height={dim * 0.4}
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 21s-7-4.5-9.5-9C.5 7 4 3 8 3c2 0 3.5 1 4 2 0.5-1 2-2 4-2 4 0 7.5 4 5.5 9C19 16.5 12 21 12 21z"
                fill="#E8634A"
              />
            </svg>
          </span>
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-medium text-coral-dark">
          {LABEL_FR[band]}
        </span>
      )}
    </div>
  );
}

/**
 * Export utilitaire : la liste ordonnée des bands (pour les tests ou les selects).
 */
export const TRUST_BANDS_ORDERED: readonly TrustBand[] = [
  'newcomer',
  'member',
  'trusted',
  'anchor',
] as const;
