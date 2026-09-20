'use client';

import { useState } from 'react';
import { COPY_DIAGNOSTIC, type DiagnosticCle } from '@/lib/cle-diagnostic';

/**
 * AdminUserKeyState — état de la clé de messagerie d'un compte (#341).
 *
 * Le support répondait à l'aveugle ; cette carte lui donne la seule chose
 * qu'il ait à savoir. Rien n'est chargé au montage : la consultation est
 * journalisée côté serveur (`VIEW_KEY_STATE`), elle se déclenche donc sur un
 * geste — ouvrir une fiche n'est pas consulter une clé.
 */

interface EtatCle {
  diagnostic: DiagnosticCle;
  keyCreatedAt: string | null;
  coffreGarni: boolean;
  escrowedAt: string | null;
  reinitialisations: number;
  derniereReinitialisation: string | null;
}

const TON: Record<DiagnosticCle, string> = {
  aucune: 'text-muted',
  recuperable: 'text-green-700 dark:text-green-400',
  perdue: 'text-red-700 dark:text-red-400',
};

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

export default function AdminUserKeyState({ userId }: { userId: string }) {
  const [etat, setEtat] = useState<EtatCle | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  const verifier = async () => {
    setBusy(true);
    setErreur('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/cle`);
      if (!res.ok) throw new Error(String(res.status));
      setEtat((await res.json()) as EtatCle);
    } catch {
      setErreur('Impossible de vérifier la clé pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-hairline p-4">
      <h2 className="mb-3 font-semibold text-content">Clé de messagerie</h2>
      {etat === null ? (
        <>
          <p className="mb-3 text-sm text-muted">
            État du coffre et récupérabilité — jamais la clé, jamais un message. Consultation journalisée.
          </p>
          <button
            type="button"
            onClick={verifier}
            disabled={busy}
            className="rounded-md border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-content hover:bg-fill-subtle disabled:opacity-50"
          >
            {busy ? 'Vérification…' : 'Vérifier la clé'}
          </button>
        </>
      ) : (
        <div className="space-y-3 text-sm">
          <p className={`font-semibold ${TON[etat.diagnostic]}`}>{COPY_DIAGNOSTIC[etat.diagnostic].titre}</p>
          <p className="text-muted">{COPY_DIAGNOSTIC[etat.diagnostic].conduite}</p>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt className="text-muted">Clé publique depuis</dt><dd>{date(etat.keyCreatedAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Au coffre</dt><dd>{etat.coffreGarni ? `oui, depuis le ${date(etat.escrowedAt)}` : 'non'}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted">Réinitialisations</dt>
              <dd>
                {etat.reinitialisations === 0
                  ? 'aucune'
                  : `${etat.reinitialisations} réinitialisation${etat.reinitialisations > 1 ? 's' : ''}, la dernière le ${date(etat.derniereReinitialisation)}`}
              </dd>
            </div>
          </dl>
        </div>
      )}
      {erreur && (
        <p role="alert" className="mt-2 text-sm text-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
