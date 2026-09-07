/**
 * Helpers et types pour les agrégations du tableau de bord admin.
 *
 * Tous les indicateurs sont des compteurs ou des distributions agrégées :
 * aucune donnée individuelle ne transite ici.
 */

export interface DistributionItem {
  value: string;
  count: number;
  percent: number;
}

export interface ProfileFillStats {
  totalProfiles: number;
  filledProfiles: number;
  emptyProfiles: number;
  filledPercent: number;
  verifiedCount: number;
  verifiedPercent: number;
  withPhotosCount: number;
  avgPhotoCount: number;
  withGeolocationCount: number;
  withGeolocationPercent: number;
}

export interface EngagementStats {
  messagesLast30d: number;
  likesLast30d: number;
  matchesLast30d: number;
  encountersLast30d: number;
  active7d: number;
  active30d: number;
}

export interface ModerationStats {
  bansLast30d: number;
  unbansLast30d: number;
  deletedUsersLast30d: number;
  reportsResolvedLast30d: number;
  photosClassifiedLast30d: number;
}

export interface AnalyticsStats {
  profileFill: ProfileFillStats;
  genderDistribution: DistributionItem[];
  ageDistribution: DistributionItem[];
  orientationDistribution: DistributionItem[];
  relationshipTypeDistribution: DistributionItem[];
  topInterests: DistributionItem[];
  topPractices: DistributionItem[];
  engagement: EngagementStats;
  moderation: ModerationStats;
}

/**
 * Date seuil pour les compteurs glissants (ex. 30 derniers jours).
 * On garde une précision à la seconde ; Prisma gère la comparaison Date/DateTime.
 */
export function cutoffDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

/**
 * Calcule une tranche d’âge à partir de la date de naissance.
 * Les tranches sont volontairement larges pour éviter toute ré-identification.
 */
export function computeAgeBucket(birthDate: Date): string {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  if (age < 18) return 'Moins de 18 ans';
  if (age <= 25) return '18-25 ans';
  if (age <= 35) return '26-35 ans';
  if (age <= 45) return '36-45 ans';
  if (age <= 55) return '46-55 ans';
  return '56 ans et +';
}

/**
 * Regroupe les petites valeurs au-delà du top N sous une ligne « Autre ».
 * Retourne des pourcentages arrondis à un chiffre après la virgule.
 */
export function withOtherBucket(
  items: Array<{ value: string; count: number }>,
  topN: number,
): DistributionItem[] {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return [];

  const sorted = [...items].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, topN);
  const otherCount = sorted.slice(topN).reduce((sum, item) => sum + item.count, 0);

  const toPercent = (count: number): number =>
    Math.round((count / total) * 1000) / 10;

  const result: DistributionItem[] = top.map((item) => ({
    value: item.value,
    count: item.count,
    percent: toPercent(item.count),
  }));

  if (otherCount > 0) {
    result.push({
      value: 'Autre',
      count: otherCount,
      percent: toPercent(otherCount),
    });
  }

  return result;
}

/**
 * Normalise le résultat d’un `count(*)` Prisma : `BigInt` → `number`.
 */
export function countValue(raw: unknown): number {
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw);
  return 0;
}
