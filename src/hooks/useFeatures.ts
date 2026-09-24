'use client';

import { useEffect, useState } from 'react';
import { FEATURES, DEFAUTS, type Features } from '@/lib/features';

/**
 * Interrupteurs de fonctionnalités côté app (#418).
 *
 * Valeur de départ = les défauts tant que la réponse n'est pas là : la nav ne
 * doit pas clignoter à chaque montage, et s'écarter du défaut est l'exception. Une seule
 * requête par chargement de page, partagée entre les composants (nav du haut,
 * barre du bas, page) grâce au cache de module ; les 30 s couvrent les
 * navigations client sans rendre un geste admin invisible longtemps.
 */
const TTL_MS = 30_000;
let cache: { features: Features; expire: number } | null = null;
let enCours: Promise<Features> | null = null;

/**
 * Une réponse partielle ou malformée ne déplace rien : seul un booléen
 * **contraire au défaut** compte — `false` pour couper, `true` pour allumer
 * une fonctionnalité coupée par défaut (spec 007).
 */
function normaliser(body: unknown): Features {
  const f = { ...DEFAUTS };
  if (body && typeof body === 'object') {
    for (const k of FEATURES) if ((body as Record<string, unknown>)[k] === !DEFAUTS[k]) f[k] = !DEFAUTS[k];
  }
  return f;
}

async function charger(): Promise<Features> {
  if (cache && cache.expire > Date.now()) return cache.features;
  if (!enCours) {
    enCours = fetch('/api/features')
      .then(async (res) => (res.ok ? normaliser(await res.json()) : DEFAUTS))
      .catch(() => DEFAUTS)
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
  const [features, setFeatures] = useState<Features>(() => cache?.features ?? DEFAUTS);
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
