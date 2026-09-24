'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import JournalEditeur, { type PostEditeur } from '@/components/admin/JournalEditeur';

/**
 * Une publication du journal côté admin (spec 007, US2) : rédaction,
 * republication, dépublication, suppression d'un brouillon jamais publié.
 */
export default function PublicationAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<PostEditeur | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let annule = false;
    fetch(`/api/admin/journal/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const { post: p } = (await r.json()) as { post: PostEditeur };
        if (!annule) setPost(p);
      })
      .catch(() => { if (!annule) setErreur('Publication introuvable.'); });
    return () => { annule = true; };
  }, [id]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/journal" className="mb-2 inline-flex min-h-11 items-center text-sm text-muted hover:text-content">← Journal</Link>
      {erreur && <span role="alert" className="block text-sm text-error">{erreur}</span>}
      {!post && !erreur && <span className="text-sm text-muted">Chargement…</span>}
      {post && (
        <>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-bold text-content">{post.statut === 'publiee' ? 'Publication en ligne' : 'Brouillon'}</h1>
            {post.statut === 'publiee' && post.slug && (
              <Link href={`/journal/${post.slug}`} className="text-sm text-coral underline underline-offset-2 dark:text-coral-light">Voir sur la page publique</Link>
            )}
          </div>
          {/* `key` : après une publication ou une dépublication, l'éditeur repart de l'état serveur. */}
          <JournalEditeur
            key={`${post.statut}-${post.slug ?? ''}`}
            initial={post}
            onEnregistre={setPost}
            onSupprime={() => router.push('/admin/journal')}
          />
        </>
      )}
    </div>
  );
}
