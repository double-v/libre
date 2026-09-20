'use client';

import { useCallback, useEffect, useState } from 'react';
import { generateKeyPair } from '@/lib/crypto';
import { purgerCleHeritee } from '@/hooks/useEncryptedChat';
import { toast } from '@/lib/toast';
import Button from '@/components/ui/Button';

/**
 * KeySettings — « Clé de messagerie » (#340).
 *
 * Le fil de discussion dit déjà quand une clé est perdue ; ici on offre la
 * seule réparation qui existe : une nouvelle clé, scellée au coffre dans le
 * même geste. C'est une porte, pas un réglage : le bouton n'apparaît que quand
 * il répare quelque chose (clé introuvable), et rien ne part sans une
 * confirmation qui énonce les deux conséquences — pour soi (l'ancien
 * historique reste illisible, il l'était déjà) et pour la personne en face
 * (elle ne perd rien, cf. l'historique des clés côté serveur).
 */

type EtatCoffre = 'chargement' | 'coffre' | 'perdue' | 'aucune' | 'indisponible';

const COPY: Record<Exclude<EtatCoffre, 'chargement'>, string> = {
  coffre: 'Ta clé est au coffre : tes conversations te suivent d’un appareil à l’autre.',
  perdue:
    'Ta clé est introuvable sur cet appareil. Si tu écrivais avant depuis un autre téléphone ou navigateur, reconnecte-toi depuis celui-là : elle y est toujours, et elle sera mise au coffre. Sinon, tu peux repartir avec une nouvelle clé.',
  aucune: 'Ta clé sera créée à ta première conversation.',
  indisponible: 'Impossible de vérifier ta clé pour le moment. Rien n’est perdu, réessaie dans un instant.',
};

export default function KeySettings() {
  const [etat, setEtat] = useState<EtatCoffre>('chargement');
  const [confirmer, setConfirmer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let annule = false;
    (async () => {
      let prochain: EtatCoffre = 'indisponible';
      try {
        const res = await fetch('/api/users/keys/me');
        if (res.status === 404) prochain = 'aucune';
        else if (res.ok) {
          const { privateKey } = (await res.json()) as { privateKey?: string | null };
          prochain = privateKey ? 'coffre' : 'perdue';
        }
      } catch {
        // Panne réseau : on reste sur « indisponible ».
      }
      if (!annule) setEtat(prochain);
    })();
    return () => {
      annule = true;
    };
  }, []);

  const reinitialiser = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErreur('');
    try {
      const paire = await generateKeyPair();
      const res = await fetch('/api/users/keys/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: paire.publicKey, privateKey: paire.privateKey }),
      });
      if (!res.ok) {
        setErreur('Impossible de réinitialiser ta clé pour le moment. Réessaie dans un instant.');
        return;
      }
      // La clé héritée de l'ancien stockage n'ouvre plus rien : on la retire.
      purgerCleHeritee();
      setConfirmer(false);
      setEtat('coffre');
      toast('Nouvelle clé en place. Tes prochains messages seront chiffrés avec elle.', { tone: 'success' });
    } catch {
      setErreur('Impossible de réinitialiser ta clé pour le moment. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return (
    <section id="cle-messagerie" className="scroll-mt-4 rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-content">Clé de messagerie</h2>
      <p className="mt-1 text-sm text-muted" aria-live="polite">
        {etat === 'chargement' ? '' : COPY[etat]}
      </p>

      {etat === 'perdue' && !confirmer && (
        <div className="mt-3">
          <Button type="button" variant="secondary" onClick={() => setConfirmer(true)}>
            Réinitialiser ma clé
          </Button>
        </div>
      )}

      {confirmer && (
        <div className="mt-3 space-y-3 rounded-md border border-hairline-strong p-3">
          <p className="text-sm text-content">
            Les messages que tu as déjà reçus resteront illisibles pour toi — ils le sont déjà.
            La personne en face ne perd rien : elle garde tout ce qu’elle voit aujourd’hui.
            Tes prochains messages, dans les deux sens, seront chiffrés avec ta nouvelle clé.
          </p>
          {erreur && (
            <p role="alert" className="text-sm text-error">
              {erreur}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" disabled={busy} onClick={reinitialiser}>
              {busy ? 'Réinitialisation…' : 'Oui, réinitialiser'}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmer(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
