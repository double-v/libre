'use client';

import { useState, useEffect } from 'react';
import AnalyticsSection from '@/components/admin/AnalyticsSection';
import DistributionBar from '@/components/admin/DistributionBar';
import MetricCard from '@/components/admin/MetricCard';
import type { AnalyticsStats } from '@/lib/admin-analytics';
import RetentionAlert from '@/components/admin/RetentionAlert';

interface DashboardStats {
  totalUsers: number;
  bannedUsers: number;
  pendingReports: number;
  pendingVerifications: number;
  openFeedback: number;
  analytics: AnalyticsStats;
}

const fmt = new Intl.NumberFormat('fr-FR');
/** Pourcentage arrondi, « — » quand il n'y a encore personne. */
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)} %` : '—');
const fmtPct = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      })
      .then(setStats)
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center text-muted">Chargement…</div>;
  }

  if (error) {
    return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>;
  }

  if (!stats) return null;

  const cards = [
    { label: 'Utilisateurs', value: stats.totalUsers, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Bannis', value: stats.bannedUsers, color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'Signalements en attente', value: stats.pendingReports, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Vérifications en attente', value: stats.pendingVerifications, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Retours à traiter', value: stats.openFeedback, color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  ];

  const a = stats.analytics;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-content">Tableau de bord</h1>
      <RetentionAlert />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl border border-hairline p-4 ${card.color}`}>
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="mt-1 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <AnalyticsSection title="État des profils">
        <MetricCard
          label="Profils créés"
          value={fmt.format(a.profileFill.totalProfiles)}
          subtitle={`${fmtPct.format(a.profileFill.filledPercent)} % remplis`}
          accent="coral"
        />
        <MetricCard
          label="Profils remplis"
          value={`${fmtPct.format(a.profileFill.filledPercent)} %`}
          subtitle={`${fmt.format(a.profileFill.filledProfiles)} sur ${fmt.format(a.profileFill.totalProfiles)}`}
          accent="success"
        />
        <MetricCard
          label="Comptes vérifiés"
          value={`${fmtPct.format(a.profileFill.verifiedPercent)} %`}
          subtitle={`${fmt.format(a.profileFill.verifiedCount)} comptes`}
          accent="gold"
        />
        <MetricCard
          label="Avec photos"
          value={`${fmt.format(a.profileFill.withPhotosCount)}`}
          subtitle={`${fmtPct.format(a.profileFill.avgPhotoCount)} photo(s) en moyenne`}
          accent="coral"
        />
        <MetricCard
          label="Géolocalisation partagée"
          value={`${fmtPct.format(a.profileFill.withGeolocationPercent)} %`}
          subtitle={`${fmt.format(a.profileFill.withGeolocationCount)} profils`}
          accent="muted"
        />
      </AnalyticsSection>

      <AnalyticsSection title="Démographie">
        <DistributionBar title="Genres" items={a.genderDistribution} />
        <DistributionBar title="Âges" items={a.ageDistribution} />
        <DistributionBar title="Orientations" items={a.orientationDistribution} />
        <DistributionBar title="Types de relation" items={a.relationshipTypeDistribution} />
        <DistributionBar title="Top intérêts" items={a.topInterests} />
        <DistributionBar title="Top pratiques" items={a.topPractices} />
      </AnalyticsSection>

      <AnalyticsSection title="Engagement & rétention (30 jours)">
        <MetricCard
          label="Messages"
          value={fmt.format(a.engagement.messagesLast30d)}
          accent="coral"
        />
        <MetricCard
          label="Likes"
          value={fmt.format(a.engagement.likesLast30d)}
          accent="coral"
        />
        <MetricCard
          label="Matches"
          value={fmt.format(a.engagement.matchesLast30d)}
          accent="coral"
        />
        <MetricCard
          label="Rencontres"
          value={fmt.format(a.engagement.encountersLast30d)}
          accent="coral"
        />
        <MetricCard
          label="Actifs 7 jours"
          value={fmt.format(a.engagement.active7d)}
          subtitle="utilisateurs uniques"
          accent="success"
        />
        <MetricCard
          label="Actifs 30 jours"
          value={fmt.format(a.engagement.active30d)}
          subtitle="utilisateurs uniques"
          accent="success"
        />
      </AnalyticsSection>

      {/* Le premier quart d'heure (spec 005) : ce que produisent les comptes
          créés depuis 30 jours. Les pourcentages sont les critères de succès
          de la spec (photo ≥ 60 %, position ≥ 50 %, push ≥ 30 %, retour ≥ 20 %). */}
      <AnalyticsSection title="Premier quart d'heure (inscrits des 30 derniers jours)">
        <MetricCard label="Inscrits" value={fmt.format(a.onboarding.signups30d)} accent="muted" />
        <MetricCard
          label="Avec photo"
          value={pct(a.onboarding.withPhoto, a.onboarding.signups30d)}
          subtitle={`${fmt.format(a.onboarding.withPhoto)} · objectif 60 %`}
        />
        <MetricCard
          label="Avec position"
          value={pct(a.onboarding.withPosition, a.onboarding.signups30d)}
          subtitle={`${fmt.format(a.onboarding.withPosition)} · objectif 50 %`}
        />
        <MetricCard
          label="Type de relation"
          value={pct(a.onboarding.withRelationshipType, a.onboarding.signups30d)}
          subtitle={`${fmt.format(a.onboarding.withRelationshipType)} · objectif 60 %`}
        />
        <MetricCard
          label="Parcours terminé"
          value={pct(a.onboarding.onboardingDone, a.onboarding.signups30d)}
          subtitle={fmt.format(a.onboarding.onboardingDone)}
          accent="gold"
        />
        <MetricCard
          label="Revenus après J+1"
          value={pct(a.onboarding.returnedAfterDay1, a.onboarding.signups30d)}
          subtitle={`${fmt.format(a.onboarding.returnedAfterDay1)} · objectif 20 %`}
          accent="success"
        />
        <MetricCard
          label="Appareils abonnés au push"
          value={fmt.format(a.onboarding.pushDevices)}
          subtitle="tous comptes · objectif 30 % des inscrits"
          accent="success"
        />
      </AnalyticsSection>

      <AnalyticsSection title="Modération (30 jours)">
        <MetricCard
          label="Bannissements"
          value={fmt.format(a.moderation.bansLast30d)}
          accent="coral"
        />
        <MetricCard
          label="Débannissements"
          value={fmt.format(a.moderation.unbansLast30d)}
          accent="gold"
        />
        <MetricCard
          label="Suppressions"
          value={fmt.format(a.moderation.deletedUsersLast30d)}
          accent="muted"
        />
        <MetricCard
          label="Signalements résolus"
          value={fmt.format(a.moderation.reportsResolvedLast30d)}
          accent="success"
        />
        <MetricCard
          label="Photos classifiées"
          value={fmt.format(a.moderation.photosClassifiedLast30d)}
          accent="coral"
        />
      </AnalyticsSection>
    </div>
  );
}
