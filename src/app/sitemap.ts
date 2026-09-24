import { MetadataRoute } from 'next';
import { getDb } from '@/lib/db';

/** Régénéré au plus toutes les heures, et à chaque publication du journal. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.getlibre.fr';
  // Use fixed dates — update when page content actually changes
  const fixes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: '2026-05-28', changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/register`, lastModified: '2026-05-28', changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: '2026-05-28', changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/cgu`, lastModified: '2026-05-28', changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/journal`, changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Journal (spec 007) : best-effort — un sitemap sans les publications vaut
  // mieux qu'un sitemap en erreur.
  try {
    const posts = await getDb().journalPost.findMany({
      where: { statut: 'publiee' },
      select: { slug: true, modifieeAt: true },
      orderBy: { publieeAt: 'desc' },
    });
    return [
      ...fixes,
      ...posts.map((p) => ({ url: `${baseUrl}/journal/${p.slug}`, lastModified: p.modifieeAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ];
  } catch (error) {
    console.error('sitemap.journal.failed', error instanceof Error ? error.message : 'unknown');
    return fixes;
  }
}
