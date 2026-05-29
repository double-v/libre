import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const feedbackSchema = z.object({
  category: z.enum(['bug', 'suggestion', 'question']).default('bug'),
  message: z.string().min(5).max(2000),
  url: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { category, message, url } = parsed.data;
    const userAgent = request.headers.get('user-agent') || undefined;

    const feedback = await getDb().feedback.create({
      data: {
        userId: session?.user?.id || null,
        category,
        message,
        url,
        userAgent,
      },
    });

    return NextResponse.json({ id: feedback.id }, { status: 201 });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 },
    );
  }
}