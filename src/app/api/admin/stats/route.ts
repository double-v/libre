import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import {
  cutoffDate,
  withOtherBucket,
  computeAgeBucket,
  countValue,
  type AnalyticsStats,
} from '@/lib/admin-analytics';

export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const [
    totalUsers,
    bannedUsers,
    pendingReports,
    pendingVerifications,
    openFeedback,
  ] = await Promise.all([
    getDb().user.count(),
    getDb().user.count({ where: { isBanned: true } }),
    getDb().report.count({ where: { status: 'pending' } }),
    getDb().verificationRequest.count({ where: { status: 'pending' } }),
    getDb().feedback.count({ where: { status: 'open' } }),
  ]);

  const analytics = await computeAnalytics(totalUsers);

  return NextResponse.json({
    totalUsers,
    bannedUsers,
    pendingReports,
    pendingVerifications,
    openFeedback,
    analytics,
  });
}

async function computeAnalytics(totalUsers: number): Promise<AnalyticsStats> {
  const cutoff30d = cutoffDate(30);
  const cutoff7d = cutoffDate(7);

  const [
    totalProfiles,
    filledProfiles,
    verifiedCount,
    withPhotosCount,
    withGeolocationCount,
    avgPhotoResult,
    genderRows,
    birthDateRows,
    orientationRows,
    relationshipRows,
    interestRows,
    practiceRows,
    messagesLast30d,
    likesLast30d,
    matchesLast30d,
    encountersLast30d,
    active7d,
    active30d,
    moderationActions,
    reportsResolvedLast30d,
    photosClassifiedLast30d,
  ] = await Promise.all([
    getDb().profile.count(),
    getDb().profile.count({
      where: {
        birthDate: { not: null },
        genderIdentity: { not: '' },
        photos: { isEmpty: false },
      },
    }),
    getDb().user.count({ where: { isVerified: true } }),
    getDb().profile.count({ where: { photos: { isEmpty: false } } }),
    getDb().profile.count({ where: { lastGeolocAt: { not: null } } }),
    getDb().$queryRaw<[{ avg: number | null }]>`
      SELECT AVG(COALESCE(array_length(photos, 1), 0)) as avg
      FROM "profiles"
    `,
    getDb().profile.groupBy({
      by: ['genderIdentity'],
      where: { genderIdentity: { not: '' } },
      _count: { genderIdentity: true },
      orderBy: { _count: { genderIdentity: 'desc' } },
    }),
    getDb().profile.findMany({
      where: { birthDate: { not: null } },
      select: { birthDate: true },
    }),
    getDb().$queryRaw<Array<{ value: string; count: bigint }>>`
      SELECT value, COUNT(*) as count
      FROM (
        SELECT unnest(COALESCE(orientation, '{}'::text[])) as value
        FROM "profiles"
      ) t
      WHERE value IS NOT NULL
      GROUP BY value
      ORDER BY count DESC
    `,
    getDb().$queryRaw<Array<{ value: string; count: bigint }>>`
      SELECT value, COUNT(*) as count
      FROM (
        SELECT unnest(COALESCE("relationshipType", '{}'::text[])) as value
        FROM "profiles"
      ) t
      WHERE value IS NOT NULL
      GROUP BY value
      ORDER BY count DESC
    `,
    getDb().$queryRaw<Array<{ value: string; count: bigint }>>`
      SELECT value, COUNT(*) as count
      FROM (
        SELECT unnest(COALESCE(interests, '{}'::text[])) as value
        FROM "profiles"
      ) t
      WHERE value IS NOT NULL
      GROUP BY value
      ORDER BY count DESC
    `,
    getDb().$queryRaw<Array<{ value: string; count: bigint }>>`
      SELECT value, COUNT(*) as count
      FROM (
        SELECT unnest(COALESCE(practices, '{}'::text[])) as value
        FROM "profiles"
      ) t
      WHERE value IS NOT NULL
      GROUP BY value
      ORDER BY count DESC
    `,
    getDb().message.count({ where: { createdAt: { gte: cutoff30d } } }),
    getDb().like.count({ where: { createdAt: { gte: cutoff30d } } }),
    getDb().match.count({ where: { createdAt: { gte: cutoff30d } } }),
    getDb().encounter.count({ where: { happenedAt: { gte: cutoff30d } } }),
    getDb().user.count({ where: { lastActive: { gte: cutoff7d } } }),
    getDb().user.count({ where: { lastActive: { gte: cutoff30d } } }),
    getDb().moderationLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: cutoff30d } },
      _count: { action: true },
    }),
    getDb().report.count({
      where: { status: 'resolved', resolvedAt: { gte: cutoff30d } },
    }),
    getDb().photoModeration.count({ where: { createdAt: { gte: cutoff30d } } }),
  ]);

  const avgPhotoCount = avgPhotoResult[0]?.avg ?? 0;

  // Âge : on compte les profils dans chaque tranche depuis les dates de naissance.
  const ageBuckets: Record<string, number> = {};
  for (const { birthDate } of birthDateRows) {
    if (!birthDate) continue;
    const bucket = computeAgeBucket(birthDate);
    ageBuckets[bucket] = (ageBuckets[bucket] ?? 0) + 1;
  }
  const ageDistribution = distributionFromRecord(ageBuckets, [
    '18-25 ans',
    '26-35 ans',
    '36-45 ans',
    '46-55 ans',
    '56 ans et +',
    'Moins de 18 ans',
  ]);

  const genderDistribution = withOtherBucket(
    genderRows.map((row) => ({
      value: row.genderIdentity,
      count: row._count.genderIdentity,
    })),
    8,
  );

  const orientationDistribution = withOtherBucket(
    orientationRows.map((row) => ({
      value: row.value,
      count: countValue(row.count),
    })),
    8,
  );

  const relationshipTypeDistribution = withOtherBucket(
    relationshipRows.map((row) => ({
      value: row.value,
      count: countValue(row.count),
    })),
    8,
  );

  const topInterests = withOtherBucket(
    interestRows.map((row) => ({
      value: row.value,
      count: countValue(row.count),
    })),
    10,
  );

  const topPractices = withOtherBucket(
    practiceRows.map((row) => ({
      value: row.value,
      count: countValue(row.count),
    })),
    10,
  );

  const moderationMap = Object.fromEntries(
    moderationActions.map((row) => [row.action, row._count.action]),
  );

  return {
    profileFill: {
      totalProfiles,
      filledProfiles,
      emptyProfiles: totalProfiles - filledProfiles,
      filledPercent: percent(filledProfiles, totalProfiles),
      verifiedCount,
      verifiedPercent: percent(verifiedCount, totalUsers),
      withPhotosCount,
      avgPhotoCount: Number.isFinite(avgPhotoCount) ? Math.round(avgPhotoCount * 10) / 10 : 0,
      withGeolocationCount,
      withGeolocationPercent: percent(withGeolocationCount, totalProfiles),
    },
    genderDistribution,
    ageDistribution,
    orientationDistribution,
    relationshipTypeDistribution,
    topInterests,
    topPractices,
    engagement: {
      messagesLast30d,
      likesLast30d,
      matchesLast30d,
      encountersLast30d,
      active7d,
      active30d,
    },
    moderation: {
      bansLast30d: moderationMap['BAN'] ?? 0,
      unbansLast30d: moderationMap['UNBAN'] ?? 0,
      deletedUsersLast30d: moderationMap['DELETE_USER'] ?? 0,
      reportsResolvedLast30d,
      photosClassifiedLast30d,
    },
  };
}

function distributionFromRecord(
  record: Record<string, number>,
  order: string[],
): import('@/lib/admin-analytics').DistributionItem[] {
  const total = Object.values(record).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  return order
    .filter((key) => (record[key] ?? 0) > 0)
    .map((key) => ({
      value: key,
      count: record[key] ?? 0,
      percent: Math.round(((record[key] ?? 0) / total) * 1000) / 10,
    }));
}

function percent(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}
