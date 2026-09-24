import Link from 'next/link';
import type { ReactNode } from 'react';
import Prose from '@/components/ui/Prose';
import { analyser, type EnLigne } from '@/lib/journal/texte';

/**
 * Corps d'une publication du journal (spec 007, R2), rendu à l'identique sur
 * la page publique et dans l'aperçu admin (FR-010).
 *
 * Tout passe par l'arbre typé de `analyser()` : React échappe chaque texte,
 * aucun balisage saisi ne peut s'exécuter. Composant sans état ni hook, donc
 * utilisable côté serveur (page statique) comme côté client (aperçu).
 */
const LIEN = 'text-coral underline underline-offset-2 hover:text-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-coral dark:text-coral-light';

function enLigne(noeuds: EnLigne[]): ReactNode[] {
  return noeuds.map((n, i) => {
    switch (n.type) {
      case 'texte':
        return n.valeur;
      case 'gras':
        return <strong key={i} className="font-semibold">{enLigne(n.enfants)}</strong>;
      case 'italique':
        return <em key={i}>{enLigne(n.enfants)}</em>;
      case 'lien':
        return n.externe ? (
          <a key={i} href={n.url} target="_blank" rel="noopener noreferrer nofollow" className={LIEN}>
            {enLigne(n.enfants)}
            <span aria-hidden="true"> ↗</span>
          </a>
        ) : (
          <Link key={i} href={n.url} className={LIEN}>{enLigne(n.enfants)}</Link>
        );
    }
  });
}

export default function TexteJournal({ corps }: { corps: string }) {
  return (
    <Prose>
      {analyser(corps).map((bloc, i) => {
        if (bloc.type === 'paragraphe') return <p key={i}>{enLigne(bloc.enfants)}</p>;
        const Liste = bloc.ordonnee ? 'ol' : 'ul';
        return (
          <Liste key={i} className={`mb-5 space-y-1.5 pl-6 marker:text-muted ${bloc.ordonnee ? 'list-decimal' : 'list-disc'}`}>
            {bloc.items.map((item, j) => <li key={j}>{enLigne(item)}</li>)}
          </Liste>
        );
      })}
    </Prose>
  );
}
