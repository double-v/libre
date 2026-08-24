'use client';

import { useState } from 'react';

import Button from '@/components/ui/Button';

interface GridFillerCardsProps {
  /** Profils réels déjà rendus dans la grille — sert à compléter la rangée. */
  realCount: number;
  /** Colonnes de la grille au plus large (desktop). */
  columns?: number;
}

/**
 * Combien de vignettes d'attente il faut pour que la dernière rangée tombe
 * juste, la carte de parrainage comprise (elle occupe une cellule).
 *
 * Le compte est donc borné par la géométrie : jamais plus de `columns - 1`
 * vignettes factices, quel que soit le nombre de profils réels. C'est ce qui
 * empêche le remplissage de virer au mensonge sur la taille de la base.
 */
export function fillerCount(realCount: number, columns = 3): number {
  if (columns < 2) return 0;
  return (columns - ((realCount + 1) % columns)) % columns;
}

const WAITING_LINES = [
  'Quelqu’un s’inscrira ici. Peut-être aujourd’hui.',
  'Le site a ouvert il y a peu.',
  'Une place qui attend sa personne.',
];

function WaitingCard({ line, delayMs }: { line: string; delayMs: number }) {
  return (
    // `aria-hidden` : au lecteur d'écran, ces vignettes ne sont pas des
    // personnes — les annoncer gonflerait la liste de faux profils.
    <div
      aria-hidden="true"
      className="animate-fade-in overflow-hidden rounded-card border-2 border-dashed border-hairline-strong"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex aspect-[6/5] flex-col items-center justify-center gap-3 p-5 text-center md:aspect-[4/5]">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-hairline-strong">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <p className="text-sm font-medium text-muted">Une place libre</p>
        <p className="text-xs leading-relaxed text-muted">{line}</p>
      </div>
      {/* Deux barres muettes à la place du texte : la vignette garde la
          silhouette d'une carte de profil sans en imiter le contenu. */}
      <div className="border-t-2 border-dashed border-hairline-strong p-4">
        <div className="h-2.5 w-1/2 rounded-full bg-fill-subtle" />
        <div className="mt-2 h-2.5 w-4/5 rounded-full bg-fill-subtle" />
      </div>
    </div>
  );
}

/**
 * Fin de grille de Découvrir (#348) : les vignettes d'attente complètent la
 * dernière rangée, puis **une seule** carte de parrainage la referme.
 *
 * Ce composant ne s'affiche qu'au bout du feed — tant qu'il reste une page à
 * charger, une « place libre » mentirait sur ce qui vient après. Il rend des
 * cellules nues : c'est la grille du parent qui pose largeur et gouttières.
 */
export default function GridFillerCards({ realCount, columns = 3 }: GridFillerCardsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/register?ref=empty`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const waiting = fillerCount(realCount, columns);
  // La règle complète la rangée de 3 ; à 2 colonnes, la parité peut laisser la
  // carte de parrainage seule en fin de grille. Elle prend alors toute la
  // rangée plutôt que de flotter à gauche.
  const seuleSurDeuxColonnes = (realCount + waiting) % 2 === 0;

  return (
    <>
      {Array.from({ length: waiting }, (_, i) => (
        <WaitingCard key={i} line={WAITING_LINES[i % WAITING_LINES.length]} delayMs={i * 100} />
      ))}

      <div
        className={`animate-fade-in flex flex-col justify-center gap-3 rounded-card border-2 border-coral/35 bg-blush p-6 text-center dark:border-coral/30 dark:bg-coral/10 ${
          seuleSurDeuxColonnes ? 'md:col-span-2 lg:col-span-1' : ''
        }`}
        style={{ animationDelay: `${waiting * 100}ms` }}
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral/15">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-coral dark:text-coral-light">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </span>
        <p className="text-lg font-semibold text-coral-dark dark:text-coral-light">Fais tourner</p>
        <p className="text-sm leading-relaxed text-muted">
          Le meilleur moyen de remplir cette page, c&apos;est d&apos;en parler à
          quelqu&apos;un qui cherche aussi.
        </p>
        <Button type="button" onClick={handleShare} className="mx-auto mt-1">
          {copied ? '✓ Copié !' : 'Copier le lien'}
        </Button>
      </div>
    </>
  );
}
