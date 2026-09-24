'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Tag from '@/components/ui/Tag';

/**
 * Admin › Journal (spec 007, US2) — les publications de « Où en est Libre »,
 * tous statuts. La rédaction vit sur la page de chaque publication.
 */
interface Ligne {
  id: string;
  titre: string;
  statut: string;
  slug: string | null;
  publieeAt: string | null;
  modifieeAt: string;
}

const fmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' });

export default function AdminJournalPage() {
  const [posts, setPosts] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let annule = false;
    fetch('/api/admin/journal')
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const { posts: p } = (await r.json()) as { posts: Ligne[] };
        if (!annule) setPosts(p);
      })
      .catch(() => { if (!annule) setErreur('Impossible de charger le journal.'); });
    return () => { annule = true; };
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-content">Journal</h1>
          <span className="mt-1 block text-sm text-muted">
            « Où en est Libre » : les nouvelles publiées sur la page publique{' '}
            <Link href="/journal" className="text-coral underline underline-offset-2 dark:text-coral-light">/journal</Link>.
          </span>
        </div>
        <Link
          href="/admin/journal/nouveau"
          className="inline-flex min-h-11 items-center rounded-md bg-coral px-4 text-sm font-semibold text-white hover:bg-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          Nouvelle publication
        </Link>
      </div>

      {erreur && <span role="alert" className="block text-sm text-error">{erreur}</span>}
      {!posts && !erreur && <span className="text-sm text-muted">Chargement…</span>}
      {posts?.length === 0 && <span className="text-sm text-muted">Aucune publication pour l’instant.</span>}
      {posts && posts.length > 0 && (
        <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-surface">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/journal/${p.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-fill-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-coral">
                <span className="min-w-0 flex-1 truncate font-medium text-content">{p.titre}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <Tag variant={p.statut === 'publiee' ? 'online' : p.publieeAt ? 'pending' : 'default'} size="sm">
                    {p.statut === 'publiee' ? 'En ligne' : p.publieeAt ? 'Dépubliée' : 'Brouillon'}
                  </Tag>
                  modifiée le {fmt.format(new Date(p.modifieeAt))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
