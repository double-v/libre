import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export interface AdminSession {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verify the current session has ADMIN role.
 * Queries the DB directly — does NOT trust the JWT cache.
 * This ensures role changes propagate instantly without re-login.
 */
export async function verifyAdmin(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);
  console.log('[admin/verifyAdmin] session=%s userId=%s role=%s',
    !!session, session?.user?.id ?? 'none', session?.user?.role ?? 'none');

  if (!session?.user?.id) {
    console.log('[admin/verifyAdmin] DENIED: no session or no user.id');
    return null;
  }

  // Always check the DB — JWT may be stale
  try {
    const dbUser = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const dbRole = dbUser?.role?.toUpperCase();
    console.log('[admin/verifyAdmin] userId=%s dbRole=%s jwtRole=%s',
      session.user.id, dbRole ?? 'none', session.user.role);

    if (dbRole !== 'ADMIN') {
      console.log('[admin/verifyAdmin] DENIED: dbRole=%s is not ADMIN', dbRole);
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email ?? '',
      role: dbRole,
    };
  } catch (err) {
    console.error('[admin/verifyAdmin] DB error:', err);
    // Fallback to JWT role if DB is unreachable
    if (session.user.role?.toUpperCase() === 'ADMIN') {
      console.log('[admin/verifyAdmin] DB error but JWT has ADMIN — allowing (degraded)');
      return {
        userId: session.user.id,
        email: session.user.email ?? '',
        role: session.user.role,
      };
    }
    return null;
  }
}

/**
 * For API route handlers: check admin and return 404 if not.
 * Returns 404 (not 403) to hide the existence of admin routes.
 */
export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return admin;
}

/**
 * Type guard: check if a requireAdmin() result is an admin session (not an error response).
 */
export function isAdminSession(result: AdminSession | NextResponse): result is AdminSession {
  return 'userId' in result && 'role' in result;
}