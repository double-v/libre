import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

export async function uploadPhoto(file: File, userId: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Format non supporté. Utilisez JPG, PNG ou WebP.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('L\'image ne doit pas dépasser 5 Mo.');
  }

  const client = getR2Client();
  if (!client) {
    throw new Error('Stockage non configuré.');
  }

  const bucket = process.env.R2_BUCKET_NAME!;
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const key = `${userId}/${crypto.randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }));

  return key;
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