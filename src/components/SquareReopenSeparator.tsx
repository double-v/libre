'use client';

import { formatReopenClock } from '@/lib/square/reset-clock';

/**
 * Jalon de réouverture en tête du fil de La Place (#358).
 *
 * Le fil repart de zéro chaque jour, et rien ne le disait : on tombait sur des
 * messages sans savoir qu'ils dataient tous d'après la purge. Le jalon rend la
 * coupure lisible — y compris, et surtout, quand la Place est encore vide :
 * « rien depuis 04:00 » informe, « rien » n'informe pas.
 *
 * L'heure est celle de la borne réellement appliquée par le serveur
 * (`lastResetBoundary`), lue dans le fuseau du lecteur. Le canvas écrit
 * « à minuit » ; la borne est à 2h UTC. C'est le canvas qui a tort — afficher
 * son texte reconduirait le mensonge que #13 a corrigé en base.
 *
 * `role="separator"` plutôt qu'un paragraphe : c'est un jalon de temps, pas une
 * prise de parole de plus dans le fil.
 */
export default function SquareReopenSeparator() {
  return (
    <div
      role="separator"
      aria-label={`La Place a rouvert à ${formatReopenClock()}`}
      className="mb-4 flex justify-center"
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-[0.8125rem] text-gold">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        La Place a rouvert à {formatReopenClock()}
      </span>
    </div>
  );
}
