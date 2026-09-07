/**
 * Tests du rendu du tableau de bord admin enrichi.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboard from '@/app/(admin)/admin/page';

const fakeStats = {
  totalUsers: 42,
  bannedUsers: 1,
  pendingReports: 2,
  pendingVerifications: 0,
  openFeedback: 3,
  analytics: {
    profileFill: {
      totalProfiles: 30,
      filledProfiles: 18,
      emptyProfiles: 12,
      filledPercent: 60,
      verifiedCount: 5,
      verifiedPercent: 11.9,
      withPhotosCount: 25,
      avgPhotoCount: 2.3,
      withGeolocationCount: 20,
      withGeolocationPercent: 66.7,
    },
    genderDistribution: [
      { value: 'Homme', count: 15, percent: 50 },
      { value: 'Femme', count: 12, percent: 40 },
      { value: 'Autre', count: 3, percent: 10 },
    ],
    ageDistribution: [
      { value: '18-25 ans', count: 6, percent: 20 },
      { value: '26-35 ans', count: 12, percent: 40 },
      { value: '36-45 ans', count: 9, percent: 30 },
      { value: '46-55 ans', count: 3, percent: 10 },
    ],
    orientationDistribution: [],
    relationshipTypeDistribution: [],
    topInterests: [],
    topPractices: [],
    engagement: {
      messagesLast30d: 120,
      likesLast30d: 340,
      matchesLast30d: 45,
      encountersLast30d: 12,
      active7d: 18,
      active30d: 28,
    },
    moderation: {
      bansLast30d: 1,
      unbansLast30d: 0,
      deletedUsersLast30d: 0,
      reportsResolvedLast30d: 2,
      photosClassifiedLast30d: 4,
    },
  },
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(fakeStats),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche les 5 cartes opérationnelles historiques', async () => {
    render(<AdminDashboard />);

    expect(await screen.findByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Bannis')).toBeInTheDocument();
    expect(screen.getByText('Signalements en attente')).toBeInTheDocument();
    expect(screen.getByText('Vérifications en attente')).toBeInTheDocument();
    expect(screen.getByText('Retours à traiter')).toBeInTheDocument();
  });

  it('affiche les 4 sections analytics', async () => {
    render(<AdminDashboard />);

    expect(await screen.findByText('État des profils')).toBeInTheDocument();
    expect(screen.getByText('Démographie')).toBeInTheDocument();
    expect(screen.getByText('Engagement & rétention (30 jours)')).toBeInTheDocument();
    expect(screen.getByText('Modération (30 jours)')).toBeInTheDocument();
  });

  it('affiche les indicateurs clés de profils', async () => {
    render(<AdminDashboard />);

    expect(await screen.findByText('Profils créés')).toBeInTheDocument();
    expect(screen.getByText('Profils remplis')).toBeInTheDocument();
    expect(screen.getByText('Comptes vérifiés')).toBeInTheDocument();
    expect(screen.getByText('Avec photos')).toBeInTheDocument();
    expect(screen.getByText('Géolocalisation partagée')).toBeInTheDocument();
  });

  it('affiche les distributions démographiques', async () => {
    render(<AdminDashboard />);

    expect(await screen.findByText('Genres')).toBeInTheDocument();
    expect(screen.getByText('Âges')).toBeInTheDocument();
    expect(screen.getByText('Orientations')).toBeInTheDocument();
    expect(screen.getByText('Types de relation')).toBeInTheDocument();
    expect(screen.getByText('Top intérêts')).toBeInTheDocument();
    expect(screen.getByText('Top pratiques')).toBeInTheDocument();
  });

  it('affiche l’état d’erreur si l’API échoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    render(<AdminDashboard />);

    expect(await screen.findByText('Impossible de charger les statistiques')).toBeInTheDocument();
  });
});
