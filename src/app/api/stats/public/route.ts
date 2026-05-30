import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const revalidate = 300; // cache 5 min — pas besoin de temps réel

export async function GET() {
  try {
    const totalUsers = await getDb().user.count({
      where: { isBanned: false },
    });
    const verifiedUsers = await getDb().user.count({
      where: { isVerified: true, isBanned: false },
    });

    return NextResponse.json(
      { totalUsers, verifiedUsers },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch {
    // Si la DB est inaccessible (preview/build), on retourne 0
    return NextResponse.json(
      { totalUsers: 0, verifiedUsers: 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
        },
      },
    );
  }
}