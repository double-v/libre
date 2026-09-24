import type { Metadata } from 'next';
import { SiteNavView } from '@/components/ui/SiteNav';
import SiteShell from '@/components/ui/SiteShell';
import CarteJournal from '@/components/journal/CarteJournal';
import { extrait } from '@/lib/journal/texte';
import { listerPubliees, ORIGINE } from '@/lib/journal/public';

/**
 * « Où en est Libre » — la liste publique du journal (spec 007, US1 ; maquette
 * T014, écrans 1 et 2).
 *
 * **Statique, et le même HTML pour tout le monde** (FR-004) : aucune lecture
 * de session, de cookie ni d'en-tête — `force-static` le garantit à
 * l'exécution, `journal-sans-session.test.ts` à la relecture. Régénérée à
 * chaque publication (`revaliderJournal`), le `revalidate` horaire n'est qu'un
 * filet.
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

const DESCRIPTION = 'Les nouvelles du projet Libre : ce qui change, ce qui arrive, et comment se protéger.';

export const metadata: Metadata = {
  title: 'Où en est Libre — les nouvelles du projet',
  description: DESCRIPTION,
  alternates: { canonical: `${ORIGINE}/journal` },
  openGraph: {
    title: 'Où en est Libre',
    description: DESCRIPTION,
    url: `${ORIGINE}/journal`,
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Libre',
  },
};

export default async function JournalPage() {
  const posts = await listerPubliees();
  return (
    <div className="flex min-h-screen flex-col bg-background text-content">
      <SiteNavView variant="guest" width="content" />
      <main id="main-content" className="flex-1 py-10 sm:py-14">
        <SiteShell width="reading">
          <span className="mb-2 block text-sm font-semibold uppercase tracking-widest text-coral">Où en est Libre</span>
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">Les nouvelles du projet</h1>
          <span className="mb-8 block text-lg leading-relaxed text-muted">
            Ce qui change, ce qui arrive, et comment se protéger. Écrit par l’équipe, pour les inscrit·es et les curieux·ses.
          </span>
          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hairline-strong bg-blush px-5 py-7 text-center">
              <span className="block font-semibold">Les premières nouvelles arrivent bientôt.</span>
              <span className="mt-1.5 block text-sm text-muted">Libre démarre : on racontera ici ce qui change, au fil de l’eau.</span>
            </div>
          ) : (
            <ol className="space-y-3.5">
              {posts.map((p) => (
                <li key={p.slug}>
                  <CarteJournal slug={p.slug!} titre={p.titre} extrait={extrait(p.corps)} publieeAt={p.publieeAt!} />
                </li>
              ))}
            </ol>
          )}
        </SiteShell>
      </main>
    </div>
  );
}
