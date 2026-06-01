import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { invalidateBannedWordsCache } from '@/lib/square/moderation';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { id } = await params;

  const existing = await getDb().bannedWord.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Mot non trouvé.' }, { status: 404 });
  }

  await getDb().bannedWord.delete({ where: { id } });
  invalidateBannedWordsCache();

  return NextResponse.json({ deleted: id });
}