import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, isAdminSession } from '@/lib/admin';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminResult = await requireAdmin();
    if (!isAdminSession(adminResult)) {
      return adminResult;
    }
    const reviewerId = adminResult.userId;
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
    const verificationRequest = await getDb().verificationRequest.findUnique({
      where: { id },
    });

    if (!verificationRequest) {
      return NextResponse.json(
        { error: 'Verification request not found' },
        { status: 404 },
      );
    }

    // Update the verification request
    const updated = await getDb().verificationRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: reviewerId,
        resolvedAt: new Date(),
      },
    });

    // If approved, update the user's isVerified flag
    if (status === 'approved') {
      await getDb().user.update({
        where: { id: verificationRequest.userId },
        data: { isVerified: true },
      });
    }

    return NextResponse.json({ verificationRequest: updated }, { status: 200 });
  } catch (error) {
    console.error('Verification review error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}