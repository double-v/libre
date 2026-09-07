/**
 * Tests de l’endpoint analytics du tableau de bord admin.
 *
 * Vérifie le contrôle d’accès ADMIN et la forme de la réponse enrichie
 * (5 compteurs historiques + clé `analytics` avec les 4 packs d’indicateurs).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { count: vi.fn(), findUnique: vi.fn() },
  profile: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  message: { count: vi.fn() },
  like: { count: vi.fn() },
  match: { count: vi.fn() },
  encounter: { count: vi.fn() },
  report: { count: vi.fn() },
  verificationRequest: { count: vi.fn() },
  feedback: { count: vi.fn() },
  moderationLog: { groupBy: vi.fn() },
  photoModeration: { count: vi.fn() },
  $queryRaw: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

const { GET } = await import('@/app/api/admin/stats/route');

function adminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@x.fr', role: 'ADMIN' },
  });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
}

function nonAdminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'user-1', email: 'u@x.fr', role: 'USER' },
  });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/stats — contrôle d\'accès', () => {
  it('renvoie 404 à un non-admin (masque l\'existence de la route)', async () => {
    nonAdminSession();
    expect((await GET()).status).toBe(404);
  });

  it('renvoie 404 sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });

  it('laisse passer un admin (200)', async () => {
    adminSession();
    setupHarmlessMocks();
    expect((await GET()).status).toBe(200);
  });
});

describe('GET /api/admin/stats — forme de la réponse', () => {
  beforeEach(() => {
    adminSession();
    setupHarmlessMocks();
  });

  it('conserve les 5 compteurs historiques', async () => {
    fakeDb.user.count.mockResolvedValueOnce(120);
    fakeDb.user.count.mockResolvedValueOnce(3);
    fakeDb.report.count.mockResolvedValueOnce(5);
    fakeDb.verificationRequest.count.mockResolvedValueOnce(2);
    fakeDb.feedback.count.mockResolvedValueOnce(8);

    const res = await GET();
    const data = await res.json();

    expect(data.totalUsers).toBe(120);
    expect(data.bannedUsers).toBe(3);
    expect(data.pendingReports).toBe(5);
    expect(data.pendingVerifications).toBe(2);
    expect(data.openFeedback).toBe(8);
  });

  it('expose les 4 packs analytics avec les bons types', async () => {
    const res = await GET();
    const data = await res.json();

    expect(data.analytics).toBeDefined();
    expect(data.analytics.profileFill).toMatchObject({
      totalProfiles: expect.any(Number),
      filledProfiles: expect.any(Number),
      emptyProfiles: expect.any(Number),
      filledPercent: expect.any(Number),
    });
    expect(data.analytics.genderDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'Homme', count: 10, percent: expect.any(Number) }),
      ]),
    );
    expect(data.analytics.ageDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '18-25 ans', count: expect.any(Number), percent: expect.any(Number) }),
      ]),
    );
    expect(data.analytics.engagement).toMatchObject({
      messagesLast30d: expect.any(Number),
      likesLast30d: expect.any(Number),
      matchesLast30d: expect.any(Number),
      encountersLast30d: expect.any(Number),
      active7d: expect.any(Number),
      active30d: expect.any(Number),
    });
    expect(data.analytics.moderation).toMatchObject({
      bansLast30d: expect.any(Number),
      unbansLast30d: expect.any(Number),
      deletedUsersLast30d: expect.any(Number),
      reportsResolvedLast30d: expect.any(Number),
      photosClassifiedLast30d: expect.any(Number),
    });
  });

  it('gère une base vide sans erreur', async () => {
    fakeDb.user.count.mockResolvedValue(0);
    fakeDb.profile.count.mockResolvedValue(0);
    fakeDb.profile.groupBy.mockResolvedValue([]);
    fakeDb.profile.findMany.mockResolvedValue([]);
    fakeDb.$queryRaw.mockResolvedValue([]);
    fakeDb.message.count.mockResolvedValue(0);
    fakeDb.like.count.mockResolvedValue(0);
    fakeDb.match.count.mockResolvedValue(0);
    fakeDb.encounter.count.mockResolvedValue(0);
    fakeDb.report.count.mockResolvedValue(0);
    fakeDb.verificationRequest.count.mockResolvedValue(0);
    fakeDb.feedback.count.mockResolvedValue(0);
    fakeDb.moderationLog.groupBy.mockResolvedValue([]);
    fakeDb.photoModeration.count.mockResolvedValue(0);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.analytics.profileFill.filledPercent).toBe(0);
    expect(data.analytics.genderDistribution).toEqual([]);
    expect(data.analytics.ageDistribution).toEqual([]);
  });
});

function setupHarmlessMocks() {
  // Les 5 compteurs historiques
  fakeDb.user.count.mockResolvedValue(0);
  fakeDb.report.count.mockResolvedValue(0);
  fakeDb.verificationRequest.count.mockResolvedValue(0);
  fakeDb.feedback.count.mockResolvedValue(0);

  // Profils
  fakeDb.profile.count.mockResolvedValue(0);
  fakeDb.profile.groupBy.mockResolvedValue([
    { genderIdentity: 'Homme', _count: { genderIdentity: 10 } },
  ]);
  fakeDb.profile.findMany.mockResolvedValue([
    { birthDate: new Date('2005-06-15') },
    { birthDate: new Date('1995-03-20') },
    { birthDate: new Date('1992-11-02') },
    { birthDate: new Date('1988-07-30') },
  ]);
  fakeDb.$queryRaw.mockResolvedValue([{ avg: 2.3 }]);

  // Engagement
  fakeDb.message.count.mockResolvedValue(0);
  fakeDb.like.count.mockResolvedValue(0);
  fakeDb.match.count.mockResolvedValue(0);
  fakeDb.encounter.count.mockResolvedValue(0);

  // Distributions sur tableaux
  fakeDb.$queryRaw
    .mockResolvedValueOnce([{ avg: 2.3 }])
    .mockResolvedValueOnce([
      { value: 'Hétéro', count: BigInt(12) },
      { value: 'Bi', count: BigInt(5) },
    ])
    .mockResolvedValueOnce([
      { value: 'Sérieuse', count: BigInt(8) },
      { value: 'Amicale', count: BigInt(3) },
    ])
    .mockResolvedValueOnce([
      { value: 'Randonnée', count: BigInt(6) },
      { value: 'Cinéma', count: BigInt(4) },
    ])
    .mockResolvedValueOnce([
      { value: 'Polyamour', count: BigInt(2) },
    ]);

  // Modération
  fakeDb.moderationLog.groupBy.mockResolvedValue([]);
  fakeDb.photoModeration.count.mockResolvedValue(0);
}
