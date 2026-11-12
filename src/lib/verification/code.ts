/**
 * Code manuscrit du selfie de vérification (spec 012, US1/US2, research R1/R2).
 *
 * Le serveur tire quatre chiffres ; le membre les écrit à la main et les
 * montre sur son selfie. Une ligne par membre, écrasée à chaque tirage : un
 * nouveau code révoque l'ancien, ce qu'un jeton signé sans état ne savait pas
 * faire (#436). La ligne est effacée à la mise en file, en une seule requête
 * conditionnelle : deux envois simultanés du même code n'en mettent qu'un en
 * file.
 */
import { randomInt } from 'node:crypto';
import { getDb } from '@/lib/db';
import { CHIFFRES_CODE, LONGUEUR_CODE, estFormeCode } from './code-forme';

export { CHIFFRES_CODE, LONGUEUR_CODE, estFormeCode };

/** Le temps de trouver une feuille et un stylo, pas celui de préparer une image ailleurs. */
export const DUREE_CODE_MS = 30 * 60 * 1000;
/** Après trois refus consécutifs, la tentative suivante attend 24 h (FR-012). */
export const REFUS_AVANT_ATTENTE = 3;
export const ATTENTE_APRES_REFUS_MS = 24 * 3600 * 1000;

/** Quatre chiffres tirés par `crypto.randomInt`, jamais `Math.random`. */
export function genererCode(hasard: (max: number) => number = randomInt): string {
  let code = '';
  for (let i = 0; i < LONGUEUR_CODE; i++) code += CHIFFRES_CODE[hasard(CHIFFRES_CODE.length)];
  return code;
}

export interface CodeTire {
  code: string;
  expireAt: Date;
}

/** Tire un code pour ce membre et révoque le précédent (même ligne, écrasée). */
export async function tirerCode(userId: string, maintenant: Date = new Date()): Promise<CodeTire> {
  const code = genererCode();
  const expireAt = new Date(maintenant.getTime() + DUREE_CODE_MS);
  await getDb().verificationCode.upsert({
    where: { userId },
    create: { userId, code, tireAt: maintenant, expireAt },
    update: { code, tireAt: maintenant, expireAt },
  });
  return { code, expireAt };
}

/**
 * Vrai si `code` est le code en cours de ce membre et n'a pas expiré.
 * Lecture seule : sert à refuser avant de stocker l'image.
 */
export async function codeValide(userId: string, code: unknown, maintenant: Date = new Date()): Promise<boolean> {
  if (!estFormeCode(code)) return false;
  const ligne = await getDb().verificationCode.findFirst({
    where: { userId, code, expireAt: { gt: maintenant } },
    select: { userId: true },
  });
  return ligne !== null;
}

/**
 * Efface le code s'il est encore le bon et valable. Vrai pour un seul appel :
 * la condition et l'effacement tiennent dans la même requête.
 */
export async function consommerCode(userId: string, code: string, maintenant: Date = new Date()): Promise<boolean> {
  if (!estFormeCode(code)) return false;
  const { count } = await getDb().verificationCode.deleteMany({
    where: { userId, code, expireAt: { gt: maintenant } },
  });
  return count === 1;
}

export type DroitTirage = { ok: true; tentative: number } | { ok: false; reessaiAt: Date; tentative: number };

type Demande = { status: string; resolvedAt: Date | null };

/**
 * Règle pure du nouvel essai (R2) : dérivée des demandes, jamais stockée.
 * `demandes` : les plus récentes d'abord. Trois refus consécutifs sans
 * validation intercalée ouvrent 24 h d'attente depuis le dernier.
 */
export function droitTirage(demandes: Demande[], maintenant: Date = new Date()): DroitTirage {
  const depuisValidation = [];
  for (const d of demandes) {
    if (d.status === 'approved') break;
    depuisValidation.push(d);
  }
  const tentative = depuisValidation.length + 1;
  const dernieres = depuisValidation.slice(0, REFUS_AVANT_ATTENTE);
  const troisRefus = dernieres.length === REFUS_AVANT_ATTENTE && dernieres.every((d) => d.status === 'rejected');
  if (!troisRefus) return { ok: true, tentative };
  const dernier = dernieres[0].resolvedAt;
  // Un refus sans date de décision ne devrait pas exister ; on attend alors
  // depuis maintenant plutôt que d'ouvrir le tirage.
  const reessaiAt = new Date((dernier ?? maintenant).getTime() + ATTENTE_APRES_REFUS_MS);
  return maintenant.getTime() >= reessaiAt.getTime() ? { ok: true, tentative } : { ok: false, reessaiAt, tentative };
}

/** Lit les demandes du membre et applique `droitTirage`. */
export async function peutTirer(userId: string, maintenant: Date = new Date()): Promise<DroitTirage> {
  const demandes = await getDb().verificationRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { status: true, resolvedAt: true },
    // Le rang compte depuis la dernière validation : on lit assez loin pour
    // le trouver dans les cas réels, sans tout l'historique.
    take: 50,
  });
  return droitTirage(demandes, maintenant);
}
