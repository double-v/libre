import { lireTexte } from './lecture-photo';
import { detecterContact } from './contact';
import { enregistrerSignal } from './signaux';
import { contientUnContact } from '@/lib/contact';

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
