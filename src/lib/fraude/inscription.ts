import { getDb } from '@/lib/db';
import { hmacIdentite } from './empreinte-identite';
import { enregistrerSignal } from './signaux';

/**
 * Signaux d'inscription (spec 010, research R1 et R5), calculés après la
 * réponse. Trois volets indépendants — la panne de l'un n'empêche pas les
 * autres — et aucune valeur en clair : appareil, e-mail et IP passent par
 * un HMAC à clé serveur avant toute comparaison.
 */
export interface Inscription {
  userId: string;
  deviceId: string | null | undefined;
  normalizedEmail: string;
  ip: string;
}

const JOUR = 24 * 60 * 60 * 1000;

function silencieux(volet: string, err: unknown) {
  console.warn('fraude.inscription.failed', { volet, message: (err as Error)?.message?.slice(0, 80) });
}

/** Même appareil ou même e-mail qu'un compte banni depuis moins d'un an (FR-003). */
async function retourDeBanni({ userId, deviceId, normalizedEmail }: Inscription): Promise<void> {
  const cles = [
    { kind: 'appareil', hash: hmacIdentite('appareil', deviceId) },
    { kind: 'email', hash: hmacIdentite('email', normalizedEmail) },
  ].filter((c): c is { kind: string; hash: string } => c.hash !== null);
  if (cles.length === 0) return;
  const trouves = await getDb().bannedIdentityFingerprint.findMany({ where: { OR: cles }, select: { kind: true } });
  for (const kind of new Set(trouves.map((t) => t.kind))) {
    await enregistrerSignal({ userId, type: 'retour_banni', force: 'fort', cle: kind });
  }
}

/**
 * Appareil partagé avec un autre compte actif (FR-006, indice faible) : un
 * couple ou une famille peut partager un téléphone. Les deux comptes portent
 * l'indice, chacun pointant vers l'autre pour le modérateur.
 */
async function appareilPartage({ userId, deviceId }: Inscription): Promise<void> {
  if (!deviceId) return;
  const autres = await getDb().user.findMany({
    where: { deviceId, isBanned: false, id: { not: userId } },
    select: { id: true },
  });
  for (const { id } of autres) {
    await enregistrerSignal({ userId, type: 'appareil_partage', force: 'faible', autreUserId: id });
    await enregistrerSignal({ userId: id, type: 'appareil_partage', force: 'faible', autreUserId: userId });
  }
}

/**
 * Inscriptions groupées (FR-009, indice faible) : trois comptes en 24 h
 * depuis la même connexion. Une box familiale ou un lieu public peut
 * l'expliquer. L'empreinte de l'IP est purgée après 7 jours.
 */
async function inscriptionsGroupees({ userId, ip }: Inscription, now: Date): Promise<void> {
  const ipHash = ip && ip !== 'unknown' ? hmacIdentite('ip', ip) : null;
  if (!ipHash) return;
  const db = getDb();
  await db.signupTrace.create({ data: { ipHash, userId } });
  const traces = await db.signupTrace.findMany({
    where: { ipHash, createdAt: { gte: new Date(now.getTime() - JOUR) } },
    select: { userId: true },
  });
  const comptes = new Set(traces.map((t) => t.userId));
  if (comptes.size < 3) return;
  const cle = now.toISOString().slice(0, 10);
  for (const id of comptes) {
    await enregistrerSignal({ userId: id, type: 'inscriptions_groupees', force: 'faible', cle });
  }
}

export async function analyserInscription(i: Inscription, now = new Date()): Promise<void> {
  await retourDeBanni(i).catch((err) => silencieux('banni', err));
  await appareilPartage(i).catch((err) => silencieux('appareil', err));
  await inscriptionsGroupees(i, now).catch((err) => silencieux('ip', err));
}
