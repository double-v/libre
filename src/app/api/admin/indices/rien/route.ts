import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { deciderProfil } from '@/lib/moderation/gestes';

const MAX = 50;

/**
 * « Rien à signaler » pour toute une grappe (spec 011, US2) : la décision
 * unitaire, rejouée compte par compte. Le bilan dit qui a été traité.
 */
export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const body = (await request.json().catch(() => ({}))) as { userIds?: unknown };
  const ids = Array.isArray(body.userIds) ? [...new Set(body.userIds.filter((x): x is string => typeof x === 'string'))] : [];
  if (ids.length === 0 || ids.length > MAX) {
    return NextResponse.json({ error: `Entre 1 et ${MAX} comptes attendus` }, { status: 400 });
  }

  const traites: string[] = [];
  const echecs: string[] = [];
  for (const id of ids) {
    if (id === adminResult.userId) continue;
    try {
      await deciderProfil(adminResult.userId, id, 'rien', null);
      traites.push(id);
    } catch (error) {
      console.error('indices.rien.failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown');
      echecs.push(id);
    }
  }
  return NextResponse.json({ traites, echecs });
}
