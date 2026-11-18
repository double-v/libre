/**
 * Appels du parcours badge vérifié (#436, spec 012) côté navigateur.
 *
 * Les erreurs serveur sont écrites pour le membre : elles remontent telles
 * quelles, un message générique seulement quand le réseau lui-même tombe.
 * `reessaiAt` (trois refus, FR-012) et `nouveauCode` (code expiré ou
 * remplacé) remontent aussi : l'écran en fait une suite, pas une impasse.
 */
import type { StatutVerification } from './statut';

export type { StatutVerification };

export interface Code {
  code: string;
  expireAt: string;
}

export type Resultat<T> =
  | { ok: true; valeur: T }
  | { ok: false; erreur: string; reessaiAt?: string; nouveauCode?: boolean };

const RESEAU = 'Connexion impossible. Vérifie ton réseau et réessaie.';

async function appel<T>(url: string, init?: RequestInit): Promise<Resultat<T>> {
  try {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        erreur: typeof json.error === 'string' ? json.error : RESEAU,
        ...(typeof json.reessaiAt === 'string' ? { reessaiAt: json.reessaiAt } : {}),
        ...(json.nouveauCode === true ? { nouveauCode: true } : {}),
      };
    }
    return { ok: true, valeur: json as T };
  } catch {
    return { ok: false, erreur: RESEAU };
  }
}

export function lireStatut(): Promise<Resultat<StatutVerification>> {
  return appel('/api/moderation/verify', { cache: 'no-store' });
}

export function tirerCode(): Promise<Resultat<Code>> {
  return appel('/api/moderation/verify/code', { method: 'POST' });
}

export function envoyerSelfie(selfie: File, code: string): Promise<Resultat<{ statut: 'en_cours' }>> {
  const fd = new FormData();
  fd.append('selfie', selfie);
  fd.append('code', code);
  return appel('/api/moderation/verify', { method: 'POST', body: fd });
}

/** Le membre a vu la décision : éteint le repère de la roue dentée. Sans suite en cas d'échec. */
export async function marquerVu(): Promise<void> {
  try {
    await fetch('/api/moderation/verify/vu', { method: 'POST' });
    window.dispatchEvent(new Event(VERIFICATION_VUE_EVENT));
  } catch {
    // Le repère restera allumé jusqu'à la prochaine visite : rien de grave.
  }
}

export const VERIFICATION_VUE_EVENT = 'libre:verification-vue';
