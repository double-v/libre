'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

const MatchDialog = dynamic(() => import('@/components/MatchDialog'), { ssr: false });
const FeedbackButton = dynamic(() => import('@/components/FeedbackButton'), { ssr: false });
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle'), { ssr: false });
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
    <div className="flex items-center justify-center gap-2 border-b border-coral/20 bg-blush px-4 py-1.5 text-center text-xs text-coral-dark dark:border-coral/30 dark:bg-coral/10 dark:text-coral-light">
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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Chrome du haut : bannière + header en une seule pile sticky qui porte
          la safe-area (.pt-safe) — évite le double-inset et garde le contenu
          sous l'encoche/status bar en mode standalone. */}
      <div className="sticky top-0 z-40 bg-white/80 pt-safe shadow-sm backdrop-blur-md dark:bg-gray-950/80">
        <BetaBanner onFeedback={() => window.dispatchEvent(new Event('open-feedback'))} />

        <header>
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
          <Link href="/discover" aria-label="Accueil Libre" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-8 w-8" aria-hidden="true">
              <rect width="512" height="512" rx="96" fill="#E8634A"/>
              <g fill="#fff">
                <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)"/>
                <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)"/>
                <rect x="236" y="42" width="40" height="120" rx="20"/>
                <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)"/>
                <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)"/>
                <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z"/>
              </g>
            </svg>
            <span className="text-lg font-bold text-coral dark:text-coral-light">Libre</span>
          </Link>
          <div className="flex items-center gap-1">
            {session?.user?.role?.toUpperCase() === 'ADMIN' && (
              <Link href="/admin" aria-label="Administration" className="rounded-full p-2 text-gray-500 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-purple-900/30 dark:hover:text-purple-400" title="Administration">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </Link>
            )}
            <Link href="/settings" aria-label="Paramètres" className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </Link>
          </div>
        </div>
        </header>
      </div>

      <main id="main-content" role="main" className="flex-1 pb-nav">{children}</main>

      <nav role="navigation" aria-label="Navigation principale" className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe dark:border-gray-800 dark:bg-gray-950">
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
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
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
      <ThemeToggle />
      <ToastHost />
    </div>
  );
}