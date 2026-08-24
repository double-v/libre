'use client';

import { useState, useEffect } from 'react';

import { formatCountdown, msUntilNextReset } from '@/lib/square/reset-clock';

export interface ThemeInfo {
  themeId: string;
  label: string;
  description: string;
  inputType: string;
  placeholder: string;
  maxLength: number;
  allowFreeText: boolean;
  options: string[] | null;
  pseudonymNames?: string[] | null;
}

/**
 * Ce qu'on sait réellement compter (#358).
 *
 * Le canvas dessine « 7 personnes sur la Place ». Aucune API ne mesure une
 * présence : ni heartbeat, ni suivi des connexions SSE. Annoncer un nombre de
 * présents serait une promesse d'interface que rien n'adosse — le mode d'échec
 * de #328. On compte donc les voix distinctes entendues depuis la réouverture,
 * ce que le fil déjà chargé permet de dériver sans un appel de plus.
 */
function ligneDePresence(voices: number): string {
  if (voices <= 0) return "Personne n'a encore parlé";
  return `${voices} voix depuis la réouverture`;
}

/**
 * Bandeau du jour de La Place — le reset y est un rituel annoncé (#358).
 *
 * Avant : quatre lignes de 12-14px, dont un compte à rebours en dernière
 * position. On ne voyait l'effacement qu'après coup, en revenant sur une Place
 * vide. Le canvas `LaPlace.dc.html` renverse la page — thème du jour en titre,
 * rebours dans son propre encart — pour que la disparition soit attendue plutôt
 * que subie.
 *
 * Le panneau vitré passe par `.panel-glass` et les tokens sémantiques de #282,
 * jamais par les classes `.lobby-*` : c'est le *langage* visuel de la home qui
 * est partagé, pas son ambiance, qui reste confinée à la home
 * (`lobby-confinement.test.ts`).
 *
 * Aucune animation ici, volontairement : les halos sont des dégradés statiques.
 * Un panneau qui respire au-dessus d'un fil qu'on lit se paierait en
 * `prefers-reduced-motion` pour rien.
 */
export default function SquareThemeBanner({
  theme,
  pseudonym,
  voices = 0,
}: {
  theme: ThemeInfo | null;
  pseudonym: string;
  /** Voix distinctes entendues depuis la réouverture — cf. `ligneDePresence`. */
  voices?: number;
}) {
  const [countdown, setCountdown] = useState(() => msUntilNextReset());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(msUntilNextReset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      // Le bandeau tient toute la largeur du conteneur (#348) — c'est le fil,
      // en dessous, qui garde la colonne de lecture. Le rituel a droit à la
      // page ; les messages, eux, restent lisibles.
      className="panel-glass relative shrink-0 overflow-hidden px-5 py-6 sm:px-8 sm:py-7"
      aria-label="Le jour sur La Place"
    >
      {/* Halos d'ambiance — décor pur, retiré du flux d'accessibilité. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-20 h-72 w-72 rounded-full bg-coral/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-gold/15 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.625rem] font-semibold tracking-[0.06em] text-gold uppercase">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z" />
            </svg>
            Thème du jour
          </span>

          {theme ? (
            <>
              <h1 className="mt-4 font-head text-3xl leading-tight font-bold tracking-tight text-content md:text-4xl">
                {theme.label}
              </h1>
              <p className="mt-3 max-w-prose text-base leading-relaxed text-muted">
                {theme.description}
              </p>
            </>
          ) : (
            <p className="mt-4 text-base text-muted">Chargement du thème…</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-coral-light/40 bg-coral/15 font-head text-base font-semibold text-coral"
              >
                {pseudonym.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.625rem] tracking-[0.05em] text-muted uppercase">
                  Tu es
                </span>
                <span className="block truncate font-head text-lg font-semibold text-content">
                  {pseudonym}
                </span>
              </span>
            </div>

            <span aria-hidden="true" className="hidden h-10 w-px bg-hairline sm:block" />

            <p className="text-sm text-muted">{ligneDePresence(voices)}</p>
          </div>
        </div>

        {/* L'encart qui fait du reset un rituel affiché, pas une disparition subie. */}
        <div className="shrink-0 rounded-card border border-hairline bg-surface/50 px-5 py-5 text-center md:w-52">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
            className="mx-auto mb-2.5 text-gold"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <p className="font-head text-3xl font-bold tracking-tight text-content tabular-nums">
            {formatCountdown(countdown)}
          </p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
            avant que tout s&apos;efface et qu&apos;un nouveau thème arrive
          </p>
        </div>
      </div>
    </section>
  );
}
