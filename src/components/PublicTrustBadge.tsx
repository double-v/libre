'use client';

/**
 * PublicTrustBadge — wrapper de TrustBadge qui applique la logique anti-stalk.
 *
 * Cf. chantier 01 — Phase 3, tâche 3.6.
 *
 * Le band effectivement affiché = publicBand(viewerBand, targetBand).
 * Si le targetBand est `null` (pas chargé / pas dispo côté API), on
 * affiche `newcomer` (= comportement safe par défaut).
 */
import { TrustBadge, type TrustBadgeSize } from './TrustBadge';
import { publicBand } from '@/lib/trust/visibility';
import type { TrustBand } from '@/lib/trust/compute-level';

export interface PublicTrustBadgeProps {
  /** Band de l'utilisateur qui regarde. Requis (sinon fallback newcomer). */
  viewerBand: TrustBand | null;
  /** Band de l'utilisateur affiché. Null = pas chargé. */
  targetBand: TrustBand | null;
  size?: TrustBadgeSize;
  showLabel?: boolean;
}

export function PublicTrustBadge({
  viewerBand,
  targetBand,
  size = 'sm',
  showLabel = false,
}: PublicTrustBadgeProps) {
  const effective = publicBand(viewerBand ?? 'newcomer', targetBand);
  return (
    <TrustBadge band={effective} size={size} showLabel={showLabel} />
  );
}
