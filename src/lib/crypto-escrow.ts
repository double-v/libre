/**
 * Escrow de clé — enveloppe serveur de la clé privée d'identité (#198, spec 002).
 *
 * Pourquoi ce module existe : jusqu'ici la clé privée ne vivait que dans le
 * `localStorage` du navigateur qui l'avait créée. Changer d'appareil ou vider le
 * cache détruisait définitivement l'historique des conversations, en silence.
 * On échange donc le zéro-knowledge contre une messagerie qui marche : le
 * service garde la clé privée **sous enveloppe**, et la restitue à une session
 * authentifiée. Cet arbitrage est assumé et documenté côté produit (#337) — il
 * n'a de sens que s'il est dit.
 *
 * Ce module est **exclusivement serveur** : la clé maître ne doit jamais
 * atteindre un navigateur. La garde ci-dessous échoue au premier import côté
 * client, et `src/lib/__tests__/crypto-escrow-confinement.test.ts` vérifie
 * qu'aucun composant client ne l'importe.
 */
import { createCipheriv, createDecipheriv, randomBytes, createPublicKey, createPrivateKey } from 'node:crypto';

if (typeof window !== 'undefined') {
  throw new Error(
    "crypto-escrow est un module serveur : l'importer côté client exposerait la clé maître.",
  );
}

/**
 * Version de format de l'enveloppe. Elle n'est pas décorative : sans elle, une
 * rotation de la clé maître n'aurait aucun moyen de distinguer un blob ancien
 * d'un blob neuf, et il faudrait tout ré-envelopper d'un bloc — c'est-à-dire
 * risquer de tout perdre en une transaction.
 */
const VERSION = 'v1';
const ALGO = 'aes-256-gcm';
const TAILLE_IV = 12; // GCM : 12 octets, cf. src/lib/crypto.ts côté client
const TAILLE_CLE = 32; // AES-256

function cleMaitre(): Buffer {
  const brut = process.env.CHAT_ESCROW_KEY;
  if (!brut) {
    throw new Error(
      "CHAT_ESCROW_KEY n'est pas configurée : impossible d'ouvrir ou de sceller le coffre de clés.",
    );
  }
  const cle = Buffer.from(brut, 'base64');
  if (cle.length !== TAILLE_CLE) {
    throw new Error(
      `CHAT_ESCROW_KEY doit faire 32 octets une fois décodée en base64 (reçu : ${cle.length}).`,
    );
  }
  return cle;
}

/**
 * Le coffre est-il utilisable ? Permet aux routes de répondre franchement en
 * développement plutôt que d'échouer sur un `undefined` à la première
 * conversation.
 */
export function escrowDisponible(): boolean {
  try {
    cleMaitre();
    return true;
  } catch {
    return false;
  }
}

/**
 * Scelle une clé privée. L'identifiant du compte sert de **données associées** :
 * une enveloppe recopiée d'une ligne à l'autre ne s'ouvre pas, ce qui interdit
 * la transplantation d'un coffre vers un autre compte.
 */
export function wrapPrivateKey(privateKey: string, userId: string): string {
  const iv = randomBytes(TAILLE_IV);
  const chiffreur = createCipheriv(ALGO, cleMaitre(), iv);
  chiffreur.setAAD(Buffer.from(userId, 'utf8'));
  const chiffre = Buffer.concat([chiffreur.update(privateKey, 'utf8'), chiffreur.final()]);
  const tag = chiffreur.getAuthTag();
  return [VERSION, iv.toString('base64'), chiffre.toString('base64'), tag.toString('base64')].join(
    ':',
  );
}

/**
 * Ouvre une enveloppe. Lève si la clé maître est mauvaise, si le contenu a été
 * altéré, ou si l'enveloppe appartient à un autre compte. On préfère lever
 * bruyamment : rendre une clé fausse produirait des messages illisibles sans
 * jamais dire pourquoi.
 */
export function unwrapPrivateKey(blob: string, userId: string): string {
  const morceaux = blob.split(':');
  if (morceaux.length !== 4) {
    throw new Error("Enveloppe de clé illisible : format inattendu.");
  }
  const [version, iv, chiffre, tag] = morceaux;
  if (version !== VERSION) {
    throw new Error(`Version d'enveloppe inconnue : ${version}.`);
  }
  const dechiffreur = createDecipheriv(ALGO, cleMaitre(), Buffer.from(iv, 'base64'));
  dechiffreur.setAAD(Buffer.from(userId, 'utf8'));
  dechiffreur.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    dechiffreur.update(Buffer.from(chiffre, 'base64')),
    dechiffreur.final(),
  ]).toString('utf8');
}

/**
 * La clé privée proposée engendre-t-elle bien la clé publique annoncée ?
 *
 * Sans ce contrôle, un client fautif ou malveillant peut déposer au coffre une
 * clé qui ne déchiffre rien : le compte garderait une clé publique valide,
 * recevrait des messages, et ne pourrait plus jamais les lire. Le dégât serait
 * irréversible, et invisible jusqu'au premier changement d'appareil.
 *
 * Les deux formats sont ceux du client (`src/lib/crypto.ts`) : base64 de SPKI
 * pour la publique, base64 de PKCS8 pour la privée.
 */
export function publiqueCorrespondALaPrivee(publicKey: string, privateKey: string): boolean {
  try {
    const privee = createPrivateKey({
      key: Buffer.from(privateKey, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
    const deduite = createPublicKey(privee).export({ format: 'der', type: 'spki' });
    return deduite.equals(Buffer.from(publicKey, 'base64'));
  } catch {
    return false;
  }
}
