import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Libre — Rencontre gratuite, sans abonnement ni revente de données',
  description:
    'Application de rencontre 100% gratuite. Pas d\'abonnement, pas de microtransactions, pas de revente de données. Parce que rencontrer ne devrait rien coûter.',
  alternates: { canonical: 'https://libre.rencontres.app' },
};

const facts = [
  {
    number: '~240 €',
    label: "Coût annuel moyen d'un abonnement dating app",
  },
  {
    number: '47 %',
    label: 'Des abonnés regrettent leur achat dans le mois',
    source: 'UFC-Que Choisir, 2025',
  },
  {
    number: '0 €',
    label: 'Chez Libre. Pour toujours.',
  },
];

const comparisons = [
  {
    title: 'Likes limités sans abonnement',
    detail: 'Swipes bridés, fonctionnalités verrouillées — la version gratuite est conçue pour pousser à payer.',
  },
  {
    title: 'Microtransactions à chaque action',
    detail: 'Super Like à 5 €, Boost à l\'unité, Compliment à 3 €... Le coût réel dépasse vite l\'abonnement.',
  },
  {
    title: 'Prix variables selon votre profil',
    detail: 'Tarification dynamique : deux personnes voisient des prix différents pour le même abonnement.',
  },
  {
    title: 'Renouvellement automatique par défaut',
    detail: 'On s\'abonne un mois, on oublie d\'annuler, et les prélèvements continuent.',
  },
];

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
    <div className="flex min-h-screen flex-col bg-white">
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

      <main id="main-content" className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
            <span className="text-coral">Libre</span>
          </h1>
          <p className="mb-2 max-w-md text-xl font-medium text-gray-800 sm:text-2xl">
            Parce que rencontrer ne devrait rien coûter.
          </p>
          <p className="mb-8 max-w-lg text-base text-gray-600">
            Rencontre gratuite. Sans abonnement. Sans microtransaction. Sans revente de données.
            <br />
            Parce que quand c&apos;est gratuit, tout le monde est l&agrave;.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-full bg-terracotta px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Cr&eacute;er un compte gratuitement
            </Link>
          </div>
        </section>

        {/* Chiffres */}
        <section className="border-t border-gray-100 bg-blush px-6 py-12">
          <div className="mx-auto grid max-w-2xl gap-8 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.number} className="text-center">
                <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {fact.number}
                </p>
                <p className="mt-2 text-sm text-gray-600">{fact.label}</p>
                {fact.source && (
                  <p className="mt-1 text-xs text-gray-400">{fact.source}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Constat */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
              Les apps de rencontre font payer l&apos;espoir
            </h2>
            <ul className="space-y-5">
              {comparisons.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-1 shrink-0 text-lg text-gray-300" aria-hidden="true">
                    &bull;
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Argument Libre */}
        <section className="border-t border-gray-100 bg-black px-6 py-12 text-center text-white">
          <div className="mx-auto max-w-xl">
            <h2 className="mb-4 text-2xl font-bold">
              Gratuit = plus de c&eacute;libataires = plus de chances
            </h2>
            <p className="mb-6 text-sm text-gray-300">
              Pas de barri&egrave;re financi&egrave;re, pas de fonctionnalit&eacute; verrouill&eacute;e, pas de
              boost &agrave; acheter. Tout le monde a acc&egrave;s &agrave; tout. R&eacute;sultat : plus de
              profils, plus de croisements, plus de possibilit&eacute;s de contact.
            </p>
            <p className="mb-8 text-sm text-gray-300">
              Le chat n&apos;est pas le produit. C&apos;est le pont vers la vraie vie. Une fois le
              contact &eacute;tabli, on &eacute;change ses coordonn&eacute;es et on se voit.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="font-semibold">Croisements IRL</p>
                <p className="text-xs text-gray-400">
                  D&eacute;couvrez les c&eacute;libataires que vous croisez au quotidien
                </p>
              </div>
              <div>
                <p className="font-semibold">Chat chiffr&eacute; E2E</p>
                <p className="text-xs text-gray-400">
                  Le serveur ne lit jamais vos messages
                </p>
              </div>
              <div>
                <p className="font-semibold">Mod&eacute;ration communautaire</p>
                <p className="text-xs text-gray-400">
                  Signalement, blocage, badge v&eacute;rifi&eacute;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="flex flex-col items-center px-6 py-12 text-center">
          <p className="mb-2 text-lg font-medium text-gray-800">
            0 &euro;. Pas d&apos;abonnement. Pas de pi&egrave;ges.
          </p>
          <p className="mb-6 text-sm text-gray-600">
            Rejoignez ceux qui refusent de payer pour esp&eacute;rer.
          </p>
          <Link
            href="/register"
            className="rounded-full bg-terracotta px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2"
          >
            Cr&eacute;er un compte
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        <Link href="/cgu" className="hover:text-gray-600 hover:underline focus:outline-none focus:underline">
          Conditions g&eacute;n&eacute;rales d&apos;utilisation
        </Link>
      </footer>
    </div>
  );
}