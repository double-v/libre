'use client';

import { useState, useEffect, useCallback } from 'react';
import { generateKeyPair, encryptPrivateKey, decryptPrivateKey as decryptPK } from '@/lib/crypto';

const PUBLIC_KEY_STORAGE_KEY = 'libre_public_key';
const PRIVATE_KEY_STORAGE_KEY = 'libre_private_key';
const DEVICE_KEY_STORAGE_KEY = 'libre_device_key';

function getOrCreateDeviceKey(): string {
  let key = localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
  if (!key) {
    const arr = crypto.getRandomValues(new Uint8Array(32));
    key = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, key);
  }
  return key;
}

export function useEncryptedChat() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Load or generate keys on mount
  useEffect(() => {
    (async () => {
      try {
        const storedPublicKey = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
        const storedPrivateKey = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
        const deviceKey = getOrCreateDeviceKey();

        if (storedPublicKey && storedPrivateKey) {
          // Decrypt private key with device key
          const decryptedPrivate = await decryptPK(storedPrivateKey, deviceKey);
          setPublicKey(storedPublicKey);
          setPrivateKey(decryptedPrivate);
          setReady(true);
        } else {
          // Auto-generate keys
          const keyPair = await generateKeyPair();
          const encryptedPrivate = await encryptPrivateKey(keyPair.privateKey, deviceKey);

          localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, keyPair.publicKey);
          localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, encryptedPrivate);

          // Upload public key to server
          try {
            await fetch('/api/users/keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicKey: keyPair.publicKey }),
            });
          } catch {
            // Will retry next time
          }

          setPublicKey(keyPair.publicKey);
          setPrivateKey(keyPair.privateKey);
          setReady(true);
        }
      } catch (err) {
        console.error('E2E key setup error:', err);
        // Fall back to no encryption
        setReady(true);
      }
    })();
  }, []);

  return { publicKey, privateKey, ready };
}