import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { normalizeEmail } from '@/lib/email';

// ---------------------------------------------------------------------------
// Custom adapter – maps our Prisma 7 User model (no emailVerified / image)
// to the NextAuth Adapter interface.  We use JWT sessions so database
// session methods are present but rarely called.
// ---------------------------------------------------------------------------

const adapter = {
  createUser: async (data: Record<string, unknown>) => {
    return getDb().user.create({
      data: {
        email: data.email as string,
        displayName: (data.name as string) || 'New User',
        passwordHash: null,
      },
    }) as any;
  },
  getUser: async (id: string) => {
    return getDb().user.findUnique({ where: { id } }) as any;
  },
  getUserByEmail: async (email: string) => {
    return getDb().user.findUnique({ where: { email } }) as any;
  },
  getUserByAccount: async (params: { provider: string; providerAccountId: string }) => {
    const account = await getDb().account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: params.provider,
          providerAccountId: params.providerAccountId,
        },
      },
      include: { user: true },
    });
    return (account?.user ?? null) as any;
  },
  updateUser: async (data: Record<string, unknown> & { id: string }) => {
    const { id, ...rest } = data;
    const allowed: Record<string, unknown> = {};
    if ('email' in rest) allowed.email = rest.email;
    if ('name' in rest) allowed.displayName = rest.name;
    return getDb().user.update({
      where: { id },
      data: allowed,
    }) as any;
  },
  deleteUser: async (id: string) => {
    return getDb().user.delete({ where: { id } }) as any;
  },
  linkAccount: async (data: Record<string, unknown>) => {
    return getDb().account.create({ data: data as any }) as any;
  },
  unlinkAccount: async (params: { provider: string; providerAccountId: string }) => {
    return getDb().account.delete({
      where: {
        provider_providerAccountId: {
          provider: params.provider,
          providerAccountId: params.providerAccountId,
        },
      },
    }) as any;
  },
  createSession: async (data: Record<string, unknown>) => {
    return getDb().session.create({ data: data as any }) as any;
  },
  getSessionAndUser: async (sessionToken: string) => {
    const userAndSession = await getDb().session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });
    if (!userAndSession) return null;
    const { user, ...session } = userAndSession;
    return { user, session } as any;
  },
  updateSession: async (data: Record<string, unknown> & { sessionToken: string }) => {
    return getDb().session.update({
      where: { sessionToken: data.sessionToken },
      data: data as any,
    }) as any;
  },
  deleteSession: async (sessionToken: string) => {
    return getDb().session.delete({ where: { sessionToken } }) as any;
  },
};

export const authOptions: NextAuthOptions = {
  adapter: adapter as any,

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/login',
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        turnstileToken: { label: 'Captcha', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Per-email rate limit: 20 attempts per minute. Complements the
        // per-IP limit on /api/auth/register etc. (see #27). Protects
        // against targeted brute-force on a specific account.
        const normalizedForRateLimit = normalizeEmail(credentials.email as string);
        const { rateLimit, limits } = await import('@/lib/rate-limit');
        const rl = await rateLimit(`auth:signin:${normalizedForRateLimit}`, limits.auth.limit, limits.auth.windowMs);
        if (!rl.success) {
          throw new Error('TOO_MANY_ATTEMPTS');
        }

        // Verify Turnstile if configured
        if (credentials.turnstileToken && process.env.TURNSTILE_SECRET_KEY) {
          const { verifyTurnstile } = await import('@/lib/turnstile');
          const valid = await verifyTurnstile(credentials.turnstileToken);
          if (!valid) {
            throw new Error('CAPTCHA_FAILED');
          }
        }

        const normalizedInput = normalizeEmail(credentials.email);
        const user = await getDb().user.findUnique({
          where: { normalizedEmail: normalizedInput },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        if (user.isBanned) {
          throw new Error('ACCOUNT_BANNED');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role.toUpperCase(),
        };
      },
    }),

    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [GitHubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })]
      : []),

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
  ],

  callbacks: {
    /**
     * Open-redirect protection: validate that the post-login URL points
     * back to our own site. Without this, an attacker can craft
     * /login?callbackUrl=https://evil.com and steal the session via OAuth.
     *
     * Accept:
     *  - relative paths starting with `/` (e.g. /discover, /profile/123)
     *  - absolute URLs whose origin matches the configured NEXTAUTH_URL
     *
     * Reject (silent fallback to baseUrl): anything else.
     */
    async redirect({ url, baseUrl }) {
      // Relative path → allow as-is
      if (url.startsWith('/')) {
        // Block protocol-relative URLs (//evil.com → resolves as external)
        if (url.startsWith('//')) return baseUrl;
        return url;
      }
      // Absolute URL → must match our origin
      try {
        const allowed = new URL(baseUrl);
        const target = new URL(url);
        if (target.origin === allowed.origin) return url;
      } catch {
        // Malformed URL → fall through to baseUrl
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Normalize role to uppercase to handle DB inconsistencies
        token.role = String((user as any).role).toUpperCase();
        if (process.env.NODE_ENV !== 'production') {
          console.log('[auth/jwt] sign-in: id=%s role=%s', user.id, token.role);
        }
      } else if (token.id) {
        // JWT refresh: re-fetch role from DB so changes propagate
        // without requiring the user to sign out and back in
        try {
          const dbUser = await getDb().user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            // Normalize to uppercase — DB may store 'user' or 'admin' in lowercase
            token.role = dbUser.role.toUpperCase();
            if (process.env.NODE_ENV !== 'production') {
              console.log('[auth/jwt] refresh: id=%s dbRole=%s', token.id, token.role);
            }
          } else if (process.env.NODE_ENV !== 'production') {
            console.log('[auth/jwt] refresh: id=%s user NOT FOUND in DB', token.id);
          }
        } catch (err) {
          console.error('[auth/jwt] refresh DB error:', err);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);