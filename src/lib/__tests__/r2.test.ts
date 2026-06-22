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