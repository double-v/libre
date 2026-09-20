'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button, { buttonClassName } from '@/components/ui/Button';
import HeartMark from '@/components/ui/HeartMark';
import { NUDGE_COPY, type MissingKind } from '@/lib/onboarding';

/**
 * Carte de relance (spec 005, DESIGN.md « Carte de relance ») : première
 * cellule de « Pour toi » quand il manque au profil une photo, un type de
 * relation ou une position. Même silhouette que `ProfileCard`, fond `sunken`
 * sans photo. Elle parle du profil de la personne, et d'elle seule — la copie
 * vit dans `NUDGE_COPY`, gardée sans chiffre ni référence aux autres.
 */
export interface ProfileNudgeCardProps {
  kind: MissingKind;
  onDismiss: () => void;
}

export default function ProfileNudgeCard({ kind, onDismiss }: ProfileNudgeCardProps) {
  const copy = NUDGE_COPY[kind];
  return (
    <Card as="article" variant="media" aria-label="Compléter ton profil" className="flex h-full flex-col">
      {/* Prend la hauteur libre quand la rangée est haute (photos voisines) :
          une zone douce, pas un trou blanc. */}
      <div className="flex min-h-[88px] flex-1 items-center justify-center bg-sunken px-4 py-5">
        <HeartMark className="h-9 w-9 text-coral" aria-hidden="true" />
      </div>
      <div className="flex flex-col px-4 pb-4 pt-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ton profil</p>
        <h3 className="mt-1 text-lg font-semibold text-content">{copy.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{copy.body}</p>
        {/* Empilées : à trois colonnes, deux libellés sur une ligne se coupent. */}
        <div className="mt-auto flex flex-col gap-1.5 pt-3.5">
          <Link href={copy.href} className={buttonClassName('primary', 'md', 'w-full')}>
            {copy.cta}
          </Link>
          <Button type="button" variant="ghost" fullWidth onClick={onDismiss}>
            Plus tard
          </Button>
        </div>
      </div>
    </Card>
  );
}
