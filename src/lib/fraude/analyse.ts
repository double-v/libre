import { lireTexte } from './lecture-photo';
import { detecterContact } from './contact';
import { enregistrerSignal } from './signaux';
import { contientUnContact } from '@/lib/contact';
import { getDb } from '@/lib/db';
import { empreinte, memePhoto } from './empreinte';

/**
 * Analyse d'une photo à l'ajout (spec 006, US2) : le texte incrusté est lu,
 * puis cherché comme un contact externe — le cas réel du 2026-09-24 portait
 * son identifiant Telegram écrit sur la photo. La photo n'est jamais
 * refusée : la lecture se trompe, un humain tranche dans la file (#444).
 *
 * Appelée dans `after()` : best-effort, ne jette jamais, ne change rien à la
 * réponse faite au membre.
 */
export async function analyserPhoto({ userId, photoKey, buffer }: { userId: string; photoKey: string; buffer: Buffer }): Promise<void> {
  // Deux analyses indépendantes : l'échec de l'une n'empêche pas l'autre.
  await Promise.all([lireContactSurPhoto(userId, photoKey, buffer), comparerEmpreinte(userId, photoKey, buffer)]);
}

async function lireContactSurPhoto(userId: string, photoKey: string, buffer: Buffer): Promise<void> {
  try {
    const texte = await lireTexte(buffer);
    if (!texte.trim()) return;
    const contacts = detecterContact(texte);
    const repere = contacts.find((c) => c.force === 'fort') ?? contacts[0];
    if (!repere) return;
    await enregistrerSignal({ userId, type: 'contact_photo', force: repere.force, extrait: repere.extrait, photoKey });
  } catch (err) {
    console.warn('fraude.analyse.failed', { message: (err as Error)?.message?.slice(0, 80) });
  }
}

/**
 * Même photo ailleurs (spec 006, US3) : un faux profil recycle ses photos
 * d'un compte à l'autre, et revient après un bannissement. L'empreinte est
 * comparée à celles des autres comptes (signal sur les deux, chacun pointant
 * l'autre) et à celles des comptes bannis dans l'année.
 */
async function comparerEmpreinte(userId: string, photoKey: string, buffer: Buffer): Promise<void> {
  try {
    const hash = await empreinte(buffer);
    const db = getDb();
    await db.photoFingerprint.upsert({ where: { photoKey }, update: { hash }, create: { photoKey, userId, hash } });

    const [autres, bannies] = await Promise.all([
      // Un compte banni passe par ses empreintes retenues, pas par celles-ci :
      // sinon la même photo lèverait deux signaux pour un seul fait.
      db.photoFingerprint.findMany({ where: { userId: { not: userId }, user: { isBanned: false } }, select: { userId: true, photoKey: true, hash: true } }),
      db.bannedPhotoFingerprint.findMany({ select: { bannedUserId: true, hash: true } }),
    ]);
    for (const a of autres.filter((a) => memePhoto(a.hash, hash))) {
      await enregistrerSignal({ userId, type: 'photo_reutilisee', force: 'fort', photoKey, autreUserId: a.userId });
      await enregistrerSignal({ userId: a.userId, type: 'photo_reutilisee', force: 'fort', photoKey: a.photoKey, autreUserId: userId });
    }
    for (const b of bannies.filter((b) => b.bannedUserId !== userId && memePhoto(b.hash, hash))) {
      await enregistrerSignal({ userId, type: 'photo_bannie', force: 'fort', photoKey, autreUserId: b.bannedUserId });
    }
  } catch (err) {
    console.warn('fraude.empreinte.failed', { message: (err as Error)?.message?.slice(0, 80) });
  }
}

/**
 * Texte d'un profil déjà en ligne (rattrapage, FR-011) : ces bios et pseudos
 * ont été écrits avant la règle. On ne les refuse pas après coup — on les
 * signale, et un humain tranche.
 */
export async function analyserTexteProfil({ userId, displayName, bio }: { userId: string; displayName: string; bio: string }): Promise<void> {
  try {
    const contacts = detecterContact(bio);
    const repere = contacts.find((c) => c.force === 'fort') ?? contacts[0];
    if (repere) {
      await enregistrerSignal({ userId, type: 'contact_bio', force: repere.force, extrait: repere.extrait });
    }
    // Même règle que l'écriture du pseudo (#459).
    if (contientUnContact(displayName, 'pseudo')) {
      await enregistrerSignal({ userId, type: 'contact_pseudo', force: 'fort', extrait: displayName });
    }
  } catch (err) {
    console.warn('fraude.analyse.failed', { message: (err as Error)?.message?.slice(0, 80) });
  }
}
