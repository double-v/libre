import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';

const deleteAccountSchema = z.object({
  confirmPassword: z.string().min(1),
});

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Password confirmation required', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Confirm the user actually knows their password before destroying the account.
    // OAuth-only accounts (no passwordHash) are protected by their provider session
    // and don't need a password — skip the check for those.
    const user = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (user?.passwordHash) {
      const ok = await bcrypt.compare(parsed.data.confirmPassword, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
      }
    }

    // Cascade deletes profile, likes, matches, messages, etc.
    await getDb().user.delete({
      where: { id: session.user.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}