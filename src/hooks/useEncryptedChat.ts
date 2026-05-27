'use client';

import { useState, useEffect } from 'react';
import { generateKeyPair, encryptPrivateKey, decryptPrivateKey } from '@/lib/crypto';

const PUBLIC_KEY_STORAGE_KEY = 'peterlgame_public_key';
const PRIVATE_KEY_STORAGE_KEY = 'peterlgame_private_key';

export function useEncryptedChat() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [hasKeys, setHasKeys] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedPublicKey = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
    const storedPrivateKey = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);

    if (storedPublicKey && storedPrivateKey) {
      setPublicKey(storedPublicKey);
      setHasKeys(true);
    }
  }, []);

  async function generateKeys(password: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const keyPair = await generateKeyPair();
      const encryptedPrivate = await encryptPrivateKey(keyPair.privateKey, password);

      localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, keyPair.publicKey);
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, encryptedPrivate);

      // Upload public key to server
      const res = await fetch('/api/users/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: keyPair.publicKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload public key');
      }

      setPublicKey(keyPair.publicKey);
      setHasKeys(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Key generation failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function decryptPrivateKeyFromStorage(password: string): Promise<string> {
    const encryptedPrivate = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);

    if (!encryptedPrivate) {
      throw new Error('No encrypted private key found in storage');
    }

    return decryptPrivateKey(encryptedPrivate, password);
  }

  return { publicKey, hasKeys, loading, error, generateKeys, decryptPrivateKeyFromStorage };
}