import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import VersionWatcher from '@/components/VersionWatcher';
import PublicHeader from '@/components/PublicHeader';

// Kill Vercel/Next HTML caching on the home. The page is essentially static
// (FAQ + user count) but Google Search Console flagged the cached 5-min
// version as "page with redirect" during the getlibre.fr -> www.getlibre.fr
// domain history. Forcing dynamic render also keeps the canonical in sync
// with the eventual final URL (no stale HTML pointing at a moved domain).
// Trade-off: 1 DB read per request for the counter; the 5-min ISR version
// made the same call once per 5 min. Acceptable for the home.
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
/*  Server data: fetch user count for the live counter (cached 5 min)  */
/* ------------------------------------------------------------------ */
async function getUserCount() {
  try {
    // No revalidate: page is force-dynamic anyway, and the 5-min cache was
    // for the old ISR HTML, not this fetch.
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
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */
const faqItems = [
  {
    q: 'Est-ce vraiment gratuit ?',
    a: "Oui, à 100 %. Pas d'abonnement, pas de microtransaction, pas de version premium cachée. Toutes les fonctionnalités sont accessibles à tout le monde, toujours.",
  },
  {
    q: 'Comment gagnez-vous de l\'argent alors ?',
    a: "Libre est un projet à but non lucratif porté par des bénévoles convaincus que la rencontre ne devrait pas être un marché. Les coûts de fonctionnement sont couverts par des dons. Nous ne vendons rien : ni abonnements, ni données, ni publicité.",
  },
  {
    q: 'Mes messages sont-ils vraiment privés ?',
    a: "Oui. Vos messages sont chiffrés de bout en bout (E2E). Cela signifie que même nos serveurs ne peuvent pas les lire. Seul vous et votre correspondant avez les clés de déchiffrement.",
  },
  {
    q: 'Y a-t-il des faux profils ?',
    a: "Nous luttons activement contre les faux profils grâce au système de badge vérifié (vérification par selfie), à la modération communautaire (signalement, blocage) et à une équipe de modération humaine. Contrairement à d'autres plateformes, nous n'avons jamais créé et ne créerons jamais de faux profils pour gonfler artificiellement nos chiffres.",
  },
  {
    q: 'Quelles différences avec Tinder, Happn ou Bumble ?',
    a: "La différence fondamentale : chez Libre, la version gratuite n'est pas conçue pour frustrer. Pas de likes limités, pas de boost à acheter, pas de prix variable selon votre âge ou votre genre. Tout est gratuit, pour tout le monde, sans piège.",
  },
];

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
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-coral">
        Aller au contenu principal
      </a>

      <main id="main-content">
      <PublicHeader />

      {/* ====== HERO ====== */}
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
            <p className="mb-4 text-base text-gray-600 dark:text-gray-400">
              Rencontre gratuite. Sans abonnement. Sans microtransaction. Sans revente de données.
              <br />
              Parce que quand c&apos;est gratuit, tout le monde est là.
            </p>
            {totalUsers > 0 && (
              <p className="mb-8 text-sm font-medium text-coral">
                Rejoignez déjà {totalUsers.toLocaleString('fr-FR')} célibataires inscrits
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-terracotta px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2 dark:focus:ring-offset-gray-950"
              >
                Créer mon profil gratuitement
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

      {/* ====== CHIFFRES ====== */}
      <section className="bg-blush px-6 py-16 dark:bg-coral/10">
        <div className="mx-auto max-w-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-6xl font-extrabold tracking-tight text-coral sm:text-7xl">0 €</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pour toujours. Pas d&apos;abonnement, pas de piège.</p>
            <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">La concurrence facture ~240 €/an et 47 % des abonnés regrettent leur achat (UFC-Que Choisir, 2025). Libre ne facture rien, jamais.</p>
          </div>
        </div>
      </section>

      {/* ====== COMMENT ÇA MARCHE ====== */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            Comment ça marche ?
          </h2>
          <p className="mb-10 text-center text-base text-gray-600 dark:text-gray-400">
            Trois étapes pour rejoindre la communauté Libre.
          </p>
          <div className="space-y-8">
            {[
              {
                step: '1',
                icon: '✍️',
                title: 'Créez votre profil en 2 minutes',
                detail: 'Prénom, âge, une photo, quelques mots sur vous. Pas de questionnaire interminable, pas de sync Facebook obligatoire.',
              },
              {
                step: '2',
                icon: '🔍',
                title: 'Découvrez les célibataires autour de vous',
                detail: 'Grâce à la géolocalisation, voyez qui vous croisez au quotidien ou qui se trouve à proximité. Sans limite de likes.',
              },
              {
                step: '3',
                icon: '💬',
                title: 'Chattez en toute sécurité',
                detail: 'Quand le courant passe, lancez la conversation. Vos messages sont chiffrés de bout en bout — personne d\'autre ne les lit.',
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral/10 text-2xl">
                  {item.icon}
                </span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    <span className="text-coral">Étape {item.step}.</span> {item.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CONSTAT ====== */}
      <section className="bg-blush px-6 py-16 dark:bg-coral/10">
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
              <div key={item.title} className="rounded-xl bg-white/60 px-5 py-4 shadow-sm dark:bg-gray-900/40">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral/10 text-sm font-bold text-coral">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== ARGUMENT LIBRE ====== */}
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
              { icon: '🚶', title: 'Croisements en chemin', detail: 'Découvrez les célibataires que vous croisez au quotidien' },
              { icon: '🔐', title: 'Chat chiffré E2E', detail: 'Le serveur ne lit jamais vos messages' },
              { icon: '🛡️', title: 'Modération communautaire', detail: 'Signalement, blocage, badge vérifié' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-white/70 px-6 py-5 shadow-sm dark:bg-gray-900/30">
                <div className="mb-2 text-2xl">{item.icon}</div>
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

      {/* ====== VIE PRIVÉE ====== */}
      <section className="px-6 py-16">
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
              <div key={item.title} className="rounded-xl bg-blush/60 px-5 py-5 text-center shadow-sm dark:bg-coral/5">
                <div className="mb-2 text-2xl">{item.icon}</div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="bg-sand px-6 py-16 dark:bg-coral/5">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl bg-white/70 shadow-sm dark:bg-gray-900/30"
              >
                <summary className="cursor-pointer px-5 py-4 font-semibold text-gray-800 dark:text-gray-200 list-none flex items-center justify-between">
                  <span>{item.q}</span>
                  <span className="ml-2 text-coral transition-transform group-open:rotate-45 text-xl leading-none select-none">+</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ====== L'ÉQUIPE ====== */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Qui sommes-nous ?
          </h2>
          <p className="mb-8 text-base text-gray-600 dark:text-gray-400">
            Libre est un projet porté par des bénévoles qui refusent de voir la rencontre devenir un commerce.
          </p>
          <div className="rounded-xl bg-blush/60 px-8 py-8 shadow-sm dark:bg-coral/5">
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Nous croyons en trois choses
            </p>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <span className="text-coral text-lg mt-0.5">{'>'}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Rencontrer est un droit</strong>, pas un service premium. Personne ne devrait payer pour espérer trouver l&apos;amour ou faire une rencontre.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-coral text-lg mt-0.5">{'>'}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Vos données vous appartiennent.</strong> Nous ne les vendons pas, nous ne les monétisons pas, nous ne les partageons pas. Jamais.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-coral text-lg mt-0.5">{'>'}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>La transparence n&apos;est pas une option.</strong> Pas de prix cachés, pas de faux profils, pas d&apos;algorithme qui vous manipule. Le code est open, les intentions sont claires.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Vous partagez ces valeurs ? Rejoignez l&apos;aventure.
          </p>
        </div>
      </section>

      {/* ====== CTA FINAL ====== */}
      <section className="bg-gradient-to-br from-coral to-terracotta px-6 py-16 text-center">
        <p className="mb-2 text-3xl font-extrabold text-white">0 €. Pas d&apos;abonnement. Pas de pièges.</p>
        <p className="mb-8 text-base text-white/90">Rejoignez ceux qui refusent de payer pour espérer.</p>
        {totalUsers > 0 && (
          <p className="mb-6 text-sm text-white/80">
            Déjà {totalUsers.toLocaleString('fr-FR')} célibataires nous font confiance
          </p>
        )}
        <Link
          href="/register"
          className="inline-block rounded-full bg-white px-8 py-3 text-sm font-bold text-terracotta transition-colors hover:bg-gray-50"
        >
          Créer un compte
        </Link>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="px-6 py-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-1.5">
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
        {/* Liens légaux */}
        <div className="mb-3 flex items-center justify-center gap-4 text-xs text-gray-400">
          <Link href="/cgu" className="hover:text-gray-600 dark:hover:text-gray-300">
            Conditions générales d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="hover:text-gray-600 dark:hover:text-gray-300">
            Politique de confidentialité
          </Link>
          <Link href="/mentions-legales" className="hover:text-gray-600 dark:hover:text-gray-300">
            Mentions légales
          </Link>
          <Link href="/faq/session-expiree" className="hover:text-gray-600 dark:hover:text-gray-300">
            FAQ
          </Link>
        </div>
        {/* Réseaux sociaux */}
        <div className="mb-3 flex items-center justify-center gap-4">
          {/* TikTok — canal principal de croissance pour une app de rencontre */}
          <a
            href="https://tiktok.com/@getlibre_fr"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Suivez Libre sur TikTok"
            className="text-gray-400 transition-colors hover:text-coral"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-2.78a8.27 8.27 0 005.58 2.17v-3.43a4.85 4.85 0 01-3.77-1.78V6.69h3.77z" />
            </svg>
          </a>
        </div>
        {/* Mention presse — placeholder */}
        <p className="text-xs text-gray-300 dark:text-gray-600">
          Presse &amp; médias : contact@getlibre.fr
        </p>
      </footer>
      <VersionWatcher initialSha={BUILD_SHA} />
      </main>
    </div>
  );
}