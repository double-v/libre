'use client';

import { useCallback, useEffect, useState } from 'react';
import { FEATURES, COPY_FEATURES, TOUTES_ACTIVEES, type Feature, type Features } from '@/lib/features';

/**
 * FeatureSwitches — les interrupteurs de fonctionnalités (#418), côté admin.
 *
 * Un coupe-feu doit être bête et rapide : trois lignes, un switch par ligne,
 * effet au clic. L'état est optimiste puis confirmé par la réponse ; en cas
 * de refus il revient, et on le dit. Même motif de switch que « Mode
 * invisible » et `PushSettings`.
 */
export default function FeatureSwitches() {
  const [features, setFeatures] = useState<Features | null>(null);
  const [busy, setBusy] = useState<Feature | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let annule = false;
    fetch('/api/admin/features')
      .then(async (r) => (r.ok ? ((await r.json()) as Features) : TOUTES_ACTIVEES))
      .catch(() => TOUTES_ACTIVEES)
      .then((f) => {
        if (!annule) setFeatures(f);
      });
    return () => {
      annule = true;
    };
  }, []);

  const basculer = useCallback(
    async (feature: Feature) => {
      if (!features || busy) return;
      const avant = features;
      const apres = { ...features, [feature]: !features[feature] };
      setFeatures(apres);
      setBusy(feature);
      setErreur('');
      try {
        const res = await fetch('/api/admin/features', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apres),
        });
        if (!res.ok) throw new Error(String(res.status));
        setFeatures((await res.json()) as Features);
      } catch {
        setFeatures(avant);
        setErreur('Impossible d’enregistrer ce changement. Réessaie dans un instant.');
      } finally {
        setBusy(null);
      }
    },
    [features, busy],
  );

  return (
    <div className="space-y-3">
      {FEATURES.map((feature) => {
        const on = features?.[feature] ?? true;
        const titreId = `feature-${feature}-titre`;
        return (
          <section key={feature} className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id={titreId} className="text-lg font-semibold text-content">
                  {COPY_FEATURES[feature].libelle}
                </h2>
                <p className="mt-1 text-sm text-muted">{COPY_FEATURES[feature].effet}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-labelledby={titreId}
                disabled={features === null || busy !== null}
                onClick={() => basculer(feature)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 motion-reduce:transition-none ${
                  on ? 'bg-coral' : 'bg-fill-subtle'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out motion-reduce:transition-none ${
                    on ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>
        );
      })}
      {erreur && (
        <p role="alert" className="text-sm text-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
