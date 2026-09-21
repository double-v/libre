'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * RetentionPanel — la purge de rétention (#427), côté admin.
 *
 * La purge tourne par le trafic ; ce panneau est là pour deux choses : voir
 * qu'elle a tourné (quand, avec quel bilan) et la lancer à la main quand ce
 * n'est pas le cas. Rien d'autre : les durées se changent dans le code
 * (`regles.ts`), parce que la politique de confidentialité les promet.
 */
export interface EtatRetention {
  lastRunAt: string | null;
  lastReport: Record<string, number | { erreur: string }> | null;
  enRetard: boolean;
  regles: Array<{ id: string; donnees: string; duree: string }>;
}

const fmtDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function RetentionPanel() {
  const [etat, setEtat] = useState<EtatRetention | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async (init?: RequestInit) => {
    const r = await fetch('/api/admin/retention', init);
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as EtatRetention;
  }, []);

  useEffect(() => {
    let annule = false;
    charger()
      .then((e) => { if (!annule) setEtat(e); })
      .catch(() => { if (!annule) setErreur('Impossible de lire l’état de la purge.'); });
    return () => { annule = true; };
  }, [charger]);

  async function lancer() {
    if (busy) return;
    setBusy(true);
    setErreur('');
    try {
      setEtat(await charger({ method: 'POST' }));
    } catch {
      setErreur('La purge n’a pas pu être lancée.');
    } finally {
      setBusy(false);
    }
  }

  if (!etat) return erreur ? <p role="alert" className="text-sm text-error">{erreur}</p> : <p className="text-sm text-muted">Chargement…</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-content">Dernier passage</h2>
            <p className="mt-1 text-sm text-muted">
              {etat.lastRunAt ? fmtDate.format(new Date(etat.lastRunAt)) : 'La purge n’a encore jamais tourné.'}
            </p>
            <p role="status" className={`mt-1 text-sm ${etat.enRetard ? 'text-error' : 'text-muted'}`}>
              {!etat.enRetard
                ? 'À jour — déclenchée par le trafic, une fois par jour.'
                : Object.values(etat.lastReport ?? {}).some((v) => typeof v === 'object')
                  ? 'En retard : le dernier passage a laissé des règles en échec (voir le bilan). Relance ici, et regarde les journaux si ça persiste.'
                  : 'En retard : aucun passage depuis plus de 48 h. La purge se déclenche par les visites ; sans trafic, lance-la ici.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void lancer()}
            disabled={busy}
            className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
          >
            {busy ? 'Purge en cours…' : 'Lancer la purge maintenant'}
          </button>
        </div>
        {erreur && <p role="alert" className="mt-3 text-sm text-error">{erreur}</p>}
      </section>

      <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-content">Règles et bilan</h2>
        <p className="mt-1 text-sm text-muted">
          Les durées sont celles de la politique de confidentialité (§5) : même liste, même code.
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-1.5 pr-3 font-semibold">Données</th>
              <th className="py-1.5 pr-3 font-semibold">Durée</th>
              <th className="py-1.5 text-right font-semibold">Dernier bilan</th>
            </tr>
          </thead>
          <tbody>
            {etat.regles.map((r) => {
              const b = etat.lastReport?.[r.id];
              return (
                <tr key={r.id} className="border-t border-hairline">
                  <td className="py-2 pr-3 text-content">{r.donnees}</td>
                  <td className="py-2 pr-3 text-muted">{r.duree}</td>
                  <td className="py-2 text-right tabular-nums">
                    {b === undefined ? <span className="text-muted">—</span>
                      : typeof b === 'number' ? <span className="text-content">{b}</span>
                      : <span className="text-error">échec : {b.erreur}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
