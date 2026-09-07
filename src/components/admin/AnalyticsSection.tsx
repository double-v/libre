'use client';

import type { ReactNode } from 'react';

interface AnalyticsSectionProps {
  title: string;
  children: ReactNode;
}

/**
 * Section du dashboard admin : titre + grille de contenu.
 *
 * La grille est fluide : 1 colonne sur mobile, 2 sur tablette, 3 sur desktop.
 */
export default function AnalyticsSection({ title, children }: AnalyticsSectionProps) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-content">{title}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}
