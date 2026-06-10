/**
 * Calculateur de niveau de confiance.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md — Phase 3 tâche 3.1.
 *
 * Architecture : on sépare la logique **pure** (scoreFactors, bandFor) de la
 * logique **DB** (computeTrustLevel, getOrComputeTrustLevel) pour que les
 * boundary tests (19/20, 49/50, 79/80) soient déterministes et instantanés,
 * sans mock Prisma.
 */
import { getDb } from '@/lib/db';
import type { Prisma } from '@/generated/client/client';

export type TrustBand = 'newcomer' | 'member' | 'trusted' | 'anchor';

export const TRUST_BANDS = ['newcomer', 'member', 'trusted', 'anchor'] as const;

/**
 * Facteurs contribuant au score. Chaque champ = points (négatifs ou positifs).
 * `null` = facteur non applicable / pas encore observable.
 */
export interface TrustFactors {
  emailVerified: boolean;          // +10 si true
  selfieVerified: boolean;         // +20 si true (status = 'approved' d'un VerificationRequest)
  accountAgeDays: number;          // paliers 30/90/365 → +10/+10/+10
  hasLaPlaceMessage: boolean;      // +5 si au moins un SquareMessage
  validatedMatchesCount: number;   // +5 si ≥1, +5 (cumulé) si ≥3 → +10 si ≥3
  hasTrustCircle: boolean;         // +10 si au moins un TrustContact
  hasActiveReport: boolean;        // -15 si au moins un Report reçu non-rejeté
  wasBanned: boolean;              // -30 si isBanned=true
}

export interface TrustLevelResult {
  score: number;
  band: TrustBand;
  factors: TrustFactors;
}

// ────────────────────────────────────────────────────────────────────────────
// Logique pure (testable sans DB)
// ────────────────────────────────────────────────────────────────────────────

/** Calcule le score à partir des facteurs. Fonction pure. */
export function scoreFactors(f: TrustFactors): number {
  let score = 0;
  if (f.emailVerified) score += 10;
  if (f.selfieVerified) score += 20;
  if (f.accountAgeDays >= 30) score += 10;
  if (f.accountAgeDays >= 90) score += 10;
  if (f.accountAgeDays >= 365) score += 10;
  if (f.hasLaPlaceMessage) score += 5;
  if (f.validatedMatchesCount >= 1) score += 5;
  if (f.validatedMatchesCount >= 3) score += 5; // cumulé → +10 total à partir de 3
  if (f.hasTrustCircle) score += 10;
  if (f.hasActiveReport) score -= 15;
  if (f.wasBanned) score -= 30;
  return score;
}

/**
 * Détermine le band à partir du score. Bornes inclusives côté inférieur.
 *
 * - 0..19   → newcomer
 * - 20..49  → member
 * - 50..79  → trusted
 * - 80..∞   → anchor
 *
 * Fonction pure.
 */
export function bandFor(score: number): TrustBand {
  if (score < 0) return 'newcomer'; // un user très négatif reste "newcomer" (pas d'autre band)
  if (score < 20) return 'newcomer';
  if (score < 50) return 'member';
  if (score < 80) return 'trusted';
  return 'anchor';
}

// ────────────────────────────────────────────────────────────────────────────
// Logique DB
// ────────────────────────────────────────────────────────────────────────────

/**
 * Récupère les facteurs d'un user depuis la DB.
 * Lecture seule, peut être wrappée dans une transaction.
 */
export async function loadFactors(
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<TrustFactors> {
  const db = tx ?? getDb();
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      emailVerified: true,
      isBanned: true,
      createdAt: true,
    },
  });

  // Selfie vérifié = au moins un VerificationRequest avec status='approved'
  const approvedVerification = await db.verificationRequest.findFirst({
    where: { userId, status: 'approved' },
    select: { id: true },
  });

  // A interagi sur La Place = au moins une SquareReaction posée.
  // NB: SquareMessage (le message lui-même) est anonyme — pas de relation User.
  // Le plan dit "≥1 message La Place" : on interprète comme "≥1 interaction
  // observable côté user authentifié" (réaction). Cf. commentaire chantier 01
  // plan.md si l'interprétation doit passer à "≥1 message signé" plus tard.
  const laPlaceInteraction = await db.squareReaction.findFirst({
    where: { userId },
    select: { id: true },
  });

  // Matchs validés = count des Match où le user est userA ou userB
  // (le plan dit "matchs validés" — en V1 un match n'a pas de champ validatedAt,
  // on prend juste l'existence d'un match comme proxy).
  const matchCount = await db.match.count({
    where: {
      OR: [{ userA: userId }, { userB: userId }],
    },
  });

  // A déclaré un Cercle = au moins un TrustContact où ownerId = userId
  const trustCircle = await db.trustContact.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  // Signalement reçu non-rejeté = Report où reportedId = userId ET status != 'rejected'
  // (status possibles: 'pending', 'reviewed', 'actioned' — 'rejected' = modé a innocenté)
  const activeReport = await db.report.findFirst({
    where: {
      reportedId: userId,
      status: { not: 'rejected' },
    },
    select: { id: true },
  });

  const accountAgeDays = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    emailVerified: user.emailVerified !== null,
    selfieVerified: approvedVerification !== null,
    accountAgeDays,
    hasLaPlaceMessage: laPlaceInteraction !== null,
    validatedMatchesCount: matchCount,
    hasTrustCircle: trustCircle !== null,
    hasActiveReport: activeReport !== null,
    wasBanned: user.isBanned,
  };
}

/**
 * Calcule le TrustLevel d'un user et **upsert** dans la table trust_levels.
 *
 * Ne pas appeler en hot-path (utiliser getOrComputeTrustLevel à la place).
 *
 * @returns score, band, factors + (via upsert) la ligne DB mise à jour.
 */
export async function computeTrustLevel(userId: string): Promise<TrustLevelResult> {
  const db = getDb();
  const factors = await loadFactors(userId);
  const score = scoreFactors(factors);
  const band = bandFor(score);

  await db.trustLevel.upsert({
    where: { userId },
    create: { userId, score, band, factors: factors as unknown as Prisma.InputJsonValue },
    update: { score, band, factors: factors as unknown as Prisma.InputJsonValue, lastComputedAt: new Date() },
  });

  return { score, band, factors };
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Récupère le TrustLevel d'un user. Si le cache DB a <1h, retourne la valeur
 * cachée. Sinon, recalcule (lazy).
 *
 * Stratégie : on s'appuie sur `TrustLevel.lastComputedAt`. Si l'événement
 * upstream (vérif, signalement, etc.) doit forcer un recompute, l'appelant
 * doit soit (a) appeler computeTrustLevel directement, soit (b) modifier
 * `lastComputedAt` à `null` via une migration (pas en V1).
 */
export async function getOrComputeTrustLevel(
  userId: string,
  ttlMs: number = ONE_HOUR_MS,
): Promise<TrustLevelResult> {
  const db = getDb();
  const cached = await db.trustLevel.findUnique({
    where: { userId },
  });

  const now = Date.now();
  if (cached && now - cached.lastComputedAt.getTime() < ttlMs) {
    return {
      score: cached.score,
      band: cached.band as TrustBand,
      factors: cached.factors as unknown as TrustFactors,
    };
  }

  return computeTrustLevel(userId);
}
