import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fileTypeFromBuffer } from 'file-type';
import { blurredDerivativeBuffer } from '@/lib/photo-blur';
import { aDesMetadonnees, retirerMetadonnees } from '@/lib/photo-metadata';
import { blurredKeyFor } from '@/lib/photo-sensitivity';

function getR2Client(): S3Client | null {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return null;
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const SIGNED_URL_TTL = 900; // 15 minutes

/**
 * `dossier` range l'objet hors des photos de profil (`verif` : selfies de
 * vérification, #436). La clé commence toujours par l'identifiant du membre :
 * le proxy, la purge et l'effacement du compte en déduisent le propriétaire.
 */
export async function uploadPhoto(file: File, userId: string, dossier?: 'verif'): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Format non supporté. Utilisez JPG, PNG ou WebP.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('L\'image ne doit pas dépasser 5 Mo.');
  }

  // Magic-bytes validation: trust the buffer content, not the declared MIME type.
  // Prevents uploading e.g. an HTML/SVG file with `file.type === 'image/jpeg'`.
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_TYPES.includes(detected.mime)) {
    throw new Error('Le contenu de l\'image ne correspond pas à un format autorisé.');
  }
  if (detected.mime !== file.type) {
    throw new Error('Le type déclaré et le contenu de l\'image ne correspondent pas.');
  }

  const client = getR2Client();
  if (!client) {
    throw new Error('Stockage non configuré.');
  }

  // #441 : aucune photo n'atteint R2 avec ses métadonnées (position GPS de la
  // prise de vue, appareil, heure). Indécodable = refus : stocker l'original
  // tel quel serait précisément la fuite qu'on ferme.
  let propre: Buffer;
  try {
    ({ buffer: propre } = await retirerMetadonnees(buffer, file.type));
  } catch {
    throw new Error('L\'image est illisible. Essaie avec une autre photo.');
  }

  const bucket = process.env.R2_BUCKET_NAME!;
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const key = `${userId}/${dossier ? `${dossier}/` : ''}${crypto.randomUUID()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: propre,
    ContentType: file.type,
  }));

  return key;
}

const MIME_PAR_EXTENSION: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/**
 * Rattrapage #441 : retire les métadonnées d'une photo déjà stockée, en la
 * réécrivant **à la même clé** — les profils, le voile (#433) et la
 * modération la désignent par sa clé, rien d'autre ne bouge.
 *
 * Une photo déjà propre n'est pas réécrite : le rattrapage se rejoue sans
 * coût ni perte de qualité (chaque ré-encodage JPEG en coûte un peu). Lève
 * sur une erreur R2 ou une image indécodable : l'appelant compte l'échec et
 * passe à la suivante.
 */
export async function nettoyerPhotoExistante(key: string): Promise<'nettoyee' | 'propre'> {
  const client = getR2Client();
  if (!client) {
    throw new Error('Stockage non configuré.');
  }
  const bucket = process.env.R2_BUCKET_NAME!;

  const original = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!original.Body) {
    throw new Error('Photo introuvable dans le stockage.');
  }
  const buffer = Buffer.from(await original.Body.transformToByteArray());
  if (!(await aDesMetadonnees(buffer))) return 'propre';

  const mime = MIME_PAR_EXTENSION[key.split('.').pop()?.toLowerCase() ?? ''] ?? 'image/jpeg';
  const { buffer: propre } = await retirerMetadonnees(buffer, mime);
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: propre, ContentType: mime }));
  return 'nettoyee';
}

export async function getPhotoSignedUrl(key: string): Promise<string> {
  const client = getR2Client();
  if (!client) {
    throw new Error('Stockage non configuré.');
  }

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: SIGNED_URL_TTL });
}

export function isR2Configured(): boolean {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
}

/**
 * Supprime un objet R2 par sa clé.
 * Appelée quand un utilisateur supprime une photo de son profil
 * (cf. issue #142) — sans cela, l'objet reste accessible via
 * GET /api/photos/[key] tant que la clé est connue, et s'accumule
 * comme stockage orphelin.
 *
 * Erreurs R2 (réseau, permissions) sont levées — l'appelant décide
 * s'il bloque la suppression DB ou s'il log et continue.
 */
export async function deletePhoto(key: string): Promise<void> {
  const client = getR2Client();
  if (!client) {
    throw new Error('Stockage non configuré.');
  }

  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
}
/**
 * Génère et stocke le dérivé flouté d'une photo classée sensible (#330).
 *
 * Le flou est produit **ici**, côté serveur, et jamais en CSS : un filtre CSS
 * laisserait l'original arriver dans le navigateur, donc lisible dans l'onglet
 * réseau — la garantie ne serait qu'un décor (cf. #328).
 *
 * On **réduit fortement avant de flouter** (cf. `photo-blur.ts`) : un
 * flou gaussien seul est partiellement réversible (déconvolution), alors qu'un
 * sous-échantillonnage détruit l'information pour de bon. Le
 * ré-agrandissement qui suit ne sert qu'à garder une vignette aux bonnes
 * dimensions.
 *
 * Renvoie la clé du dérivé. Lève si la génération échoue : l'appelant ne doit
 * surtout pas classer une photo qu'il ne saurait pas flouter.
 */
export async function generateBlurredDerivative(key: string): Promise<string> {
  const client = getR2Client();
  if (!client) {
    throw new Error('Stockage non configuré.');
  }
  const bucket = process.env.R2_BUCKET_NAME!;

  const original = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!original.Body) {
    throw new Error('Photo introuvable dans le stockage.');
  }
  const buffer = Buffer.from(await original.Body.transformToByteArray());

  const blurred = await blurredDerivativeBuffer(buffer, key);

  const blurredKey = blurredKeyFor(key);
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: blurredKey,
    Body: blurred,
    ContentType: 'image/jpeg',
  }));

  return blurredKey;
}

