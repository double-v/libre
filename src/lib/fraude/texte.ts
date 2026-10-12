import { createHash } from 'node:crypto';
import { getDb } from '@/lib/db';
import { enregistrerSignal } from './signaux';

/**
 * Empreinte de la bio (lot #514) : reconnaître une bio copié-collée d'un
 * compte à l'autre, ce que fait une ferme de comptes. La photo a
 * `comparerEmpreinte`, le texte n'avait aucun équivalent. Gabarit identique :
 * empreinte retenue par compte, comparée aux comptes actifs et bannis,
 * signal posé partout où le fait l'atteste.
 *
 * Niveau 1 : le copier-coller après normalisation. Un scammmeur qui réécrit
 * les mots passe — l'écart est assumé dans le ticket, on mesurera avant de
 * monter en comparaison floue.
 *
 * Aucun texte n'est retenu de plus : la bio existe déjà en base, l'empreinte
 * est un hash non-réversible qui sert à la comparaison et repart avec le
 * compte.
 */

/** Une phrase courte et banales peut être écrite deux fois par accident :
 * l'empreinte se tait en dessous, l'indice ne peut pas piéger un vrai membre. */
const LONGUEUR_MIN = 40;

export function empreinteBio(texte: string): string | null {
  const normalise = texte
    // NFC recompose les accents, sinon «é» écrit en deux points vaut autre chose.
    .normalize('NFC')
    .toLowerCase()
    .replace(/\p{P}|\p{S}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalise.length < LONGUEUR_MIN) return null;
  return createHash('sha256').update(normalise, 'utf8').digest('hex');
}

/**
 * Best-effort : écriture de bio. Une analyse en panne ne doit jamais toucher
 * la requête du membre — journal sans PII, comme partout dans ce module.
 */
export async function comparerBio(
  userId: string,
  bio: string,
  options: { inviter?: boolean } = {},
): Promise<void> {
  try {
    const hash = empreinteBio(bio);
    if (!hash) return;
    const db = getDb();
    // Recharger sa bio ne duplique pas la ligne.
    await db.bioFingerprint.upsert({
      where: { userId_hash: { userId, hash } },
      update: {},
      create: { userId, hash },
    });
    // Deux membres réels peuvent modeler leur bio sur le même modèle de page
    // de conseil : copie entre actifs, indice faible. Copier la bio d'un
    // banni, en revanche, n'a qu'une explication — indice fort.
    const [actifs, bannis] = await Promise.all([
      db.bioFingerprint.findMany({
        where: { hash, user: { isBanned: false, id: { not: userId } } },
        select: { userId: true },
      }),
      db.bioFingerprint.findMany({
        where: { hash, user: { isBanned: true } },
        select: { userId: true },
      }),
    ]);
    for (const { userId: autre } of actifs) {
      await enregistrerSignal({ userId, type: 'texte_reutilise', force: 'faible', cle: hash, autreUserId: autre }, options);
      await enregistrerSignal({ userId: autre, type: 'texte_reutilise', force: 'faible', cle: hash, autreUserId: userId }, options);
    }
    for (const { userId: b } of bannis) {
      await enregistrerSignal({ userId, type: 'texte_banni', force: 'fort', cle: hash, autreUserId: b }, options);
    }
  } catch (err) {
    console.warn('fraude.bio.failed', { message: (err as Error)?.message?.slice(0, 80) });
  }
}