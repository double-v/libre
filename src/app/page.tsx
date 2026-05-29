import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Libre — Rencontre gratuite, sans abonnement ni revente de données',
  description:
    "Application de rencontre 100% gratuite. Pas d'abonnement, pas de microtransactions, pas de revente de données. Parce que rencontrer ne devrait rien coûter.",
  alternates: { canonical: '/' },
};

export default function Home() {
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
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-coral">
        Aller au contenu principal
      </a>

      <main id="main-content">
      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Accueil Libre" className="flex items-center gap-2">
          <svg viewBox="76 36 360 360" className="h-8 w-8" fill="currentColor" aria-hidden="true">
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)" />
            <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
          </svg>
          <span className="text-2xl font-bold tracking-tight text-coral">Libre</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            Se connecter
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta"
          >
            Créer un compte
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1767790693308-b630592ab50f?w=1200&q=80"
            alt=""
            fill
            className="object-cover blur-[6px] brightness-110 scale-110"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blush/90 via-blush/90 to-sand/85" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-10 px-6 py-16 sm:flex-row sm:py-24">
          <div className="flex-1 text-center sm:text-left">
            <h1 className="mb-3 text-5xl font-extrabold tracking-tight sm:text-6xl">
              <span className="text-coral">Libre</span>
            </h1>
            <p className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200 sm:text-2xl">
              Parce que rencontrer ne devrait rien coûter.
            </p>
            <p className="mb-8 text-base text-gray-600 dark:text-gray-400">
              Rencontre gratuite. Sans abonnement. Sans microtransaction. Sans revente de données.
              <br />
              Parce que quand c&apos;est gratuit, tout le monde est là.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-terracotta px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2 dark:focus:ring-offset-gray-950"
              >
                Créer un compte gratuitement
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-white/70 px-8 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800/90 dark:focus:ring-offset-gray-950"
              >
                Se connecter
              </Link>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center">
            <svg viewBox="76 36 360 360" className="h-44 w-44 opacity-15" fill="currentColor" aria-hidden="true">
              <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)" />
              <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)" />
              <rect x="236" y="42" width="40" height="120" rx="20" />
              <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)" />
              <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)" />
              <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
            </svg>
            <span className="absolute -top-2 -right-3 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-coral shadow-sm dark:bg-gray-800">🔒 Chiffré E2E</span>
            <span className="absolute -bottom-1 -left-4 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-coral shadow-sm dark:bg-gray-800">✅ Badge vérifié</span>
            <span className="absolute right-[-1.25rem] top-1/2 -translate-y-1/2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-coral shadow-sm dark:bg-gray-800">👥 Modération</span>
          </div>
        </div>
      </section>

      {/* Chiffres */}
      <section className="bg-blush px-6 py-16 dark:bg-coral/10">
        <div className="mx-auto max-w-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-6xl font-extrabold tracking-tight text-coral sm:text-7xl">0 €</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pour toujours. Pas d'abonnement, pas de piège.</p>
            <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">La concurrence facture ~240 €/an et 47 % des abonnés regrettent leur achat (UFC-Que Choisir, 2025). Libre ne facture rien, jamais.</p>
          </div>
        </div>
      </section>

      {/* Constat */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            Les apps de rencontre font payer l&apos;espoir
          </h2>
          <p className="mb-10 text-center text-base text-gray-600 dark:text-gray-400">
            Swipes bridés, boosts à l&apos;unité, prix variables selon le profil : la version gratuite est conçue pour frustrer et pousser à payer.
          </p>

          <div className="space-y-4">
            {[
              { title: 'Likes limités sans abonnement', detail: 'Swipes bridés, fonctionnalités verrouillées — la version gratuite pousse à payer.' },
              { title: 'Microtransactions à chaque action', detail: "Super Like à 5 €, Boost à l'unité... Le coût réel dépasse vite l'abonnement." },
              { title: 'Prix variables selon votre profil', detail: 'Deux personnes voient des prix différents pour le même abonnement.' },
              { title: 'Renouvellement automatique piège', detail: "On s'abonne un mois, on oublie d'annuler, et les prélèvements continuent." },
            ].map((item, i) => (
              <div key={item.title} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral/10 text-sm font-bold text-coral">{i + 1}</span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Argument Libre */}
      <section className="bg-sand px-6 py-16 dark:bg-coral/5">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Gratuit = plus de célibataires = plus de chances
          </h2>
          <p className="mb-10 text-base text-gray-600 dark:text-gray-400">
            Pas de barrière financière, pas de fonctionnalité verrouillée, pas de boost à acheter. Tout le monde a accès à tout.
          </p>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { title: 'Croisements en chemin', detail: 'Découvrez les célibataires que vous croisez au quotidien' },
              { title: 'Chat chiffré E2E', detail: 'Le serveur ne lit jamais vos messages' },
              { title: 'Modération communautaire', detail: 'Signalement, blocage, badge vérifié' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-base text-gray-600 dark:text-gray-400">
            Une fois le contact établi, vous choisissez comment aller plus loin. Le chat est un pont, pas une fin en soi.
          </p>
        </div>
      </section>

      {/* Vie privée */}
      <section className="bg-blush px-6 py-16 dark:bg-coral/10">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            Votre vie privée n&apos;est pas un produit
          </h2>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8">
            {[
              { icon: '🔒', title: 'Chiffrement E2E', detail: 'Le serveur ne lit jamais vos messages' },
              { icon: '🛡️', title: 'Zéro revente', detail: 'Vos données ne sont jamais vendues' },
              { icon: '✅', title: 'Badge vérifié', detail: 'Photos vérifiées par selfie' },
              { icon: '👥', title: 'Modération', detail: 'Signalement et blocage communautaire' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mb-2 text-2xl">{item.icon}</div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-br from-coral to-terracotta px-6 py-16 text-center">
        <p className="mb-2 text-3xl font-extrabold text-white">0 €. Pas d&apos;abonnement. Pas de pièges.</p>
        <p className="mb-8 text-base text-white/90">Rejoignez ceux qui refusent de payer pour espérer.</p>
        <Link
          href="/register"
          className="inline-block rounded-full bg-white px-8 py-3 text-sm font-bold text-terracotta transition-colors hover:bg-gray-50"
        >
          Créer un compte
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-1.5">
          <svg viewBox="76 36 360 360" className="h-4 w-4 opacity-50" fill="currentColor" aria-hidden="true">
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)" />
            <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)" />
            <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
          </svg>
          <span className="text-sm font-bold text-coral opacity-50">Libre</span>
        </div>
        <Link href="/cgu" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          Conditions générales d&apos;utilisation
        </Link>
      </footer>
      </main>
    </div>
  );
}