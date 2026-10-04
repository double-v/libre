'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteShell from '@/components/ui/SiteShell';
import Button from '@/components/ui/Button';
import { FEEDBACK_READ_EVENT, type MyFeedback } from '@/lib/feedback-reply';

/**
 * Paramètres › Mes retours (#477) — les retours envoyés et la réponse de
 * l'équipe, reproduits du prototype validé.
 *
 * Ouvrir la page marque les réponses lues (`POST …/read`), mais le repère
 * « Nouvelle réponse » reste affiché pendant la visite : il s'éteint à la
 * suivante, pas sous les yeux de la personne qui le lit.
 */

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  suggestion: 'Idée',
  question: 'Question',
};

function jour(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

type Etat = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: MyFeedback[] };

export default function MesRetoursPage() {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ kind: 'loading' });

  const charger = useCallback(async () => {
    setEtat({ kind: 'loading' });
    try {
      const r = await fetch('/api/feedback/mine', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const d: { items: MyFeedback[] } = await r.json();
      setEtat({ kind: 'ready', items: d.items });
      if (d.items.some((f) => f.unread)) {
        fetch('/api/feedback/mine/read', { method: 'POST' })
          .then(() => window.dispatchEvent(new Event(FEEDBACK_READ_EVENT)))
          .catch(() => {
            // Non marqué : le point restera, et la prochaine visite réessaiera.
          });
      }
    } catch {
      setEtat({ kind: 'error' });
    }
  }, []);

  useEffect(() => {
    // IIFE async : aucun setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await charger(); })();
  }, [charger]);

  return (
    <SiteShell as="section" width="app" className="py-6 md:pt-11">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-sm text-muted hover:bg-fill-subtle focus-visible:outline-none focus-visible:shadow-focus"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Paramètres
        </button>
      </div>

      <h1 className="text-2xl font-bold text-content">Mes retours</h1>
      <p className="mt-1 text-sm text-muted">
        Nous lisons chaque retour. Quand une réponse peut t’aider, nous l’écrivons ici et nous te prévenons.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {etat.kind === 'loading' && <p className="text-sm text-muted">Chargement de tes retours…</p>}

        {etat.kind === 'error' && (
          <div className="rounded-xl border border-hairline bg-surface p-4">
            <p className="text-sm text-muted">Impossible de charger tes retours pour le moment.</p>
            <Button type="button" variant="secondary" onClick={() => void charger()}>
              Réessayer
            </Button>
          </div>
        )}

        {etat.kind === 'ready' && etat.items.length === 0 && (
          <div className="rounded-xl border border-hairline bg-surface p-4">
            <div className="text-sm text-muted">
              Tu ne nous as encore envoyé aucun retour. Le bouton en bas à droite de l’écran sert à ça : une
              question, une idée ou un problème. Tu trouveras peut-être aussi ta réponse dans la{' '}
              <Link href="/faq" className="text-coral-dark hover:underline dark:text-coral-light">
                foire aux questions
              </Link>
              .
            </div>
          </div>
        )}

        {etat.kind === 'ready' &&
          etat.items.map((f) => (
            <section key={f.id} aria-label={`Retour envoyé le ${jour(f.createdAt)}`} className="flex flex-col gap-2.5 rounded-xl border border-hairline bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-fill-subtle px-2.5 py-0.5 text-xs font-medium text-muted">
                  {CATEGORY_LABELS[f.category] ?? f.category}
                </span>
                <span className="text-xs text-muted">Envoyé le {jour(f.createdAt)}</span>
                {f.unread && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-coral-dark dark:text-coral-light">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-coral" />
                    Nouvelle réponse
                  </span>
                )}
              </div>

              <div className="whitespace-pre-wrap break-words text-[15px] text-content">{f.message}</div>

              {f.reply !== null && f.repliedAt !== null ? (
                <>
                  <div className="flex flex-col gap-1 rounded-[10px] bg-sunken px-3.5 py-3">
                    <span className="text-xs font-semibold text-coral-dark dark:text-coral-light">
                      Réponse de l’équipe Libre · {jour(f.repliedAt)}
                    </span>
                    <div className="whitespace-pre-wrap break-words text-[15px] text-content">{f.reply}</div>
                  </div>
                  {f.unread && (
                    <div className="text-[13px] text-muted">Pour continuer l’échange, envoie un nouveau retour.</div>
                  )}
                </>
              ) : (
                <div className="text-[13px] text-muted">Pas de réponse pour l’instant.</div>
              )}
            </section>
          ))}
      </div>
    </SiteShell>
  );
}
