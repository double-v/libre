import type { Metadata } from 'next';
import Link from 'next/link';
import TopNav from '@/components/ui/TopNav';

export const metadata: Metadata = {
  title: 'Mentions légales',
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
    <TopNav widthClass="max-w-3xl" />
    <div className="mx-auto max-w-3xl px-6 py-12">
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
    </div>
    </>
  );
}