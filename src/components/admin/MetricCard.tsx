'use client';

import Card from '@/components/ui/Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  /** Brève explication ou unité affichée sous la valeur. */
  subtitle?: string;
  /** Variante de couleur pour l’accent en haut de la carte. */
  accent?: 'coral' | 'gold' | 'success' | 'muted';
}

const accentClasses = {
  coral: 'bg-coral',
  gold: 'bg-gold',
  success: 'bg-success',
  muted: 'bg-muted',
};

/**
 * Petite carte chiffre-clé pour le dashboard admin.
 *
 * Réutilise le composant `Card` du DS et les tokens sémantiques ;
 * la barre colorée en haut permet de différencier visuellement les familles
 * d’indicateurs sans valeur inline.
 */
export default function MetricCard({ label, value, subtitle, accent = 'coral' }: MetricCardProps) {
  return (
    <Card variant="profile" className="relative overflow-hidden">
      <div className={`absolute left-0 top-0 h-1 w-full ${accentClasses[accent]}`} />
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold text-content">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      )}
    </Card>
  );
}
