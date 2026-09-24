/**
 * Appels du parcours badge vérifié (#436) côté navigateur.
 *
 * Les erreurs serveur sont écrites pour le membre : elles remontent telles
 * quelles, un message générique seulement quand le réseau lui-même tombe.
 */
import type { Geste } from './gestes';
import type { StatutVerification } from './statut';

export type { StatutVerification };

export interface Tirage {
  geste: Geste;
  jeton: string;
  peutRetirer: boolean;
}

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

const RESEAU = 'Connexion impossible. Vérifie ton réseau et réessaie.';

async function appel<T>(url: string, init?: RequestInit): Promise<Resultat<T>> {
  try {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, erreur: typeof json.error === 'string' ? json.error : RESEAU };
    return { ok: true, valeur: json as T };
  } catch {
    return { ok: false, erreur: RESEAU };
  }
}

export function lireStatut(): Promise<Resultat<StatutVerification>> {
  return appel('/api/moderation/verify');
}

export function tirerGeste(precedent?: string): Promise<Resultat<Tirage>> {
  return appel('/api/moderation/verify/geste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(precedent ? { precedent } : {}),
  });
}

export function envoyerSelfie(selfie: File, jeton: string): Promise<Resultat<StatutVerification>> {
  const fd = new FormData();
  fd.append('selfie', selfie);
  fd.append('jeton', jeton);
  return appel('/api/moderation/verify', { method: 'POST', body: fd });
}
