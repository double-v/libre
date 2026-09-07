'use client';

import Card from '@/components/ui/Card';
import type { DistributionItem } from '@/lib/admin-analytics';

interface DistributionBarProps {
  title: string;
  items: DistributionItem[];
  /** Message affiché quand la distribution est vide. */
  emptyLabel?: string;
}

/**
 * Histogramme horizontal en barres CSS pures.
 *
 * Aucune librairie de graphiques : la largeur est pilotée par inline-style,
 * la couleur et les espacements par les tokens Tailwind v4.
 * L’animation est coupée si l’utilisateur demande `prefers-reduced-motion`.
 */
export default function DistributionBar({ title, items, emptyLabel = 'Pas assez de données' }: DistributionBarProps) {
  return (
    <Card variant="profile">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted italic">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.value}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-content">{item.value}</span>
                <span className="text-muted">
                  {item.count}
                  <span className="ml-1 text-xs">({item.percent}%)</span>
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-fill-subtle">
                <div
                  className="h-2 rounded-full bg-coral motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
                  style={{ width: `${Math.min(item.percent, 100)}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
