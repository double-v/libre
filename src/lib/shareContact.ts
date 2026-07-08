/**
 * Partage de réseaux dans le chat (issue #207).
 *
 * Un « partage de réseaux » est un message envoyé EN CLAIR (non chiffré) dont le
 * contenu est un JSON `{"type":"share-contact",...}`. Le chat le reconnaît pour
 * le rendre en badge système (cf. ShareContactNotice) au lieu d'afficher le JSON
 * brut. Ce module centralise le format pour que l'émission (ShareContactButton)
 * et la détection (page de conversation) ne divergent jamais.
 *
 * NOTE produit : le payload ne transporte pas encore de vrais liens/handles —
 * c'est un signal d'intention. Le partage réel de coordonnées (modèle de
 * données + design) est suivi séparément.
 */
export const SHARE_CONTACT_TYPE = 'share-contact';

export interface ShareContactPayload {
  type: typeof SHARE_CONTACT_TYPE;
  data?: string;
}

/** Contenu à envoyer comme message pour signaler un partage de réseaux. */
export function buildShareContactMessage(): string {
  return JSON.stringify({ type: SHARE_CONTACT_TYPE, data: 'Contact info shared' });
}

/**
 * Vrai si `content` est un message de partage de réseaux. Chemin rapide : on
 * ne tente le JSON.parse que si ça commence par `{` — les messages nominaux
 * sont du texte ou du base64 chiffré, jamais un objet JSON.
 */
export function isShareContactMessage(content: string): boolean {
  if (!content || content[0] !== '{') return false;
  try {
    const parsed = JSON.parse(content) as unknown;
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as ShareContactPayload).type === SHARE_CONTACT_TYPE
    );
  } catch {
    return false;
  }
}
