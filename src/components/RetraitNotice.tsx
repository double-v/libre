'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * RetraitNotice — le membre mis en retrait (spec 006, décision « Demander une
 * vérification ») l'apprend ici, et apprend surtout comment en sortir.
 *
 * Aucune mention de soupçon ni de signalement : un vrai membre peut être
 * mis en retrait par erreur, et l'humilier ferait fuir la personne qu'on
 * voulait protéger. Même DA que le bandeau de l'avenant. Il ne se ferme pas :
 * c'est un état, pas une annonce.
 */
export const COPY_RETRAIT = {
  texte: 'Ton profil est masqué le temps d’une vérification. Fais un selfie en reproduisant un geste simple : ton profil réapparaît dès qu’il est validé.',
  action: 'Me faire vérifier',
};

export default function RetraitNotice() {
  const [retrait, setRetrait] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { retrait?: boolean } | null) => {
        if (!cancelled && d?.retrait) setRetrait(true);
      })
      .catch(() => { /* sans réponse, pas de bandeau */ });
    return () => { cancelled = true; };
  }, []);

  if (!retrait) return null;

  return (
    <div role="region" aria-label="Vérification de ton profil" className="border-b border-coral/20 bg-sunken px-4 py-2 text-xs text-coral-dark dark:border-coral/30 dark:text-coral-light">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
        <span>{COPY_RETRAIT.texte}</span>
        <Link
          href="/verify"
          className="inline-flex min-h-11 items-center rounded-full bg-coral px-3 text-xs font-semibold text-white hover:bg-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          {COPY_RETRAIT.action}
        </Link>
      </div>
    </div>
  );
}
