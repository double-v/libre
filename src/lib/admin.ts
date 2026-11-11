import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { estAdminEnBase } from '@/lib/admin-role';
import { debugLog } from '@/lib/logger';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export interface AdminSession {
  userId: string;
  email: string;
  role: string;
}

/**
 * Vérifie que la session courante est celle d'un admin.
 *
 * Le rôle est relu en base à chaque appel (le JWT peut être périmé, #155), et
 * la garde est **fermée** : base injoignable = `null`, donc 404 via
 * `requireAdmin`, sans repli sur le rôle du jeton (#547). Un compte banni
 * n'est pas admin non plus.
 */
export async function verifyAdmin(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);
  debugLog('[admin/verifyAdmin] hasSession=%s hasUserId=%s',
    !!session, !!session?.user?.id);

  if (!session?.user?.id) {
    debugLog("[admin/verifyAdmin] REFUS : pas de session ou pas d'identifiant");
    return null;
  }

  if (!(await estAdminEnBase(session.user.id, 'admin/verifyAdmin'))) {
    debugLog('[admin/verifyAdmin] REFUS : pas admin en base (ou base injoignable)');
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role: 'ADMIN',
  };
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