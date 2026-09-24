/**
 * Jeton de geste (#436) — lie un geste tiré à un membre, sans état en base.
 *
 * Le selfie arrive avec ce jeton : le serveur y relit le geste qu'il a lui-même
 * tiré, jamais celui que le client prétendrait avoir reçu. Le secret est
 * dérivé de NEXTAUTH_SECRET mais distinct : un jeton de vérification d'e-mail
 * ne se relit pas ici, et réciproquement (audience différente, clé différente).
 */
import { SignJWT, jwtVerify } from 'jose';
import { geste } from './gestes';

const AUDIENCE = 'libre:geste-selfie';
/** Le temps de prendre la photo, pas celui de la préparer ailleurs. */
const DUREE_S = 30 * 60;

function cle(): Uint8Array {
  return new TextEncoder().encode(`${process.env.NEXTAUTH_SECRET ?? ''}:geste-selfie`);
}

export interface ContenuJeton {
  geste: string;
  /** 1 = premier tirage, 2 = le seul nouveau tirage permis. */
  tirage: 1 | 2;
}

export async function signerJetonGeste(
  { userId, geste: code, tirage }: ContenuJeton & { userId: string },
  maintenant: Date = new Date(),
): Promise<string> {
  const iat = Math.floor(maintenant.getTime() / 1000);
  return new SignJWT({ geste: code, tirage })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience(AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(iat + DUREE_S)
    .sign(cle());
}

/** Rend le contenu si le jeton est valide, signé pour ce membre et porte un geste connu. */
export async function lireJetonGeste(jeton: string, userId: string): Promise<ContenuJeton | null> {
  try {
    const { payload } = await jwtVerify(jeton, cle(), { audience: AUDIENCE, subject: userId });
    const code = typeof payload.geste === 'string' ? payload.geste : '';
    const tirage = payload.tirage === 2 ? 2 : payload.tirage === 1 ? 1 : null;
    if (!geste(code) || !tirage) return null;
    return { geste: code, tirage };
  } catch {
    return null;
  }
}
