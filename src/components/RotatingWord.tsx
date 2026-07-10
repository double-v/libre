'use client';

import { useEffect, useState } from 'react';

interface RotatingWordProps {
  /** Mots à faire défiler ; le premier est rendu côté serveur (SSR stable). */
  words: string[];
  /** Cadence de rotation en ms. */
  intervalMs?: number;
  className?: string;
}

/**
 * Mot qui défile dans l'accroche de la home (« Rencontrer devrait pas coûter
 * … »). Crossfade discret, jamais clignotant (cf. anti-références PRODUCT.md).
 *
 * Accessibilité : pas d'`aria-live` — le lecteur d'écran lit le <h1> une fois
 * avec le premier mot (phrase cohérente), les rotations suivantes ne le
 * dérangent pas. Sous `prefers-reduced-motion`, on n'auto-actualise pas le
 * contenu (WCAG 2.2.2) : le mot reste figé sur le premier.
 */
export default function RotatingWord({ words, intervalMs = 2800, className = '' }: RotatingWordProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [words, intervalMs]);

  // key={index} → le span est remonté à chaque changement, ce qui relance
  // l'animation word-in (crossfade).
  return (
    <span key={index} className={`animate-word-in ${className}`}>
      {words[index]}
    </span>
  );
}
