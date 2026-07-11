import type { Metadata } from 'next';
import VersionWatcher from '@/components/VersionWatcher';
import HomeLobby from '@/components/home-lobby/HomeLobby';

// Cutover home « lobby » (#250, épic #243) : la landing publique est désormais
// portée par `HomeLobby` (NAV + HERO + bandeau ambiant + Humains/Sécurité/Closing
// + footer légal). On PRÉSERVE tout le SEO sensible de l'ancienne home : metadata
// + canonical www, `force-dynamic`, compteur d'utilisateurs, jsonLd, VersionWatcher.

// Kill Vercel/Next HTML caching on the home. The page is essentially static
// (user count) but Google Search Console flagged the cached 5-min version as
// "page with redirect" during the getlibre.fr -> www.getlibre.fr domain history.
// Forcing dynamic render also keeps the canonical in sync with the eventual final
// URL (no stale HTML pointing at a moved domain).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CANONICAL_ORIGIN = 'https://www.getlibre.fr';
const BUILD_SHA =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_BUILD_SHA ??
  'dev';

export const metadata: Metadata = {
  title: 'Libre — Rencontre gratuite, sans abonnement ni revente de données',
  description:
    "Application de rencontre 100% gratuite. Pas d'abonnement, pas de microtransactions, pas de revente de données. Parce que rencontrer ne devrait rien coûter.",
  alternates: { canonical: `${CANONICAL_ORIGIN}/` },
};

/* ------------------------------------------------------------------ */
/*  Server data: fetch user count for the live counter                 */
/* ------------------------------------------------------------------ */
async function getUserCount() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/stats/public`,
      { cache: 'no-store' },
    );
    if (!res.ok) return { totalUsers: 0, verifiedUsers: 0 };
    return res.json() as Promise<{ totalUsers: number; verifiedUsers: number }>;
  } catch {
    return { totalUsers: 0, verifiedUsers: 0 };
  }
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default async function Home() {
  const { totalUsers } = await getUserCount();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Libre',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    description:
      'Application de rencontre gratuite, sans abonnement ni revente de données.',
    featureList: [
      'Rencontre par géolocalisation',
      'Messages chiffrés de bout en bout',
      'Gratuit sans abonnement',
      'Badge vérifié',
      'Modération communautaire',
    ],
  };

  return (
    <>
      {/* jsonLd SoftwareApplication propre à la home (le layout racine fournit déjà
          Organization + WebSite, le skip link global et CookieBanner). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeLobby userCount={totalUsers} />

      <VersionWatcher initialSha={BUILD_SHA} />
    </>
  );
}
