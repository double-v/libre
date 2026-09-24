'use client';

import { useState } from 'react';

/**
 * PhotoMetadataPanel — rattrapage des métadonnées photo (#441), côté admin.
 *
 * Les photos téléversées avant #441 peuvent encore porter la position GPS de
 * leur prise de vue. La route avance par lots (durée d'une fonction
 * serverless) ; ce panneau enchaîne les lots jusqu'au dernier pour qu'un seul
 * clic suffise. Rejouable : une photo déjà propre n'est pas réécrite.
 */
interface Lot {
  profils: number;
  nettoyees: number;
  propres: number;
  erreurs: number;
  curseur: string | null;
}

type Cumul = Omit<Lot, 'curseur'>;

const VIDE: Cumul = { profils: 0, nettoyees: 0, propres: 0, erreurs: 0 };

export default function PhotoMetadataPanel() {
  const [busy, setBusy] = useState(false);
  const [cumul, setCumul] = useState<Cumul | null>(null);
  const [fini, setFini] = useState(false);
  const [erreur, setErreur] = useState('');

  async function lancer() {
    if (busy) return;
    setBusy(true);
    setFini(false);
    setErreur('');
    let total = VIDE;
    setCumul(total);
    let curseur: string | null = null;
    try {
      do {
        const r = await fetch('/api/admin/photos/metadonnees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curseur }),
        });
        if (!r.ok) throw new Error(String(r.status));
        const lot = (await r.json()) as Lot;
        total = {
          profils: total.profils + lot.profils,
          nettoyees: total.nettoyees + lot.nettoyees,
          propres: total.propres + lot.propres,
          erreurs: total.erreurs + lot.erreurs,
        };
        setCumul(total);
        curseur = lot.curseur;
      } while (curseur);
      setFini(true);
    } catch {
      setErreur('Rattrapage interrompu. Relance-le : les photos déjà nettoyées ne seront pas retraitées.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-content">Métadonnées des photos</h2>
          <p className="mt-1 text-sm text-muted">
            Depuis #441, toute photo est stockée sans métadonnées (position GPS, appareil, heure).
            Celles d’avant peuvent encore en porter : ce rattrapage les réécrit une à une.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void lancer()}
          disabled={busy}
          className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
        >
          {busy ? 'Nettoyage en cours…' : 'Nettoyer les photos existantes'}
        </button>
      </div>
      {cumul && (
        <p role="status" className="mt-3 text-sm text-muted">
          {fini ? 'Terminé — ' : ''}
          {cumul.profils} profils · {cumul.nettoyees} photos nettoyées · {cumul.propres} déjà propres
          {cumul.erreurs > 0 && <span className="text-error"> · {cumul.erreurs} en échec</span>}
        </p>
      )}
      {erreur && <p role="alert" className="mt-3 text-sm text-error">{erreur}</p>}
    </section>
  );
}
