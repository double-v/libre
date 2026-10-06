import { createHmac, hkdfSync } from 'node:crypto';

/**
 * Empreintes d'identité (spec 010, research R1). Un SHA-256 nu d'une adresse
 * e-mail se renverse par dictionnaire : on garde un HMAC dont la clé ne vit
 * que sur le serveur. Elle est dérivée de `NEXTAUTH_SECRET` plutôt que d'une
 * variable dédiée, qui pourrait manquer en production et éteindre la
 * détection sans bruit. Contrepartie acceptée : changer ce secret rend les
 * empreintes déjà gardées inopérantes jusqu'à leur purge (1 an, 7 jours).
 *
 * Une clé par sorte : l'empreinte d'un appareil ne se compare jamais à celle
 * d'une IP, et une fuite d'une table ne sert pas à lire l'autre.
 */
export type SorteIdentite = 'appareil' | 'email' | 'ip';

function cle(sorte: SorteIdentite, secret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, 'libre', `libre:fraude:${sorte}`, 32));
}

/** @returns l'empreinte hexadécimale, ou null si la valeur ou le secret manque. */
export function hmacIdentite(sorte: SorteIdentite, valeur: string | null | undefined): string | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!valeur || !secret) return null;
  return createHmac('sha256', cle(sorte, secret)).update(valeur).digest('hex');
}
