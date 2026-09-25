'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LAUNCH_COPY } from '@/lib/lancement';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import SiteNav from '@/components/ui/SiteNav';
import { sectionsVisibles, isSectionActive } from '@/components/ui/AppSections';
import { useFeatures } from '@/hooks/useFeatures';
import NotificationDot from '@/components/ui/NotificationDot';
import { UnreadProvider, useUnread } from '@/hooks/useUnread';

const MatchDialog = dynamic(() => import('@/components/MatchDialog'), { ssr: false });
const FeedbackButton = dynamic(() => import('@/components/FeedbackButton'), { ssr: false });
const ConsentAvenantBanner = dynamic(() => import('@/components/ConsentAvenantBanner'), { ssr: false });
const ToastHost = dynamic(() => import('@/components/ui/Toast'), { ssr: false });

// Clé neuve avec la copie de démarrage (#346) : qui avait fermé l'ancienne
// bannière « bêta » lit une fois le nouveau message.
const BETA_DISMISSED_KEY = 'libre_launch_dismissed';

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
      <span>{LAUNCH_COPY.banniere}</span>
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
        aria-label="Fermer ce message"
      >
        &times;
      </button>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // #389 : l'état « non lu » est chargé une fois ici et partagé (tab bar,
  // SiteNav, liste Messages). Le provider est TOUJOURS monté — inerte sans
  // session (ni fetch ni abonnement) — pour que l'arrivée de la session ne
  // change pas la forme de l'arbre : sinon chaque page se remonterait.
  return (
    <UnreadProvider userId={session?.user?.id}>
      <MainShell>{children}</MainShell>
    </UnreadProvider>
  );
}

function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Tunnels sans tab bar : parcours d'accueil (spec 005), renommage imposé (#459).
  const estTunnel = pathname.startsWith('/bienvenue') || pathname.startsWith('/pseudo');
  // Une conversation occupe exactement l'écran (#339) : le fil défile, pas la
  // page, et le champ de saisie reste au-dessus de la tab bar. La hauteur est
  // bornée ici, là où l'on connaît tout ce qui s'empile (bandeaux, SiteNav,
  // tab bar) — la page du chat se contente de remplir `main`.
  const pleinEcran = pathname.startsWith('/chat/');
  const { data: session } = useSession();
  const { hasUnread } = useUnread();
  const features = useFeatures();

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
    <div className={pleinEcran ? 'flex h-dvh flex-col overflow-hidden' : 'flex min-h-screen flex-col'}>
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
          <>
            <BetaBanner onFeedback={() => window.dispatchEvent(new Event('open-feedback'))} />
            {/* Avenant art. 9 (#425) : seulement connecté, et seulement pour
                un compte qui porte déjà des données sensibles sans consentement. */}
            {session?.user?.id && <ConsentAvenantBanner />}
          </>
        }
      />

      <main id="main-content" role="main" className={pleinEcran ? 'min-h-0 flex-1 pb-nav' : 'flex-1 pb-nav'}>{children}</main>

      {/* Label distinct de la nav du haut (SiteNav = « Navigation principale »)
          pour ne pas dupliquer le landmark : la tab bar navigue entre sections.
          `md:hidden` (#347) : à partir de `md` les sections vivent dans SiteNav,
          et un seul landmark de navigation subsiste par breakpoint. */}
      {/* Parcours d'accueil (spec 005) : tunnel court, une seule issue latérale
          (« Plus tard ») — la tab bar s'efface, SiteNav reste. Même chose pour
          le renommage imposé du pseudo (#459). */}
      {!estTunnel && (
      <nav role="navigation" aria-label="Navigation des sections" className="fixed bottom-0 left-0 right-0 z-50 border-t border-hairline bg-surface pb-safe md:hidden">
        <div className="mx-auto flex min-h-14 max-w-lg items-center justify-around">
          {sectionsVisibles(features).map(({ href, label, Icon }) => {
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
                <span className="relative">
                  <Icon active={isActive} width={20} height={20} />
                  {href === '/messages' && hasUnread && (
                    <NotificationDot aria-label="Nouveaux messages" />
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      )}

      {session?.user?.id && <MatchDialog userId={session.user.id} />}

      {/* /pseudo (#459) : une seule action, et le bouton flottant recouvrait
          « Enregistrer » sur mobile. Le lien « Signaler » du bandeau bêta reste. */}
      {!pathname.startsWith('/pseudo') && <FeedbackButton />}
      <ToastHost />
    </div>
  );
}