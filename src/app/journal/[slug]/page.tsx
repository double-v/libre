import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNavView } from '@/components/ui/SiteNav';
import SiteShell from '@/components/ui/SiteShell';
import TexteJournal from '@/components/journal/TexteJournal';
import { dateLongue } from '@/lib/journal/dates';
import { extrait } from '@/lib/journal/texte';
import { ORIGINE, trouverPubliee } from '@/lib/journal/public';

/**
 * Une publication du journal (spec 007, US1 ; maquette T014, écran 3).
 *
 * Même contrat que la liste : statique, sans aucune lecture de session
 * (FR-004). Brouillon, publication dépubliée ou adresse inconnue → page
 * « introuvable » ordinaire (FR-006). Générée à la première visite puis mise
 * en cache ; `revaliderJournal` la régénère à chaque modification.
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await trouverPubliee(slug);
  if (!post) return { title: 'Où en est Libre' };
  const description = extrait(post.corps, 160);
  const url = `${ORIGINE}/journal/${post.slug}`;
  return {
    title: `${post.titre} — Où en est Libre`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: post.titre,
      description,
      url,
      type: 'article',
      locale: 'fr_FR',
      siteName: 'Libre',
      publishedTime: post.publieeAt!.toISOString(),
      modifiedTime: post.modifieeAt.toISOString(),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await trouverPubliee(slug);
  if (!post) notFound();
  return (
    <div className="flex min-h-screen flex-col bg-background text-content">
      <SiteNavView variant="guest" width="content" />
      <main id="main-content" className="flex-1 py-10 sm:py-14">
        <SiteShell width="reading">
          <article>
            <Link
              href="/journal"
              className="mb-2 inline-flex min-h-11 items-center text-sm text-muted hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            >
              ← Toutes les nouvelles
            </Link>
            <span className="mb-2 block text-sm font-semibold uppercase tracking-widest text-coral">Où en est Libre</span>
            <h1 className="mb-2.5 break-words text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">{post.titre}</h1>
            <time dateTime={post.publieeAt!.toISOString()} className="mb-6 block text-sm text-muted">{dateLongue(post.publieeAt!)}</time>
            <TexteJournal corps={post.corps} />
            <span className="mt-7 block border-t border-hairline pt-4 text-sm text-muted">L’équipe Libre</span>
          </article>
        </SiteShell>
      </main>
    </div>
  );
}
