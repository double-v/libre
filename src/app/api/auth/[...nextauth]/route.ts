import { authOptions } from '@/lib/auth';
import NextAuth from 'next-auth';

const handler = NextAuth(authOptions);

// NOTE: do not wrap the POST handler — in Next.js 16, NextAuth's
// NextAuth() handler is called by the framework with internal args
// (nextUrl, query destructuring) and wrapping it as `handler(request)`
// breaks the req.query.nextauth extraction. Rate-limiting is instead
// applied inside the CredentialsProvider.authorize() callback in
// src/lib/auth.ts (per-email), and on the explicit /api/auth/* routes.
export { handler as GET, handler as POST };