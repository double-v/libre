/**
 * E2E Crypto Module — ECDH key exchange + AES-256-GCM encryption
 *
 * Uses the Web Crypto API (crypto.subtle) exclusively.
 * Targets modern browsers and Node.js 20+.
 *
 * GCM provides authenticated encryption (confidentiality + integrity).
 * IV size: 12 bytes for GCM (vs 16 for CBC).
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

// ─── Key Generation ─────────────────────────────────────────────────────────

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
}

// ─── Message Encryption / Decryption ─────────────────────────────────────────

async function deriveSharedKey(
  publicKeyBase64: string,
  privateKeyBase64: string,
): Promise<CryptoKey> {
  const publicKey = await crypto.subtle.importKey(
    'spki',
    base64ToArrayBuffer(publicKeyBase64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64ToArrayBuffer(privateKeyBase64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256,
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  return aesKey;
}

/**
 * Encrypt a message using ECDH-derived shared key with AES-256-GCM.
 * GCM provides authenticated encryption — tampering is detected on decrypt.
 *
 * @returns Base64-encoded string: IV (12 bytes) + ciphertext + auth tag (16 bytes)
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderPrivateKey: string,
): Promise<string> {
  const aesKey = await deriveSharedKey(recipientPublicKey, senderPrivateKey);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    stringToArrayBuffer(plaintext),
  );

  // GCM ciphertext already includes the 16-byte auth tag
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt a message using ECDH-derived shared key with AES-256-GCM.
 * Throws on tampering (auth tag verification fails).
 *
 * @param encryptedBase64 - Base64-encoded IV (12 bytes) + ciphertext + auth tag
 */
export async function decryptMessage(
  encryptedBase64: string,
  senderPublicKey: string,
  recipientPrivateKey: string,
): Promise<string> {
  const aesKey = await deriveSharedKey(senderPublicKey, recipientPrivateKey);

  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));

  // GCM IV is 12 bytes
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext,
  );

  return arrayBufferToString(plaintext);
}

// ─── Private Key Encryption / Decryption ──────────────────────────────────────

/**
 * Encrypt a private key string with a password using PBKDF2 + AES-256-GCM.
 *
 * @returns Base64-encoded string: salt (16 bytes) + IV (12 bytes) + ciphertext + auth tag
 */
export async function encryptPrivateKey(
  privateKeyBase64: string,
  password: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    stringToArrayBuffer(privateKeyBase64),
  );

  // salt (16) + IV (12) + ciphertext + auth tag
  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength,
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt a private key string that was encrypted with encryptPrivateKey.
 *
 * @param encryptedBase64 - Base64-encoded salt (16 bytes) + IV (12 bytes) + ciphertext + auth tag
 */
export async function decryptPrivateKey(
  encryptedBase64: string,
  password: string,
): Promise<string> {
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));

  // salt (16 bytes), IV (12 bytes for GCM), ciphertext + auth tag
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext,
  );

  return arrayBufferToString(plaintext);
}