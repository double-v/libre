'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ThemeToggle from './ThemeToggle';

/**
 * TopNav — en-tête unifié du Design System, présent partout (app connectée,
 * guest, admin, pages légales). Marque → `/` (guest) ou `/discover` (connecté) ;
 * à droite le `ThemeToggle` (bascule Mode clair/sombre/auto) **toujours** — le
 * choix du thème vit dans les Paramètres —, puis les actions selon la session.
 *
 * Ne remplace PAS la bottom tab bar (nav principale mobile de l'app connectée) :
 * les deux coexistent. Sticky, `bg-surface/80 backdrop-blur`, porte la safe-area.
 * Cf. DESIGN.md § Components — Navigation.
 */
export default function TopNav({
  banner,
  widthClass = 'max-w-lg',
}: {
  /** Contenu rendu au-dessus de la barre, dans le même conteneur sticky (ex: bannière bêta). */
  banner?: ReactNode;
  /** Largeur max du contenu (aligne la barre sur le gabarit de la page). */
  widthClass?: string;
}) {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';
  const isAdmin = session?.user?.role?.toUpperCase() === 'ADMIN';

  return (
    <div className="sticky top-0 z-40 border-b border-hairline bg-surface/80 pt-safe backdrop-blur-md">
      {banner}
      <header>
        <div className={`mx-auto flex ${widthClass} items-center justify-between gap-2 px-4 py-2`}>
          <Brand href={isAuthed ? '/discover' : '/'} />

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />

            {isAuthed ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    aria-label="Administration"
                    title="Administration"
                    className="inline-flex min-h-[44px] items-center rounded-control p-2 text-muted transition-colors hover:bg-fill-subtle hover:text-content"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </Link>
                )}
                <Link
                  href="/settings"
                  aria-label="Paramètres"
                  title="Paramètres"
                  className="inline-flex min-h-[44px] items-center rounded-control p-2 text-muted transition-colors hover:bg-fill-subtle hover:text-content"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/manifesto"
                  className="hidden min-h-[44px] items-center px-2 text-sm font-medium text-muted transition-colors hover:text-content sm:inline-flex"
                >
                  Manifesto
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-muted transition-colors hover:text-content"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center rounded-full bg-coral px-4 text-sm font-semibold text-white transition-colors hover:bg-terracotta focus-visible:outline-none focus-visible:shadow-focus"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

/** Marque cœur-soleil (currentColor + text-coral, zéro hex inline). */
function Brand({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="Accueil Libre" className="flex items-center gap-2 text-coral">
      <svg viewBox="76 36 360 360" className="h-8 w-8" fill="currentColor" aria-hidden="true">
        <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)" />
        <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)" />
        <rect x="236" y="42" width="40" height="120" rx="20" />
        <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)" />
        <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)" />
        <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
      </svg>
      <span className="text-lg font-bold tracking-tight">Libre</span>
    </Link>
  );
}
