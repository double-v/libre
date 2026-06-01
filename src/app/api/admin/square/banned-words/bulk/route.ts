import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { bannedWordBulkSchema } from '@/lib/square/validators';
import { invalidateBannedWordsCache } from '@/lib/square/moderation';

export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const body = await request.json();
  const parsed = bannedWordBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { words, clearExisting } = parsed.data;

  if (clearExisting) {
    await getDb().bannedWord.deleteMany();
  }

  const result = await getDb().bannedWord.createMany({
    data: words.map((w) => ({ word: w.word, severity: w.severity })),
    skipDuplicates: true,
  });

  invalidateBannedWordsCache();

  return NextResponse.json({ created: result.count }, { status: clearExisting ? 201 : 200 });
}