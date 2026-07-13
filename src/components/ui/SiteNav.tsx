'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ThemeToggle from './ThemeToggle';
import SiteShell, { type ShellWidth } from './SiteShell';
import HeartMark from './HeartMark';

/**
 * SiteNav — nav unique du shell unifié (#276, épic #273).
 *
 * Une seule barre, deux variantes de session (`guest` / `authed`), dans le langage
 * visuel de la home : sticky, translucide thémée (`bg-surface/80 backdrop-blur`),
 * theme-aware (respecte le mode clair/sombre — pas de neutre froid), safe-area.
 * Remplace `LobbyNav`, `TopNav` et la nav ad hoc de `/manifesto` (branchée zone
 * par zone dans #278→#281 ; les navs historiques tombent au cleanup #283).
 *
 * Contrôle du thème (règle figée, session 2026-07-12) : la variante connectée
 * porte le `ThemeToggle` (axe Mode seul) ; le choix du thème vit dans les
 * Paramètres. La variante guest (dont la landing) n'expose **aucun** sélecteur.
 *
 * La bottom tab bar reste la nav de sections de l'app connectée : les deux
 * coexistent, on ne les fusionne pas.
 */
export type SiteNavVariant = 'guest' | 'authed';

export interface SiteNavViewProps {
  /** Variante de session (résolue par `SiteNav` depuis `useSession`). */
  variant: SiteNavVariant;
  /** Affiche l'entrée Admin (variante `authed`). */
  isAdmin?: boolean;
  /** Largeur de la colonne interne — échelle centralisée #277. Défaut `content`. */
  width?: ShellWidth;
  /** Contenu rendu au-dessus de la barre, dans le conteneur sticky (ex. bannière). */
  banner?: ReactNode;
}

// Tokens only (cf. CLAUDE.md) : text-muted/coral, focus ring coral, cibles ≥ 44px.
const iconLinkClass =
  'inline-flex min-h-[44px] items-center rounded-control p-2 text-muted transition-colors hover:bg-fill-subtle hover:text-content focus-visible:outline-none focus-visible:shadow-focus';
const textLinkClass =
  'inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-muted transition-colors hover:text-content focus-visible:outline-none focus-visible:shadow-focus';
const ctaClass =
  'inline-flex min-h-[44px] items-center rounded-full bg-coral px-4 text-sm font-semibold text-white transition-colors hover:bg-terracotta focus-visible:outline-none focus-visible:shadow-focus';

/**
 * Partie présentationnelle pure (sans session) — toute la logique de rendu.
 * Exportée pour être testée directement (variantes + a11y) sans SessionProvider.
 */
export function SiteNavView({ variant, isAdmin = false, width = 'content', banner }: SiteNavViewProps) {
  const authed = variant === 'authed';

  return (
    <div className="sticky top-0 z-40 border-b border-hairline bg-surface/80 pt-safe backdrop-blur-md">
      {banner}
      <nav aria-label="Navigation principale">
        <SiteShell width={width} className="flex items-center justify-between gap-2 py-2">
          <Brand href={authed ? '/discover' : '/'} />

          <div className="flex items-center gap-1 sm:gap-2">
            {authed ? (
              <>
                <ThemeToggle />
                {isAdmin && (
                  <Link href="/admin" aria-label="Administration" title="Administration" className={iconLinkClass}>
                    <ShieldIcon />
                  </Link>
                )}
                <Link href="/settings" aria-label="Paramètres" title="Paramètres" className={iconLinkClass}>
                  <GearIcon />
                </Link>
              </>
            ) : (
              <>
                <Link href="/manifesto" className={`hidden sm:inline-flex ${textLinkClass}`}>
                  Manifesto
                </Link>
                <Link href="/login" className={textLinkClass}>
                  Se connecter
                </Link>
                <Link href="/register" className={ctaClass}>
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </SiteShell>
      </nav>
    </div>
  );
}

/**
 * SiteNav — wrapper prêt à monter dans les layouts. Résout la variante depuis la
 * session (surchargeable par `variant`/`isAdmin` pour les contextes forcés : la
 * landing est toujours `guest`).
 */
export default function SiteNav({
  variant,
  isAdmin,
  width,
  banner,
}: Partial<SiteNavViewProps> = {}) {
  const { data: session, status } = useSession();
  const resolvedVariant: SiteNavVariant = variant ?? (status === 'authenticated' ? 'authed' : 'guest');
  const resolvedIsAdmin = isAdmin ?? session?.user?.role?.toUpperCase() === 'ADMIN';

  return <SiteNavView variant={resolvedVariant} isAdmin={resolvedIsAdmin} width={width} banner={banner} />;
}

/** Marque cœur-soleil (currentColor + text-coral, zéro hex inline). */
function Brand({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="Accueil Libre" className="flex items-center gap-2 text-coral">
      {/* Logo de référence unique (#294) : le cœur de la marque (HeartMark). */}
      <HeartMark className="h-8 w-8" />
      <span className="text-lg font-bold tracking-tight">Libre</span>
    </Link>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
