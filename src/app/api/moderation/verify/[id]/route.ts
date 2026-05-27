import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reviewerId = session.user.id;
    const { id } = await params;

    const body = await request.json();
    const { status } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 },
      );
    }

    // Find the verification request
    const verificationRequest = await prisma.verificationRequest.findUnique({
      where: { id },
    });

    if (!verificationRequest) {
      return NextResponse.json(
        { error: 'Verification request not found' },
        { status: 404 },
      );
    }

    // Update the verification request
    const updated = await prisma.verificationRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: reviewerId,
        resolvedAt: new Date(),
      },
    });

    // If approved, update the user's isVerified flag
    if (status === 'approved') {
      await prisma.user.update({
        where: { id: verificationRequest.userId },
        data: { isVerified: true },
      });
    }

    return NextResponse.json({ verificationRequest: updated }, { status: 200 });
  } catch (error) {
    console.error('Verification review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}