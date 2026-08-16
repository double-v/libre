import { randomUUID } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
const RESET_EXPIRY = '15m';

export async function createResetToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, purpose: 'reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(RESET_EXPIRY)
    .setIssuedAt()
    // `iat` est à la seconde près : sans identifiant unique, deux demandes
    // dans la même seconde pour le même compte produisent un jeton identique,
    // donc le même `tokenHash` — et la création en base tombe sur la
    // contrainte d'unicité, ce que l'utilisateur voit en 500 (cf. #334).
    .setJti(randomUUID())
    .sign(SECRET);
}

export async function verifyResetToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.purpose !== 'reset') return null;
    return { userId: payload.userId as string, email: payload.email as string };
  } catch {
    return null;
  }
}
