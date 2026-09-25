import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { countAdminQueues } from '@/lib/admin-queues';
import { compterProfilsAVerifier } from '@/lib/fraude/file';

/**
 * GET /api/admin/queues — compteurs des files admin (#391, contrats/api.md).
 *
 * Endpoint dédié plutôt que `/api/admin/stats` : appelé à chaque navigation
 * par `useAdminQueues`, il ne doit compter que ce qui sert à la pastille.
 * 404 pour un non-admin, comme partout dans `/api/admin` (on ne révèle pas la route).
 */
export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  return NextResponse.json(await countAdminQueues(getDb(), compterProfilsAVerifier));
}
