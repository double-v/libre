import NextAuth, { type NextAuthOptions } from 'next-auth';
import type { Adapter, AdapterUser, AdapterSession, AdapterAccount } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import type { Prisma } from '@/generated/client/client';
import { normalizeEmail } from '@/lib/email';
import { compteEstBanni, selectStatutCompte } from '@/lib/admin-role';

// ---------------------------------------------------------------------------
// Custom adapter – maps our Prisma 7 User model (no emailVerified / image)
// to the NextAuth Adapter interface.  We use JWT sessions so database
// session methods are present but rarely called.
// ---------------------------------------------------------------------------

// Le modèle Prisma (pas de `emailVerified`/`image` au format NextAuth) ne matche
// pas exactement les types Adapter* de NextAuth. On borne donc les entrées/sorties
// via `as unknown as <Type>` (cast purement compile-time, validé par tsc, aucun
// impact runtime) plutôt que via `any` — les frontières restent typées.
const adapter = {
  createUser: async (data: Record<string, unknown>) => {
    return (await getDb().user.create({
      data: {
        email: data.email as string,
        displayName: (data.name as string) || 'New User',
        passwordHash: null,
      },
    })) as unknown as AdapterUser;
  },
  getUser: async (id: string) => {
    return (await getDb().user.findUnique({ where: { id } })) as unknown as AdapterUser | null;
  },
  getUserByEmail: async (email: string) => {
    return (await getDb().user.findUnique({ where: { email } })) as unknown as AdapterUser | null;
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
    return (account?.user ?? null) as unknown as AdapterUser | null;
  },
  updateUser: async (data: Record<string, unknown> & { id: string }) => {
    const { id, ...rest } = data;
    const allowed: Record<string, unknown> = {};
    if ('email' in rest) allowed.email = rest.email;
    if ('name' in rest) allowed.displayName = rest.name;
    return (await getDb().user.update({
      where: { id },
      data: allowed,
    })) as unknown as AdapterUser;
  },
  deleteUser: async (id: string) => {
    return (await getDb().user.delete({ where: { id } })) as unknown as AdapterUser;
  },
  linkAccount: async (data: Record<string, unknown>) => {
    return (await getDb().account.create({
      data: data as unknown as Prisma.AccountUncheckedCreateInput,
    })) as unknown as AdapterAccount;
  },
  unlinkAccount: async (params: { provider: string; providerAccountId: string }) => {
    return (await getDb().account.delete({
      where: {
        provider_providerAccountId: {
          provider: params.provider,
          providerAccountId: params.providerAccountId,
        },
      },
    })) as unknown as AdapterAccount;
  },
  createSession: async (data: Record<string, unknown>) => {
    return (await getDb().session.create({
      data: data as unknown as Prisma.SessionUncheckedCreateInput,
    })) as unknown as AdapterSession;
  },
  getSessionAndUser: async (sessionToken: string) => {
    const userAndSession = await getDb().session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });
    if (!userAndSession) return null;
    const { user, ...session } = userAndSession;
    return { user, session } as unknown as { user: AdapterUser; session: AdapterSession };
  },
  updateSession: async (data: Record<string, unknown> & { sessionToken: string }) => {
    return (await getDb().session.update({
      where: { sessionToken: data.sessionToken },
      data: data as unknown as Prisma.SessionUncheckedUpdateInput,
    })) as unknown as AdapterSession;
  },
  deleteSession: async (sessionToken: string) => {
    return (await getDb().session.delete({ where: { sessionToken } })) as unknown as AdapterSession;
  },
};

export const authOptions: NextAuthOptions = {
  adapter: adapter as unknown as Adapter,

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
    /**
     * Un compte banni ne se reconnecte pas, quel que soit le fournisseur.
     * `authorize` le refuse déjà pour le mot de passe ; sans ce rappel, un
     * fournisseur OAuth (GitHub, Google) ouvrirait une session neuve. On
     * cherche par identifiant et par e-mail normalisé : l'objet reçu est le
     * compte existant ou, à la première connexion, le profil du fournisseur.
     */
    async signIn({ user }) {
      const ou: Prisma.UserWhereInput[] = [{ id: user.id }];
      if (user.email) ou.push({ normalizedEmail: normalizeEmail(user.email) });
      const bannis = await getDb().user.count({ where: { isBanned: true, OR: ou } });
      return bannis === 0;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Normalize role to uppercase to handle DB inconsistencies
        token.role = String((user as { role?: unknown }).role).toUpperCase();
        if (process.env.NODE_ENV !== 'production') {
          console.log('[auth/jwt] sign-in: id=%s role=%s', user.id, token.role);
        }
      } else if (token.id) {
        // Relecture du compte à chaque lecture de session : le rôle suit la
        // base (#155), et un compte banni ou supprimé perd sa session
        // aussitôt, sur les pages comme sur toute route `/api/*` qui passe
        // par `getServerSession` (le proxy, lui, ne voit pas `/api`).
        let compte: { role: string | null; isBanned: boolean } | null | undefined;
        try {
          compte = await getDb().user.findUnique({
            where: { id: token.id as string },
            select: selectStatutCompte,
          });
        } catch (err) {
          // Base injoignable : on garde le jeton tel quel. Fermer ici
          // déconnecterait tout le monde au moindre hoquet ; la route en
          // aval échoue de toute façon sans base, et la zone admin a sa
          // propre garde fermée (#547). Motif seul, jamais d'identifiant.
          console.error('[auth/jwt] relecture impossible :', err instanceof Error ? err.name : 'inconnue');
        }
        if (compte === null || (compte && compteEstBanni(compte))) {
          // Lever ici fait vider le cookie par NextAuth, et
          // `getServerSession` rend `null` : chaque route répond 401.
          throw new Error('SESSION_REVOQUEE');
        }
        if (compte?.role) token.role = compte.role.toUpperCase();
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