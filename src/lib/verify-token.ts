import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
const VERIFICATION_EXPIRY = '24h';

export async function createVerificationToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(VERIFICATION_EXPIRY)
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyVerificationToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { userId: payload.userId as string, email: payload.email as string };
  } catch {
    return null;
  }
}