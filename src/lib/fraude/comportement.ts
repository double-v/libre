import { getDb } from '@/lib/db';
import { enregistrerSignal } from './signaux';

/**
 * Signaux de comportement (spec 010, research R2, R3, R7). Calculés après la
 * réponse (`after()`), sur des données que le service a déjà : blocages et
 * likes. Aucun ne lit un message. Best-effort : une panne ne remonte jamais
 * au membre.
 */
const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

function jour(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function silencieux(nom: string) {
  return (err: unknown) => console.warn(`fraude.${nom}.failed`, { message: (err as Error)?.message?.slice(0, 80) });
}

/**
 * Trois membres distincts qui bloquent le même compte en 48 h (FR-001). Les
 * bloqueurs doivent avoir au moins 7 jours : trois comptes créés pour faire
 * tomber quelqu'un ne suffisent pas. Un épisode = un signal par jour.
 */
export async function verifierBlocages(blockedId: string, now = new Date()): Promise<void> {
  try {
    const blocages = await getDb().block.findMany({
      where: {
        blockedId,
        createdAt: { gte: new Date(now.getTime() - 48 * HEURE) },
        blocker: { createdAt: { lte: new Date(now.getTime() - 7 * JOUR) } },
      },
      select: { blockerId: true },
    });
    if (new Set(blocages.map((b) => b.blockerId)).size >= 3) {
      await enregistrerSignal({ userId: blockedId, type: 'bloque_repetition', force: 'fort', cle: jour(now) });
    }
  } catch (err) {
    silencieux('blocages')(err);
  }
}

/** Plus grand nombre d'instants contenus dans une fenêtre glissante de `ms`. */
export function maxDansFenetre(instants: ReadonlyArray<Date>, ms: number): number {
  const t = instants.map((d) => d.getTime()).sort((a, b) => a - b);
  let max = 0;
  for (let i = 0, j = 0; j < t.length; j++) {
    while (t[j] - t[i] > ms) i++;
    max = Math.max(max, j - i + 1);
  }
  return max;
}

/**
 * Rafale de likes (FR-005) : compte de moins de 7 jours, ≥ 30 likes en 24 h
 * dont ≥ 15 en 10 minutes — moins de 40 s par profil, photos et bio comprises.
 * Le « passer » n'est pas enregistré par le service (research R3) : la rafale
 * tient lieu de « like sans regarder ».
 */
export async function verifierRythmeLikes(likerId: string, now = new Date()): Promise<void> {
  try {
    const db = getDb();
    const u = await db.user.findUnique({ where: { id: likerId }, select: { createdAt: true } });
    if (!u || now.getTime() - u.createdAt.getTime() > 7 * JOUR) return;
    const likes = await db.like.findMany({
      where: { likerId, createdAt: { gte: new Date(now.getTime() - JOUR) } },
      select: { createdAt: true },
    });
    if (likes.length < 30) return;
    if (maxDansFenetre(likes.map((l) => l.createdAt), 10 * MINUTE) >= 15) {
      await enregistrerSignal({ userId: likerId, type: 'likes_rafale', force: 'fort', cle: jour(now) });
    }
  } catch (err) {
    silencieux('likes')(err);
  }
}

/**
 * Profil monté d'un coup (FR-008, indice faible) : photo, bio et dix likes
 * dans le quart d'heure qui suit la vérification de l'e-mail. Une personne
 * efficace peut le faire : il ne pèse qu'avec deux autres indices.
 */
export async function verifierProfilExpress(userId: string, now = new Date()): Promise<void> {
  try {
    const db = getDb();
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, profile: { select: { photos: true, bio: true } } },
    });
    if (!u?.emailVerified || now.getTime() - u.emailVerified.getTime() > 15 * MINUTE) return;
    if (!u.profile?.photos?.length || !u.profile.bio?.trim()) return;
    const likes = await db.like.count({ where: { likerId: userId, createdAt: { gte: u.emailVerified } } });
    if (likes >= 10) {
      await enregistrerSignal({ userId, type: 'profil_express', force: 'faible', cle: 'express' });
    }
  } catch (err) {
    silencieux('express')(err);
  }
}
