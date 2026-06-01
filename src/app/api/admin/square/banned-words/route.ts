import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { bannedWordCreateSchema } from '@/lib/square/validators';
import { invalidateBannedWordsCache } from '@/lib/square/moderation';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage') ?? '50')));

  const where = search
    ? { word: { contains: search, mode: 'insensitive' as const } }
    : {};

  const [words, total] = await Promise.all([
    getDb().bannedWord.findMany({
      where,
      orderBy: { word: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    getDb().bannedWord.count({ where }),
  ]);

  return NextResponse.json({ words, total, page, perPage });
}

export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const body = await request.json();
  const parsed = bannedWordCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { word, severity } = parsed.data;

  try {
    const created = await getDb().bannedWord.create({
      data: { word, severity },
    });
    invalidateBannedWordsCache();
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    // P2002 = unique constraint violation
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Ce mot est déjà dans la liste.' },
        { status: 409 },
      );
    }
    throw err;
  }
}