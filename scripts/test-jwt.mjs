// Test empirique : peut-on décoder le JWT avec next-auth/jwt ?
import { jwtDecrypt, JWTPayload } from 'jose';
import { hkdf } from '@panva/hkdf';

async function getDerivedEncryptionKey(secret, salt = '') {
  return await hkdf('sha256', secret, salt, `NextAuth.js Generated Encryption Key${salt ? ` (${salt})` : ''}`, 32);
}

async function decodeNextAuthJwt(token, secret) {
  const key = await getDerivedEncryptionKey(secret, '');
  const { payload } = await jwtDecrypt(token, key, { clockTolerance: 15 });
  return payload;
}

async function test(tokenStr, secret) {
  console.log('=== TEST JWT DECODE ===');
  console.log('Token length:', tokenStr.length);
  console.log('Token first 50 chars:', tokenStr.substring(0, 50));
  try {
    const payload = await decodeNextAuthJwt(tokenStr, secret);
    console.log('✅ DECODE OK');
    console.log('Payload keys:', Object.keys(payload));
    console.log('sub:', payload.sub);
    console.log('role:', payload.role);
    console.log('email:', payload.email);
    console.log('exp:', payload.exp, '- expires:', new Date(payload.exp * 1000).toISOString());
    console.log('iat:', payload.iat);
  } catch (err) {
    console.log('❌ DECODE FAILED:', err.message);
    console.log('Error code:', err.code);
    console.log('Full error:', err);
  }
}

// Usage: node scripts/test-jwt.mjs "eyJ..." "Gy/t9k..."
const token = process.argv[2];
const secret = process.argv[3];

if (!token || !secret) {
  console.log('Usage: node scripts/test-jwt.mjs <token> <secret>');
  process.exit(1);
}

test(token, secret);
