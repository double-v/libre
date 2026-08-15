import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

const CATEGORIES = ['bug', 'suggestion', 'question'] as const;
const STATUSES = ['open', 'resolved'] as const;

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const perPage = Math.min(50, Math.max(1, Number(searchParams.get('perPage') ?? '20')));

  // Un paramètre hors domaine est ignoré plutôt que rejeté : l'admin est une
  // zone power où un filtre mal formé ne doit pas transformer la page en 400.
  const statusParam = searchParams.get('status');
  const status = STATUSES.find((s) => s === statusParam);
  const categoryParam = searchParams.get('category');
  const category = CATEGORIES.find((c) => c === categoryParam);

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
  };

  const [items, total] = await Promise.all([
    getDb().feedback.findMany({
      where,
      include: {
        // Le feedback est envoyable sans session : la relation est nullable
        // et l'UI doit savoir afficher un retour anonyme.
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    getDb().feedback.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, perPage });
}
