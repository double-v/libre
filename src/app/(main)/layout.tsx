'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import SiteNav from '@/components/ui/SiteNav';
import { APP_SECTIONS, isSectionActive } from '@/components/ui/AppSections';

const MatchDialog = dynamic(() => import('@/components/MatchDialog'), { ssr: false });
const FeedbackButton = dynamic(() => import('@/components/FeedbackButton'), { ssr: false });
const ToastHost = dynamic(() => import('@/components/ui/Toast'), { ssr: false });

const BETA_DISMISSED_KEY = 'libre_beta_dismissed';

function BetaBanner({ onFeedback }: { onFeedback: () => void }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(BETA_DISMISSED_KEY)) {
      // Lecture localStorage post-hydratation : SSR rend « masqué » (défaut),
      // on ne révèle qu'après le montage client → un seul flip, pattern SSR-safe
      // intentionnel (pas de mismatch d'hydratation). Cf #193.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-coral/20 bg-sunken px-4 py-1.5 text-center text-xs text-coral-dark dark:border-coral/30 dark:text-coral-light">
      <span className="mr-1 rounded-full bg-coral px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
        Bêta
      </span>
      <span>Libre est en version bêta — vos retours comptent !</span>
      <button
        type="button"
        onClick={onFeedback}
        className="font-semibold underline underline-offset-2 hover:no-underline"
      >
        Signaler
      </button>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(BETA_DISMISSED_KEY, '1');
        }}
        className="ml-1 text-coral-dark/60 hover:text-coral-dark dark:text-coral-light/60 dark:hover:text-coral-light"
        aria-label="Fermer la bannière bêta"
      >
        &times;
      </button>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu';

  // Sync cross-appareils du skin (cf. #224) : si aucun choix local n'existe
  // encore sur cet appareil, on adopte celui enregistré sur le compte. Une
  // seule fois (dès qu'un skin local est posé, on ne refetch plus). Best-effort.
  useEffect(() => {
    if (!session?.user?.id) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('libre-skin')) return;
    let cancelled = false;
    fetch('/api/users/skin')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.skin) return;
        localStorage.setItem('libre-skin', d.skin);
        document.documentElement.setAttribute('data-theme', d.skin);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Shell unifié (#280, épic #273), amendé desktop par #347 : la nav du haut
          est le SiteNav partagé (variante connectée résolue via session), en
          largeur « content » — l'app connectée adopte la colonne de la home au
          lieu de sa colonne mobile-first. Elle porte les sections à partir de
          `md`, où la tab bar s'efface. La bannière bêta reste câblée dans le même
          conteneur sticky (safe-area portée par SiteNav). */}
      <SiteNav
        width="content"
        showSections
        banner={
          <BetaBanner onFeedback={() => window.dispatchEvent(new Event('open-feedback'))} />
        }
      />

      <main id="main-content" role="main" className="flex-1 pb-nav">{children}</main>

      {/* Label distinct de la nav du haut (SiteNav = « Navigation principale »)
          pour ne pas dupliquer le landmark : la tab bar navigue entre sections.
          `md:hidden` (#347) : à partir de `md` les sections vivent dans SiteNav,
          et un seul landmark de navigation subsiste par breakpoint. */}
      <nav role="navigation" aria-label="Navigation des sections" className="fixed bottom-0 left-0 right-0 z-50 border-t border-hairline bg-surface pb-safe md:hidden">
        <div className="mx-auto flex min-h-14 max-w-lg items-center justify-around">
          {APP_SECTIONS.map(({ href, label, Icon }) => {
            const isActive = isSectionActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'font-semibold text-coral dark:text-coral-light'
                    : 'text-muted hover:text-content'
                }`}
              >
                <Icon active={isActive} width={20} height={20} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {session?.user?.id && pusherKey && (
        <MatchDialog
          userId={session.user.id}
          pusherKey={pusherKey}
          pusherCluster={pusherCluster}
        />
      )}

      <FeedbackButton />
      <ToastHost />
    </div>
  );
}