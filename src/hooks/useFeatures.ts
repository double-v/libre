'use client';

import { useEffect, useState } from 'react';
import { FEATURES, TOUTES_ACTIVEES, type Features } from '@/lib/features';

/**
 * Interrupteurs de fonctionnalités côté app (#418).
 *
 * Valeur optimiste « tout activé » tant que la réponse n'est pas là : la nav
 * ne doit pas clignoter à chaque montage, et couper est l'exception. Une seule
 * requête par chargement de page, partagée entre les composants (nav du haut,
 * barre du bas, page) grâce au cache de module ; les 30 s couvrent les
 * navigations client sans rendre un geste admin invisible longtemps.
 */
const TTL_MS = 30_000;
let cache: { features: Features; expire: number } | null = null;
let enCours: Promise<Features> | null = null;

/** Une réponse partielle ou malformée ne coupe rien : seul un `false` explicite compte. */
function normaliser(body: unknown): Features {
  const f = { ...TOUTES_ACTIVEES };
  if (body && typeof body === 'object') {
    for (const k of FEATURES) if ((body as Record<string, unknown>)[k] === false) f[k] = false;
  }
  return f;
}

async function charger(): Promise<Features> {
  if (cache && cache.expire > Date.now()) return cache.features;
  if (!enCours) {
    enCours = fetch('/api/features')
      .then(async (res) => (res.ok ? normaliser(await res.json()) : TOUTES_ACTIVEES))
      .catch(() => TOUTES_ACTIVEES)
      .then((features) => {
        cache = { features, expire: Date.now() + TTL_MS };
        enCours = null;
        return features;
      });
  }
  return enCours;
}

/** Réservé aux tests. */
export function _resetFeaturesCache(): void {
  cache = null;
  enCours = null;
}

export function useFeatures(): Features {
  const [features, setFeatures] = useState<Features>(() => cache?.features ?? TOUTES_ACTIVEES);
  useEffect(() => {
    let annule = false;
    void charger().then((f) => {
      if (!annule) setFeatures(f);
    });
    return () => {
      annule = true;
    };
  }, []);
  return features;
}
