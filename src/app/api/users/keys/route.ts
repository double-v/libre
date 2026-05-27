import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';

async function isValidECDHPublicKey(base64: string): Promise<boolean> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    await crypto.subtle.importKey(
      'spki',
      bytes.buffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { publicKey } = body;

    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: { publicKey: ['Required and must be a string'] } },
        { status: 400 },
      );
    }

    if (!(await isValidECDHPublicKey(publicKey))) {
      return NextResponse.json(
        { error: 'Invalid public key: must be a valid SPKI ECDH P-256 key' },
        { status: 400 },
      );
    }

    await prisma.userKey.upsert({
      where: { userId: session.user.id },
      update: { publicKey },
      create: {
        userId: session.user.id,
        publicKey,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('User key update error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}