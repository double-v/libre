import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { profileUpdateSchema } from '@/lib/validators';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      bio,
      birthDate,
      genderIdentity,
      orientation,
      relationshipType,
      interests,
      socialLinks,
      photos,
      maxDistanceKm,
      ageMin,
      ageMax,
    } = parsed.data;

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        bio,
        birthDate: new Date(birthDate),
        genderIdentity,
        orientation,
        relationshipType,
        interests,
        ...(socialLinks !== undefined && { socialLinks }),
        ...(photos !== undefined && { photos }),
        maxDistanceKm,
        ageMin,
        ageMax,
      },
      create: {
        userId: session.user.id,
        bio,
        birthDate: new Date(birthDate),
        genderIdentity,
        orientation,
        relationshipType,
        interests,
        ...(socialLinks !== undefined && { socialLinks }),
        ...(photos !== undefined && { photos }),
        maxDistanceKm,
        ageMin,
        ageMax,
      },
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}