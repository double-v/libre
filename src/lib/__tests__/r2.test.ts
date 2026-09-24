/**
 * Tests unitaires — src/lib/r2.ts
 *
 * On mocke @aws-sdk/client-s3 pour ne pas nécessiter un vrai R2.
 * Cf. issue #142 — deletePhoto() doit supprimer l'objet R2.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockSend = vi.fn();
const mockR2Env = {
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-key',
  R2_SECRET_ACCESS_KEY: 'test-secret',
  R2_BUCKET_NAME: 'test-bucket',
};

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = mockSend;
  }
  class MockPutObjectCommand {
    constructor(public input: unknown) {}
  }
  class MockGetObjectCommand {
    constructor(public input: unknown) {}
  }
  class MockDeleteObjectCommand {
    constructor(public input: unknown) {}
  }
  return {
    __esModule: true,
    S3Client: MockS3Client as unknown as import('@aws-sdk/client-s3').S3Client,
    PutObjectCommand: MockPutObjectCommand as unknown as import('@aws-sdk/client-s3').PutObjectCommand,
    GetObjectCommand: MockGetObjectCommand as unknown as import('@aws-sdk/client-s3').GetObjectCommand,
    DeleteObjectCommand: MockDeleteObjectCommand as unknown as import('@aws-sdk/client-s3').DeleteObjectCommand,
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  __esModule: true,
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com/photo.jpg'),
}));

vi.mock('file-type', () => ({
  __esModule: true,
  fileTypeFromBuffer: vi.fn().mockResolvedValue({ mime: 'image/jpeg' }),
}));

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
  for (const [k, v] of Object.entries(mockR2Env)) {
    process.env[k] = v;
  }
});

// --- Tests ---

describe('deletePhoto', () => {
  it('supprime l\'objet R2 avec la clé donnée', async () => {
    const { deletePhoto } = await import('../r2');
    const key = 'user-123/abc-def.jpg';

    await deletePhoto(key);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: key,
    });
  });

  it('throw si R2 n\'est pas configuré', async () => {
    delete process.env.R2_ACCOUNT_ID;
    const { deletePhoto } = await import('../r2');

    await expect(deletePhoto('user-123/abc.jpg')).rejects.toThrow('Stockage non configuré');
  });
});

// --- #441 : métadonnées retirées avant R2 ---

async function jpegAvecGps(): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width: 30, height: 20, channels: 3, background: '#888888' } })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 51/1 2410/100' } })
    .toBuffer();
}

describe('uploadPhoto (#441)', () => {
  it('stocke la photo sans EXIF : la position de prise de vue ne part jamais dans R2', async () => {
    const sharp = (await import('sharp')).default;
    const { uploadPhoto } = await import('../r2');
    const entree = await jpegAvecGps();
    const file = new File([new Uint8Array(entree)], 'photo.jpg', { type: 'image/jpeg' });

    const key = await uploadPhoto(file, 'user-123');

    expect(key).toMatch(/^user-123\/.+\.jpg$/);
    const put = mockSend.mock.calls[0][0].input as { Body: Buffer; ContentType: string };
    expect(put.ContentType).toBe('image/jpeg');
    expect((await sharp(put.Body).metadata()).exif).toBeUndefined();
  });

  it('refuse une image indécodable plutôt que de stocker l’original', async () => {
    const { uploadPhoto } = await import('../r2');
    const file = new File([new Uint8Array(Buffer.from('pas une image'))], 'x.jpg', { type: 'image/jpeg' });
    await expect(uploadPhoto(file, 'user-123')).rejects.toThrow('illisible');
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('nettoyerPhotoExistante (#441, rattrapage)', () => {
  it('réécrit à la même clé une photo qui porte des métadonnées', async () => {
    const sharp = (await import('sharp')).default;
    const { nettoyerPhotoExistante } = await import('../r2');
    const entree = await jpegAvecGps();
    mockSend.mockResolvedValueOnce({ Body: { transformToByteArray: async () => new Uint8Array(entree) } });

    expect(await nettoyerPhotoExistante('user-123/a.jpg')).toBe('nettoyee');

    expect(mockSend).toHaveBeenCalledTimes(2);
    const put = mockSend.mock.calls[1][0].input as { Key: string; Body: Buffer; ContentType: string };
    expect(put).toMatchObject({ Key: 'user-123/a.jpg', ContentType: 'image/jpeg' });
    expect((await sharp(put.Body).metadata()).exif).toBeUndefined();
  });

  it('ne réécrit pas une photo déjà propre (rattrapage rejouable sans coût)', async () => {
    const sharp = (await import('sharp')).default;
    const { nettoyerPhotoExistante } = await import('../r2');
    const propre = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } }).png().toBuffer();
    mockSend.mockResolvedValueOnce({ Body: { transformToByteArray: async () => new Uint8Array(propre) } });

    expect(await nettoyerPhotoExistante('user-123/b.png')).toBe('propre');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
