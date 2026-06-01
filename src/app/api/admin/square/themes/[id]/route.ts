import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { Prisma } from '@/generated/client/client';
import { z } from 'zod';

const themeUpdateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(300).optional(),
  placeholder: z.string().min(1).max(100).optional(),
  maxLength: z.number().int().min(1).max(1000).optional(),
  allowFreeText: z.boolean().optional(),
  options: z.array(z.string()).nullable().optional(),
  pseudonymNames: z.array(z.string()).nullable().optional(),
  active: z.boolean().optional(),
});

/** Convert plain null to Prisma.JsonNull for nullable Json fields */
function toNullableJson<T>(value: T[] | null | undefined): Prisma.NullableJsonNullValueInput | T[] | undefined {
  if (value === null) return Prisma.JsonNull;
  return value;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = themeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée', details: parsed.error.issues }, { status: 400 });
  }

  const existing = await getDb().squareThemeConfig.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Thème non trouvé' }, { status: 404 });
  }

  const { options, pseudonymNames, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (options !== undefined) data.options = toNullableJson(options);
  if (pseudonymNames !== undefined) data.pseudonymNames = toNullableJson(pseudonymNames);

  const updated = await getDb().squareThemeConfig.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}