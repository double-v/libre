'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import SiteNav from '@/components/ui/SiteNav';

const MatchDialog = dynamic(() => import('@/components/MatchDialog'), { ssr: false });
const FeedbackButton = dynamic(() => import('@/components/FeedbackButton'), { ssr: false });
const ToastHost = dynamic(() => import('@/components/ui/Toast'), { ssr: false });

const BETA_DISMISSED_KEY = 'libre_beta_dismissed';

const navItems = [
  { href: '/discover', label: 'Découvrir' },
  { href: '/messages', label: 'Messages' },
  { href: '/square', label: 'La Place' },
  { href: '/profile', label: 'Profil' },
];

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
      {/* Shell unifié (#280, épic #273) : la nav du haut passe sur le SiteNav
          partagé (variante connectée résolue via session), largeur « app »
          (max-w-lg, mobile-first). La bannière bêta reste câblée dans le même
          conteneur sticky (safe-area portée par SiteNav). La bottom tab bar
          coexiste (décision DESIGN.md § Navigation, on ne fusionne pas). */}
      <SiteNav
        width="app"
        banner={
          <BetaBanner onFeedback={() => window.dispatchEvent(new Event('open-feedback'))} />
        }
      />

      <main id="main-content" role="main" className="flex-1 pb-nav">{children}</main>

      {/* Label distinct de la nav du haut (SiteNav = « Navigation principale »)
          pour ne pas dupliquer le landmark : la tab bar navigue entre sections. */}
      <nav role="navigation" aria-label="Navigation des sections" className="fixed bottom-0 left-0 right-0 z-50 border-t border-hairline bg-surface pb-safe">
        <div className="mx-auto flex min-h-14 max-w-lg items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'font-semibold text-coral dark:text-coral-light'
                    : 'text-muted hover:text-content'
                }`}
              >
                {item.href === '/discover' && (
                  isActive ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  )
                )}
                {item.href === '/messages' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                )}
                {item.href === '/square' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                )}
                {item.href === '/profile' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                )}
                {item.label}
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