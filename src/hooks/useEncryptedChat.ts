'use client';

import { useState, useEffect } from 'react';
import { generateKeyPair, decryptPrivateKey as decryptPK } from '@/lib/crypto';

// Clés de l'ancien stockage local (#198). On ne les écrit plus : elles ne
// servent qu'à retrouver une clé posée avant la mise en service de l'escrow,
// sur l'appareil qui la détient encore.
const PUBLIC_KEY_STORAGE_KEY = 'libre_public_key';
const PRIVATE_KEY_STORAGE_KEY = 'libre_private_key';
const DEVICE_KEY_STORAGE_KEY = 'libre_device_key';

/**
 * Où en est la clé d'identité de la personne.
 *
 * `illisible` n'est pas une erreur technique à masquer : c'est un état qu'il
 * faut dire. La personne peut agir (revenir sur son appareil d'origine), et le
 * silence est précisément ce qui a rendu la perte invisible jusqu'ici.
 */
export type EtatCle = 'chargement' | 'pret' | 'illisible' | 'indisponible';

/** Retire les clés d'identité de l'ancien stockage local — voir appelant. */
function purgerCleHeritee(): void {
  try {
    localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
    localStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
    localStorage.removeItem(DEVICE_KEY_STORAGE_KEY);
  } catch {
    // Stockage indisponible : rien à retirer.
  }
}

/** La clé locale héritée, si elle correspond bien à la clé publique du compte. */
async function cleLocaleHeritee(publicKeyDuCompte: string): Promise<string | null> {
  try {
    const publiqueLocale = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
    const priveeLocale = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    const cleAppareil = localStorage.getItem(DEVICE_KEY_STORAGE_KEY);

    // Une clé locale d'une autre paire ne sert à rien : s'en servir produirait
    // des messages illisibles sans le dire.
    if (!publiqueLocale || !priveeLocale || !cleAppareil) return null;
    if (publiqueLocale !== publicKeyDuCompte) return null;

    return await decryptPK(priveeLocale, cleAppareil);
  } catch {
    return null;
  }
}

/**
 * Met à disposition la clé d'identité de la session, en mémoire uniquement.
 *
 * Avant #198, la clé privée était générée puis rangée dans le `localStorage`,
 * chiffrée par une « clé d'appareil » rangée au même endroit. Elle ne voyageait
 * donc pas : vider le cache ou changer de téléphone régénérait une paire,
 * écrasait la clé publique du compte, et rendait tout l'historique illisible.
 *
 * Désormais le serveur garde la clé sous enveloppe et la restitue à une session
 * authentifiée. La règle qui remplace le bug : **on ne génère une paire que si
 * le compte n'en a aucune.** Dans tous les autres cas d'échec, on le dit.
 */
export function useEncryptedChat() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [etat, setEtat] = useState<EtatCle>('chargement');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let annule = false;

    (async () => {
      const poser = (pub: string | null, priv: string | null, prochain: EtatCle) => {
        if (annule) return;
        setPublicKey(pub);
        setPrivateKey(priv);
        setEtat(prochain);
        setReady(true);
      };

      let reponse: Response;
      try {
        reponse = await fetch('/api/users/keys/me');
      } catch {
        // Panne réseau : surtout ne rien générer. Une paire créée « pour
        // débloquer » détruirait l'historique de façon irréversible.
        poser(null, null, 'indisponible');
        return;
      }

      // Le compte n'a aucune clé : c'est le seul cas où on a le droit d'en
      // créer une.
      if (reponse.status === 404) {
        try {
          const paire = await generateKeyPair();
          const depot = await fetch('/api/users/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicKey: paire.publicKey, privateKey: paire.privateKey }),
          });
          // Si le dépôt échoue (coffre non configuré, réseau), la clé n'existe
          // que dans cet onglet : chiffrer avec elle produirait des messages
          // perdus au premier rechargement. On préfère ne pas démarrer.
          if (!depot.ok) {
            poser(null, null, 'indisponible');
            return;
          }
          poser(paire.publicKey, paire.privateKey, 'pret');
        } catch {
          poser(null, null, 'indisponible');
        }
        return;
      }

      if (reponse.status === 503) {
        poser(null, null, 'indisponible');
        return;
      }

      if (!reponse.ok) {
        // 500 (enveloppe illisible) et compagnie : le compte a une clé, on n'y
        // accède pas. On le dit, on ne la remplace pas.
        poser(null, null, 'illisible');
        return;
      }

      const { publicKey: pub, privateKey: priv } = (await reponse.json()) as {
        publicKey: string;
        privateKey: string | null;
      };

      if (priv) {
        // Le serveur détient une copie utilisable : les clés héritées de
        // l'ancien stockage local deviennent redondantes, on les retire. C'est
        // le seul moment où les effacer est sans conséquence.
        purgerCleHeritee();
        poser(pub, priv, 'pret');
        return;
      }

      // Clé publique connue, coffre vide : le compte est antérieur à l'escrow.
      // Si cet appareil détient encore la clé correspondante, on s'en sert —
      // le versement au coffre viendra avec la migration douce (#336).
      const heritee = await cleLocaleHeritee(pub);
      poser(pub, heritee, heritee ? 'pret' : 'illisible');
    })();

    return () => {
      annule = true;
    };
  }, []);

  return { publicKey, privateKey, ready, etat };
}
