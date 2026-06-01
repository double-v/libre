import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { addSystemMessage } from '@/lib/square/store';
import { z } from 'zod';

const systemMessageSchema = z.object({
  content: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const body = await request.json();
  const parsed = systemMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 });
  }

  const { content } = parsed.data;
  const message = await addSystemMessage(content);

  return NextResponse.json({ message }, { status: 201 });
}