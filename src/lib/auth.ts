import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { normalizeEmail } from '@/lib/email';

// ---------------------------------------------------------------------------
// Custom adapter – maps our Prisma 7 User model (no emailVerified / image)
// to the NextAuth Adapter interface.  We use JWT sessions so database
// session methods are present but rarely called.
// ---------------------------------------------------------------------------

const adapter = {
  createUser: async (data: Record<string, unknown>) => {
    return prisma.user.create({
      data: {
        email: data.email as string,
        displayName: (data.name as string) || 'New User',
        passwordHash: null,
      },
    }) as any;
  },
  getUser: async (id: string) => {
    return prisma.user.findUnique({ where: { id } }) as any;
  },
  getUserByEmail: async (email: string) => {
    return prisma.user.findUnique({ where: { email } }) as any;
  },
  getUserByAccount: async (params: { provider: string; providerAccountId: string }) => {
    const account = await prisma.account.findUnique({
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
    return prisma.user.update({
      where: { id },
      data: allowed,
    }) as any;
  },
  deleteUser: async (id: string) => {
    return prisma.user.delete({ where: { id } }) as any;
  },
  linkAccount: async (data: Record<string, unknown>) => {
    return prisma.account.create({ data: data as any }) as any;
  },
  unlinkAccount: async (params: { provider: string; providerAccountId: string }) => {
    return prisma.account.delete({
      where: {
        provider_providerAccountId: {
          provider: params.provider,
          providerAccountId: params.providerAccountId,
        },
      },
    }) as any;
  },
  createSession: async (data: Record<string, unknown>) => {
    return prisma.session.create({ data: data as any }) as any;
  },
  getSessionAndUser: async (sessionToken: string) => {
    const userAndSession = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });
    if (!userAndSession) return null;
    const { user, ...session } = userAndSession;
    return { user, session } as any;
  },
  updateSession: async (data: Record<string, unknown> & { sessionToken: string }) => {
    return prisma.session.update({
      where: { sessionToken: data.sessionToken },
      data: data as any,
    }) as any;
  },
  deleteSession: async (sessionToken: string) => {
    return prisma.session.delete({ where: { sessionToken } }) as any;
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedInput = normalizeEmail(credentials.email);
        const user = await prisma.user.findUnique({
          where: { normalizedEmail: normalizedInput },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);