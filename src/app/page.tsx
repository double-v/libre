import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import VersionWatcher from '@/components/VersionWatcher';
import PublicHeader from '@/components/PublicHeader';
import RotatingWord from '@/components/RotatingWord';

// Accroche : le mot défile sur des achats « loisir » devenus normaux qu'on paie
// sans broncher — plusieurs registres pour parler à plein de monde : gaming (un
// season pass), accès payant (un coupe-file), fitness (un abo à la salle),
// lifestyle (un brunch le dimanche). Toujours des catégories génériques, JAMAIS
// une app concurrente ni une marque déposée (on reste safe). On glisse le vrai
// coût annuel de la concurrence (240 €/an, cf. « Constat »), une vanne (les yeux
// de la tête), puis le twist chaleureux — le seul truc qui mérite ton argent,
// c'est le vrai resto du date, pas l'appli — avant la punchline d'origine.
// Un seul anglicisme assumé (« season pass »), le reste FR — décision #240.
const HERO_WORDS = [
  'un abonnement',
  'un season pass',
  'un coupe-file',
  'un abo à la salle',
  'un brunch le dimanche',
  '240 € par an',
  'les yeux de la tête',
  'le resto de ton premier date',
  'un rond',
];

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
    a: "100 % gratuit. Pas d'abonnement, pas de boost, pas de Super Like à 5 €, pas de version premium planquée. Tout est accessible, tout le temps, à tout le monde.",
  },
  {
    q: 'Comment gagnez-vous de l\'argent alors ?',
    a: "On ne gagne pas d'argent. Libre est un projet à but non lucratif porté par des bénévoles. Les coûts de fonctionnement (serveurs, modération) sont couverts par des dons. On ne vend rien : ni abonnements, ni données, ni pub.",
  },
  {
    q: 'Mes messages sont-ils vraiment privés ?',
    a: "Oui, vraiment. Vos messages sont chiffrés de bout en bout (E2E). Même nos serveurs ne les lisent pas — on n'a pas la clé, et on ne veut pas l'avoir. Vous seul·e et votre correspondant·e pouvez les déchiffrer.",
  },
  {
    q: 'Y a-t-il des faux profils ?',
    a: "On lutte contre les faux profils avec trois outils : badge vérifié par selfie, modération humaine (pas un bot, pas un script), signalement et blocage communautaires. Contrairement à d'autres plateformes, on n'a jamais créé — et on ne créera jamais — de faux profils pour gonfler les chiffres.",
  },
  {
    q: "C'est quoi la différence avec Tinder, Happn ou Bumble ?",
    a: "La version gratuite est vraiment gratuite. Pas de likes bridés, pas de boost à acheter, pas de prix variable selon votre âge ou votre genre. Pas de piège. Tout est gratuit, pour tout le monde, point.",
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
        {/* Subtle background wash, much lighter than before so the photo is the star */}
        <div className="absolute inset-0 bg-gradient-to-br from-blush/40 via-blush/30 to-sand/40 dark:from-blush/10 dark:via-transparent dark:to-sand/10" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-10 px-6 py-16 sm:flex-row sm:py-24">
          <div className="flex-1 text-center sm:text-left animate-fade-in">
            <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50">
              Rencontrer devrait pas coûter{' '}
              <RotatingWord words={HERO_WORDS} className="text-coral" />. 🫶
            </h1>
            <p className="mb-6 max-w-lg text-base text-gray-600 sm:text-lg dark:text-gray-300">
              Pas de score de désirabilité, pas de likes à acheter, pas de revente de données. Juste de vraies personnes, une modération tenue par des humains, et des messages que même nous ne pouvons pas lire.
            </p>
            <div className="mb-6 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-800/80 dark:text-gray-200">
                <span aria-hidden="true">🛡️</span> Modération humaine
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-800/80 dark:text-gray-200">
                <span aria-hidden="true">🔒</span> Messages chiffrés
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-800/80 dark:text-gray-200">
                <span aria-hidden="true">✅</span> Profils vérifiés
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-800/80 dark:text-gray-200">
                <span aria-hidden="true">🆓</span> 100 % gratuit
              </span>
            </div>
            {totalUsers > 0 && (
              <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-coral/10 px-4 py-1.5 text-sm font-medium text-coral">
                <span aria-hidden="true">👥</span>
                {totalUsers.toLocaleString('fr-FR')} célibataires ont déjà rejoint
              </p>
            )}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <Link
                href="/register"
                className="rounded-full bg-coral px-8 py-3.5 text-base font-semibold text-white shadow-md transition-transform hover:scale-105 hover:bg-coral-dark hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 dark:focus:ring-offset-gray-950"
              >
                <span aria-hidden="true">🔥</span> Créer mon profil
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-white/70 px-8 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800/90 dark:focus:ring-offset-gray-950"
              >
                Se connecter
              </Link>
            </div>
          </div>
          <div className="relative w-full flex-1 overflow-hidden rounded-3xl shadow-xl aspect-[4/3] animate-fade-in">
            {/* Brand-gradient fallback behind the photo so a broken image still looks intentional */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-blush via-coral to-sand"
              aria-hidden="true"
            />
            <Image
              src="/images/hero-couple.jpg"
              alt="Un couple enlacé dans la lumière chaude du soir"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              quality={80}
              className="relative object-cover"
            />
            {/* Voile coral discret en bas pour ancrer la photo dans la marque */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-coral-dark/25 via-transparent to-transparent"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* ====== MOMENTS (vraies rencontres) ====== */}
      <section className="px-6 pb-4 pt-2 sm:pb-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Des humains, pas des profils.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-base text-gray-600 dark:text-gray-400">
            De vraies personnes, à leur rythme, en confiance. Pas de swipe compulsif, pas de
            score de désirabilité — tu choisis qui tu rencontres, et comment aller plus loin.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { src: '/images/moment-1.jpg', alt: 'Deux femmes qui s’enlacent tendrement dans leur cuisine' },
              { src: '/images/moment-2.jpg', alt: 'Deux hommes qui rient, l’un enlaçant l’autre par-derrière' },
              { src: '/images/moment-3.jpg', alt: 'Un couple complice enlacé au pied d’un arbre' },
            ].map((m, i) => (
              <div
                key={m.src}
                className={`relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm ${i === 1 ? 'sm:-translate-y-4' : ''}`}
              >
                <Image
                  src={m.src}
                  alt={m.alt}
                  fill
                  sizes="(max-width: 640px) 33vw, 220px"
                  quality={75}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-coral-dark/20 to-transparent" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CHIFFRES ====== */}
      <section className="bg-blush px-6 py-16 dark:bg-coral/10">
        <div className="mx-auto max-w-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center gap-4">
              <img
                src="/illustrations/empty-wallet_j0kn.svg"
                alt=""
                aria-hidden="true"
                className="h-24 w-24"
              />
              <p className="text-6xl font-extrabold tracking-tight text-coral sm:text-7xl">0 € 🎉</p>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Pour toujours. Pour tout le monde. Pour de vrai.
            </p>
            <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
              La concurrence facture ~240&nbsp;€/an et 47&nbsp;% des abonnés regrettent l&apos;achat (UFC-Que Choisir, 2025). Libre reste à 0&nbsp;€&nbsp;: pas d&apos;abonnement, pas de boost, pas de mauvaise surprise sur votre relevé.
            </p>
          </div>
        </div>
      </section>

      {/* ====== COMMENT ÇA MARCHE ====== */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            Comment ça marche&nbsp;?
          </h2>
          <p className="mb-10 text-center text-base text-gray-600 dark:text-gray-400">
            Trois étapes. Aucune ne coûte un rond, aucune ne vous demande de lier votre Facebook.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: '1',
                icon: '✍️',
                title: 'Créez votre profil',
                detail:
                  'Prénom, âge, une photo, quelques mots sur vous. On ne vous demande pas 50 infos ni de questionnaire à rallonge.',
              },
              {
                step: '2',
                icon: '🔍',
                title: 'Voyez qui vous croisez',
                detail:
                  'Géolocalisation activée&nbsp;: les célibataires de votre quartier, votre métro, votre bar du vendredi. Sans limite de likes.',
              },
              {
                step: '3',
                icon: '💬',
                title: 'Échangez en privé',
                detail:
                  'Vos messages sont chiffrés de bout en bout. Même nous, on ne lit pas ce que vous racontez. Promis.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl bg-white/60 p-6 shadow-sm dark:bg-gray-900/40"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral/10 p-2"
                  >
                    {item.step === '1' && (
                      <img src="/illustrations/user-account_fvqa.svg" alt="" className="h-full w-full" />
                    )}
                    {item.step === '2' && (
                      <img src="/illustrations/location-search_9mdg.svg" alt="" className="h-full w-full" />
                    )}
                    {item.step === '3' && (
                      <img src="/illustrations/messages_okui.svg" alt="" className="h-full w-full" />
                    )}
                  </span>
                  <span className="text-sm font-bold text-coral">Étape {item.step}</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CONSTAT ====== */}
      <section className="bg-blush px-6 py-16 dark:bg-coral/10">
        <div className="mx-auto max-w-xl">
          <div className="relative mb-2 text-center">
            <img
              src="/illustrations/connection-lost_am29.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 -top-2 h-28 w-28 opacity-80 sm:-right-8"
            />
            <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
              Les autres apps facturent l&apos;espoir 💸
            </h2>
          </div>
          <p className="mb-10 text-center text-base text-gray-600 dark:text-gray-400">
            Swipes bridés, boosts à l&apos;unité, prix qui changent selon votre profil&nbsp;: la version gratuite est un piège à fric.
          </p>

          <div className="space-y-4">
            {[
              {
                title: '💸 Likes bridés → frustration payante',
                detail: "Swipes bloqués, fonctionnalités verrouillées : la version gratuite est conçue pour vous faire sortir la CB.",
              },
              {
                title: '🎯 Boost à l’unité → piège à fric',
                detail: 'Super Like à 5 €, Boost à l’unité, remontée expresse… le coût réel dépasse vite l’abonnement annuel.',
              },
              {
                title: '🎰 Prix variables selon votre tête → discrim',
                detail: 'Deux personnes voient des prix différents pour le même abonnement. Oui, vraiment.',
              },
              {
                title: '🔁 Abonnement silencieux → CB oubliée',
                detail: 'On s’abonne un mois, on oublie d’annuler, et les prélèvements continuent en douce.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-white/60 px-5 py-4 shadow-sm dark:bg-gray-900/40"
              >
                <p className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== ARGUMENT LIBRE ====== */}
      <section className="bg-sand px-6 py-16 dark:bg-coral/5">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Ce que Libre fait (et que les autres font pas)
          </h2>
          <p className="mb-10 text-base text-gray-600 dark:text-gray-400">
            Trois piliers, zéro zone grise, zéro petit astérisque en bas de page.
          </p>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                icon: '📍',
                title: 'Croisements en vrai',
                detail:
                  'Vous voyez qui vous croisez vraiment, pas un algo qui vous vend du rêve à coup de Boost.',
              },
              {
                icon: '🔒',
                title: 'Chat E2E',
                detail:
                  'Même nous on ne lit pas vos messages. Et on ne veut pas, pour de vrai.',
                illustration: '/illustrations/firewall_cfej.svg',
              },
              {
                icon: '🛡️',
                title: 'Modération humaine',
                detail:
                  'De vraies personnes lisent les signalements. Pas un bot, pas un script, pas un LLM qui dort.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-white/70 p-6 text-left shadow-sm dark:bg-gray-900/30"
              >
                {item.illustration ? (
                  <img
                    src={item.illustration}
                    alt=""
                    aria-hidden="true"
                    className="mb-3 h-10 w-10"
                  />
                ) : (
                  <div aria-hidden="true" className="mb-3 text-3xl">
                    {item.icon}
                  </div>
                )}
                <p className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-base text-gray-600 dark:text-gray-400">
            Une fois le contact établi, vous choisissez la suite. Le chat est un pont, pas une fin en soi.
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
                  <strong>La transparence n&apos;est pas une option.</strong> Pas de prix cachés, pas de faux profils, pas d&apos;algorithme qui vous manipule. Le code source est ouvert et réutilisable à but non commercial, les intentions sont claires.
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
      <section className="bg-gradient-to-br from-coral to-terracotta px-6 py-20 text-center text-white sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Prêt·e à rencontrer sans payer ? 🚀
          </h2>
          <p className="mb-8 text-lg text-white/90 sm:text-xl">
            100% gratuit · 0 pub · 0 revente de données · pour toujours.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-coral shadow-lg transition-transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-coral"
          >
            <span aria-hidden="true">🔥</span> Créer mon profil
          </Link>
          <p className="mt-6 text-sm text-white/80">
            {totalUsers > 0 && (
              <>Déjà {totalUsers.toLocaleString('fr-FR')} célibataire{totalUsers > 1 ? 's' : ''} ont rejoint Libre.</>
            )}
          </p>
        </div>
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
        {/* Code source ouvert */}
        <p className="mb-3 text-xs text-gray-300 dark:text-gray-600">
          Code source ouvert, usage non commercial :{' '}
          <a
            href="https://github.com/double-v/libre"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral hover:underline"
          >
            github.com/double-v/libre
          </a>
        </p>
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