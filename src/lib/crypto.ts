/**
 * E2E Crypto Module — ECDH key exchange + AES-256-CBC encryption
 *
 * Uses the Web Crypto API (crypto.subtle) exclusively.
 * Targets modern browsers and Node.js 20+.
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
  return new TextEncoder().encode(str);
}

// ─── Key Generation ─────────────────────────────────────────────────────────

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate an ECDH key pair using the P-256 curve.
 * Returns both keys as base64-encoded strings.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable
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

/**
 * Derive a shared AES-256-CBC key from a public key and a private key
 * using ECDH key agreement, then import it as an AES-CBC CryptoKey.
 */
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

  // Derive 256 shared bits (AES-256)
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256,
  );

  // Import the derived bits as an AES-CBC key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt'],
  );

  return aesKey;
}

/**
 * Encrypt a message using ECDH-derived shared key with AES-256-CBC.
 *
 * @param plaintext - The message to encrypt
 * @param recipientPublicKey - Recipient's public key (base64, SPKI)
 * @param senderPrivateKey - Sender's private key (base64, PKCS8)
 * @returns Base64-encoded string: IV (16 bytes) + ciphertext
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderPrivateKey: string,
): Promise<string> {
  const aesKey = await deriveSharedKey(recipientPublicKey, senderPrivateKey);

  // Generate random 16-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    aesKey,
    stringToArrayBuffer(plaintext),
  );

  // Combine IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt a message using ECDH-derived shared key with AES-256-CBC.
 *
 * @param encryptedBase64 - Base64-encoded IV + ciphertext (as produced by encryptMessage)
 * @param senderPublicKey - Sender's public key (base64, SPKI)
 * @param recipientPrivateKey - Recipient's private key (base64, PKCS8)
 * @returns The decrypted plaintext
 */
export async function decryptMessage(
  encryptedBase64: string,
  senderPublicKey: string,
  recipientPrivateKey: string,
): Promise<string> {
  const aesKey = await deriveSharedKey(senderPublicKey, recipientPrivateKey);

  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));

  // Extract IV (first 16 bytes) and ciphertext
  const iv = combined.slice(0, 16);
  const ciphertext = combined.slice(16);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    aesKey,
    ciphertext,
  );

  return arrayBufferToString(plaintext);
}

// ─── Private Key Encryption / Decryption ──────────────────────────────────────

/**
 * Encrypt a private key string with a password using PBKDF2 + AES-256-CBC.
 *
 * @param privateKeyBase64 - The private key string to encrypt
 * @param password - The password to derive the encryption key from
 * @returns Base64-encoded string: salt (16 bytes) + IV (16 bytes) + ciphertext
 */
export async function encryptPrivateKey(
  privateKeyBase64: string,
  password: string,
): Promise<string> {
  // Generate random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // Generate random 16-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // Derive AES key from password using PBKDF2
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
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt'],
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    aesKey,
    stringToArrayBuffer(privateKeyBase64),
  );

  // Combine salt + IV + ciphertext
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
 * @param encryptedBase64 - Base64-encoded salt + IV + ciphertext
 * @param password - The password used during encryption
 * @returns The original private key string
 */
export async function decryptPrivateKey(
  encryptedBase64: string,
  password: string,
): Promise<string> {
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));

  // Extract salt (16 bytes), IV (16 bytes), and ciphertext
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 32);
  const ciphertext = combined.slice(32);

  // Derive the same AES key from password + salt
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
    { name: 'AES-CBC', length: 256 },
    false,
    ['decrypt'],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    aesKey,
    ciphertext,
  );

  return arrayBufferToString(plaintext);
}