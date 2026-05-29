import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export interface AdminSession {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verify the current session has ADMIN role.
 * Returns the session if admin, or null if not.
 * Use in server components and API routes.
 */
export async function verifyAdmin(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  if (session.user.role !== 'ADMIN') return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role: session.user.role,
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