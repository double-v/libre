import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNavView } from '@/components/ui/SiteNav';
import SiteShell from '@/components/ui/SiteShell';

const CANONICAL_ORIGIN = 'https://www.getlibre.fr';

// ISR pur (chantier 08 T1) — la page est totalement statique : aucune
// dépendance serveur (pas de DB, pas de session, pas de fetch). Le
// revalidate de 1h permet de regénérer le HTML statique sans tomber
// dans le piège du force-dynamic (qui sur la home a déjà causé des
// soucis SEO lors de la migration getlibre.fr → www.getlibre.fr).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Manifesto — Pourquoi Libre est gratuit, libre, et sans pub',
  description:
    "Libre, c'est une rencontre sans abonnement, sans microtransaction, sans revente de données. On vous explique pourquoi c'est possible — et pourquoi on ne dévie pas.",
  alternates: { canonical: `${CANONICAL_ORIGIN}/manifesto` },
  openGraph: {
    title: 'Manifesto — Libre',
    description:
      "Pourquoi Libre est gratuit, libre, et sans pub. Notre manifesto en cinq minutes de lecture.",
    url: `${CANONICAL_ORIGIN}/manifesto`,
    type: 'article',
    locale: 'fr_FR',
    siteName: 'Libre',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Libre — Manifesto : rencontre libre, gratuite, sans pub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manifesto — Libre',
    description:
      "Pourquoi Libre est gratuit, libre, et sans pub. Notre manifesto en cinq minutes de lecture.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

/* ------------------------------------------------------------------ */
/*  Contenu statique — ton fun/punchy, en français (~650 mots)        */
/* ------------------------------------------------------------------ */
const onEstLibresDe = [
  {
    title: 'Discuter sans payer',
    detail:
      "Pas d'abonnement, pas de « likes » bridés, pas de superlike à l'unité. Si le courant passe, vous pouvez écrire. Point.",
  },
  {
    title: 'Choisir qui on voit',
    detail:
      "Géolocalisation transparente, filtres utiles, pas d'algorithme opaque qui décide pour vous. Vous voyez les gens, pas un classement sponsorisé.",
  },
  {
    title: 'Gardner nos messages pour nous',
    detail:
      "Chiffrement de bout en bout : vos conversations ne passent que par vous et votre correspondant. Même nous, on ne les lit pas. On ne peut pas.",
  },
  {
    title: 'Quitter quand on veut',
    detail:
      "Suppression de compte en un clic, données effacées, photos parties. Pas de période de rétention cachée, pas de挽留 agressif par mail.",
  },
];

const onRefuseDe = [
  {
    title: 'Faire payer l’espoir',
    detail:
      "Un like, un boost, une mise en avant, un badge « premium »… non. On ne vend pas l'illusion que l'amour a un prix.",
  },
  {
    title: 'Vendre vos données',
    detail:
      "Pas de SDK tracking, pas de revente à des courtiers, pas de profilage publicitaire. Vous n'êtes pas un produit. Vous êtes une personne.",
  },
  {
    title: 'Gonfler les chiffres avec des bots',
    detail:
      "Jamais de faux profils. Jamais. Les autres le font, on l'a vu : c'est nul. On préfère un app petite et honnête qu'un zoo à robots.",
  },
  {
    title: 'Vous garder captif',
    detail:
      "Pas de renouvellement automatique, pas de « offrez 6 mois pour 1 », pas de piège à la désinscription. Si vous partez, on vous souhaite bon vent.",
  },
];

export default function ManifestoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-content">
      {/* Shell unifié (#278, épic #273 ; largeur élargie #293) : nav partagée
          (variante guest — /manifesto est une page publique/marketing) + largeur
          contenu globale `content` (1080px) au lieu du max-w-2xl recodé. Le
          skip-link vit dans le layout racine ; on garde l'ancre #main-content. */}
      <SiteNavView variant="guest" width="content" />

      <main id="main-content" className="flex-1">
        {/* ====== HERO ====== */}
        <section className="py-12 sm:py-16">
          <SiteShell width="content" className="text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-coral">
              Notre manifesto
            </p>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Rencontrer ne devrait rien coûter.
            </h1>
            <p className="text-lg text-muted">
              Et pourtant, en 2026, l&rsquo;amour se paye en abonnements, en
              boosts et en données personnelles. On a décidé de faire
              autrement. Voici comment, et pourquoi.
            </p>
          </SiteShell>
        </section>

        {/* ====== ON EST LIBRES DE ====== */}
        <section aria-labelledby="libres-de" className="bg-blush py-14 dark:bg-coral/10">
          <SiteShell width="content">
            <h2
              id="libres-de"
              className="mb-2 text-3xl font-bold text-content"
            >
              On est libres de&hellip;
            </h2>
            <p className="mb-8 text-base text-muted">
              Ce que vous pouvez faire sur Libre, sans que personne ne vous
              demande votre carte bleue.
            </p>
            <ul className="space-y-4">
              {onEstLibresDe.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl bg-surface/70 p-5 shadow-sm"
                >
                  <p className="font-semibold text-coral">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </SiteShell>
        </section>

        {/* ====== ON REFUSE DE ====== */}
        <section aria-labelledby="refuse-de" className="py-14">
          <SiteShell width="content">
            <h2
              id="refuse-de"
              className="mb-2 text-3xl font-bold text-content"
            >
              On refuse de&hellip;
            </h2>
            <p className="mb-8 text-base text-muted">
              Les pratiques qu&rsquo;on a vues ailleurs, et qu&rsquo;on ne
              reproduira pas. Même si ça nous coûte des utilisateurs. Même si
              ça nous coûte des investisseurs.
            </p>
            <ul className="space-y-4">
              {onRefuseDe.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border-l-4 border-coral bg-surface/60 p-5 shadow-sm"
                >
                  <p className="font-semibold text-content">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </SiteShell>
        </section>

        {/* ====== COMMENT ON FINANCE ====== */}
        <section aria-labelledby="finance" className="bg-sand py-14 dark:bg-coral/5">
          <SiteShell width="content">
            <h2
              id="finance"
              className="mb-2 text-3xl font-bold text-content"
            >
              Comment on finance la maison
            </h2>
            <p className="mb-6 text-base text-muted">
              Si on ne facture rien aux utilisateurs, qui paie la note ? C&rsquo;est
              la question piège qu&rsquo;on nous pose le plus souvent. Réponse
              honnête&nbsp;: quelques personnes de bonne volonté, et beaucoup
              de dons.
            </p>
            <div className="space-y-4">
              <div className="rounded-xl bg-surface/70 p-5 shadow-sm">
                <p className="font-semibold text-content">
                  💛 Des dons, c&rsquo;est tout
                </p>
                <p className="mt-1 text-sm text-muted">
                  Pas de VC, pas de fonds levés, pas de prêteur. Quand on a
                  besoin d&rsquo;un serveur en plus, on lance un appel aux
                  dons. Quand les dons dépassent, on garde le surplus pour le
                  mois suivant. C&rsquo;est bête comme bonjour, et ça
                  marche.
                </p>
              </div>
              <div className="rounded-xl bg-surface/70 p-5 shadow-sm">
                <p className="font-semibold text-content">
                  📖 Budget publié tous les 6 mois
                </p>
                <p className="mt-1 text-sm text-muted">
                  Hébergement, base de données, temps bénévole, frais
                  juridiques&hellip; on met les chiffres en ligne, en brut.
                  Pas de « post-pub », pas de slide corporate. Vous voyez ce
                  qu&rsquo;on voit.
                </p>
              </div>
              <div className="rounded-xl bg-surface/70 p-5 shadow-sm">
                <p className="font-semibold text-content">
                  🙅 Aucun « plan B »
                </p>
                <p className="mt-1 text-sm text-muted">
                  On ne vous vendra pas un abonnement &laquo; en
                  complément &raquo;. On ne lancera pas une version &laquo;
                  Pro &raquo; payante. On ne mettra pas de pub
                  &laquo; discrète &raquo; un jour où le déficit pointerait.
                  Si Libre ne tient plus, on vous le dit et on ferme. Mais
                  on ne vous vendra jamais.
                </p>
              </div>
            </div>
          </SiteShell>
        </section>

        {/* ====== CTA + LIEN RETOUR HOME ====== */}
        <section
          aria-labelledby="cta"
          className="bg-gradient-to-br from-coral to-terracotta py-16 text-center"
        >
          {/* Focus ring blanc conservé : shadow-focus (coral) serait invisible
              sur ce fond coral — l'anneau blanc reste le choix a11y correct ici. */}
          <SiteShell width="content">
            <h2
              id="cta"
              className="mb-2 text-3xl font-extrabold text-white sm:text-4xl"
            >
              Convaincu·e ? Rejoignez-nous.
            </h2>
            <p className="mb-8 text-base text-white/90">
              Créer un profil prend 2 minutes. C&rsquo;est gratuit, et ça le
              restera.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-white px-8 py-3 text-sm font-bold text-terracotta transition-colors hover:bg-blush focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-coral"
              >
                Créer mon profil gratuitement
              </Link>
              <Link
                href="/login"
                className="rounded-full border-2 border-white/80 bg-transparent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-coral"
              >
                J&rsquo;ai déjà un compte
              </Link>
            </div>
            <p className="mt-8 text-sm text-white/80">
              <Link
                href="/"
                className="underline underline-offset-4 hover:no-underline"
              >
                ← Retour à l&rsquo;accueil
              </Link>
            </p>
          </SiteShell>
        </section>
      </main>

      {/* ====== FOOTER ====== */}
      <footer className="py-8 text-center">
        <SiteShell width="content">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
            <Link href="/cgu" className="hover:text-content">
              Conditions générales d&rsquo;utilisation
            </Link>
            <Link href="/confidentialite" className="hover:text-content">
              Politique de confidentialité
            </Link>
            <Link href="/mentions-legales" className="hover:text-content">
              Mentions légales
            </Link>
          </div>
          <p className="text-xs text-muted">
            Presse &amp; médias : contact@getlibre.fr
          </p>
        </SiteShell>
      </footer>
    </div>
  );
}
