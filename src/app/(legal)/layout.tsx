import type { Metadata } from 'next';
import Link from 'next/link';
import SiteNav from '@/components/ui/SiteNav';
import SiteShell from '@/components/ui/SiteShell';

export const metadata: Metadata = {
  title: 'Mentions légales',
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Shell unifié (#279, épic #273 ; largeur élargie #293) : nav partagée +
          colonne `content` (1080px, largeur contenu globale desktop — DESIGN.md
          § Shell). Remplace la TopNav max-w-3xl recodée. Nav adaptative
          (guest/connecté) via session. Le <main id="main-content"> = cible du
          skip-link racine. */}
      <SiteNav width="content" />
      <SiteShell as="main" id="main-content" width="content" className="py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-coral">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-content">Informations légales</span>
        </nav>

        {children}

        {/* Footer links */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-4 border-t border-hairline pt-8 text-sm">
          <Link href="/cgu" className="text-coral hover:underline">CGU</Link>
          <Link href="/confidentialite" className="text-coral hover:underline">Politique de confidentialité</Link>
          <Link href="/mentions-legales" className="text-coral hover:underline">Mentions légales</Link>
          <Link href="/faq" className="text-coral hover:underline">FAQ</Link>
        </div>
      </SiteShell>
    </>
  );
}
