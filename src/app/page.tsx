import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Libre — Rencontre libre et gratuite',
  description: 'Application de rencontre gratuite, sans abonnement ni revente de données. Croisez des célibataires près de chez vous. Notre but, c\'est que vous quittiez l\'appli.',
  alternates: { canonical: 'https://libre.rencontres.app' },
};

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Libre',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    description: 'Application de rencontre gratuite, sans abonnement ni revente de données.',
    featureList: [
      'Rencontre par géolocalisation',
      'Messages chiffrés de bout en bout',
      'Gratuit sans abonnement',
      'Badge vérifié',
      'Modération communautaire',
    ],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-md"
      >
        Aller au contenu principal
      </a>

      <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
          Libre
        </h1>
        <p className="mb-2 max-w-md text-xl font-medium text-gray-700 sm:text-2xl">
          Notre but, c&apos;est que vous quittiez l&apos;appli.
        </p>
        <p className="mb-8 max-w-sm text-base text-gray-500">
          Rencontre libre. Gratuit. Sans revente de donn&eacute;es.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-black px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Cr&eacute;er un compte
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        <Link href="/cgu" className="hover:text-gray-600 hover:underline focus:outline-none focus:underline">
          Conditions g&eacute;n&eacute;rales d&apos;utilisation
        </Link>
      </footer>
    </div>
  );
}