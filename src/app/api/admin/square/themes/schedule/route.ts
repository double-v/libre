import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const scheduleSchema = z.object({
  schedule: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    themeConfigId: z.string().uuid(),
  })).length(7),
});

export async function PUT(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const body = await request.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée', details: parsed.error.issues }, { status: 400 });
  }

  const { schedule } = parsed.data;

  // Verify all themeConfigIds exist
  const themeIds = schedule.map((s) => s.themeConfigId);
  const existingThemes = await getDb().squareThemeConfig.findMany({
    where: { id: { in: themeIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingThemes.map((t) => t.id));
  for (const slot of schedule) {
    if (!existingIds.has(slot.themeConfigId)) {
      return NextResponse.json({ error: `Thème non trouvé: ${slot.themeConfigId}` }, { status: 400 });
    }
  }

  // Upsert each schedule slot
  for (const slot of schedule) {
    await getDb().squareThemeSchedule.upsert({
      where: { dayOfWeek: slot.dayOfWeek },
      update: { themeConfigId: slot.themeConfigId },
      create: { dayOfWeek: slot.dayOfWeek, themeConfigId: slot.themeConfigId },
    });
  }

  const updatedSchedule = await getDb().squareThemeSchedule.findMany({
    include: { themeConfig: true },
    orderBy: { dayOfWeek: 'asc' },
  });

  return NextResponse.json(updatedSchedule);
}