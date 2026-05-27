import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  encryptPrivateKey,
  decryptPrivateKey,
} from '@/lib/crypto';

describe('E2E Crypto', () => {
  it('generates a key pair', async () => {
    const keyPair = await generateKeyPair();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(typeof keyPair.publicKey).toBe('string');
    expect(typeof keyPair.privateKey).toBe('string');
  });

  it('encrypts and decrypts a message between two users', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const message = 'Salut, on se croise souvent !';
    const encrypted = await encryptMessage(message, bob.publicKey, alice.privateKey);
    const decrypted = await decryptMessage(encrypted, alice.publicKey, bob.privateKey);

    expect(decrypted).toBe(message);
  });

  it('fails to decrypt with wrong private key', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const eve = await generateKeyPair();

    const message = 'Message secret';
    const encrypted = await encryptMessage(message, bob.publicKey, alice.privateKey);

    await expect(decryptMessage(encrypted, alice.publicKey, eve.privateKey))
      .rejects.toThrow();
  });

  it('produces different ciphertexts for the same message (random IV)', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const message = 'Same message';
    const encrypted1 = await encryptMessage(message, bob.publicKey, alice.privateKey);
    const encrypted2 = await encryptMessage(message, bob.publicKey, alice.privateKey);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('encrypts and decrypts a private key with a password', async () => {
    const keyPair = await generateKeyPair();
    const password = 'my-secure-password';

    const encrypted = await encryptPrivateKey(keyPair.privateKey, password);
    const decrypted = await decryptPrivateKey(encrypted, password);

    expect(decrypted).toBe(keyPair.privateKey);
  });

  it('fails to decrypt private key with wrong password', async () => {
    const keyPair = await generateKeyPair();
    const encrypted = await encryptPrivateKey(keyPair.privateKey, 'correct-password');

    await expect(decryptPrivateKey(encrypted, 'wrong-password')).rejects.toThrow();
  });

  it('handles long messages (1000 chars)', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const message = 'a'.repeat(1000);
    const encrypted = await encryptMessage(message, bob.publicKey, alice.privateKey);
    const decrypted = await decryptMessage(encrypted, alice.publicKey, bob.privateKey);

    expect(decrypted).toBe(message);
  });

  it('handles unicode messages', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const message = 'Bonjour 🇫🇷 café résumé';
    const encrypted = await encryptMessage(message, bob.publicKey, alice.privateKey);
    const decrypted = await decryptMessage(encrypted, alice.publicKey, bob.privateKey);

    expect(decrypted).toBe(message);
  });
});