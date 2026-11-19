'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CountChip from '@/components/ui/CountChip';

/**
 * Navigation du bureau (spec 012, FR-042 ; #568, DESIGN.md « Coque du
 * bureau ») : quatre entrées, dans l'en-tête à partir de 900 px, en onglets
 * au bas de l'écran en dessous. Le même seuil que le hub Membres, pour que la
 * coque et la page basculent ensemble. Les onglets ne lisent pas `--nav-h` :
 * ce token de l'app membre s'annule dès 768 px, et la barre s'écrasait entre
 * 768 et 900 px.
 *
 * « Activité » est le tableau de bord actuel en attendant #544 ; « Outils »
 * réunit les autres pages, qui gardent leur adresse. Les compteurs sont des
 * `CountChip` : le chiffre est légitime ici, surface admin (#391).
 */
type Cle = 'activite' | 'membres' | 'retours' | 'outils';

export const ENTREES: Array<{ cle: Cle; href: string; libelle: string }> = [
  { cle: 'activite', href: '/admin', libelle: 'Activité' },
  { cle: 'membres', href: '/admin/membres', libelle: 'Membres' },
  { cle: 'retours', href: '/admin/feedback', libelle: 'Retours' },
  { cle: 'outils', href: '/admin/outils', libelle: 'Outils' },
];

/** L'entrée dont relève une adresse : tout ce qui n'a pas la sienne est un outil. */
export function entreeCourante(pathname: string): Cle {
  if (pathname === '/admin') return 'activite';
  if (pathname === '/admin/membres' || pathname.startsWith('/admin/membres/')) return 'membres';
  if (pathname === '/admin/feedback' || pathname.startsWith('/admin/feedback/')) return 'retours';
  return 'outils';
}

function Icone({ cle }: { cle: Cle }) {
  const trace = {
    activite: <path d="M3 12h4l3 8 4-16 3 8h4" />,
    membres: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
    retours: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
    outils: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  }[cle];
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {trace}
    </svg>
  );
}

export default function AdminNav({ variante, atraiter, retours }: { variante: 'entete' | 'onglets'; atraiter: number; retours: number }) {
  const courante = entreeCourante(usePathname() ?? '/admin');
  const compteur = (cle: Cle) => (cle === 'membres' ? atraiter : cle === 'retours' ? retours : 0);

  if (variante === 'entete') {
    return (
      <nav aria-label="Sections du bureau" className="ml-2 hidden gap-1 min-[900px]:flex">
        {ENTREES.map((e) => (
          <Link
            key={e.cle}
            href={e.href}
            aria-current={courante === e.cle ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-control px-3.5 text-sm focus-visible:outline-none focus-visible:shadow-focus ${
              courante === e.cle ? 'bg-sunken font-semibold text-content' : 'font-medium text-muted hover:bg-fill-subtle hover:text-content'
            }`}
          >
            {e.libelle}
            <CountChip count={compteur(e.cle)} />
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Sections du bureau" className="grid shrink-0 grid-cols-4 border-t border-hairline bg-surface pb-safe min-[900px]:hidden">
      {ENTREES.map((e) => (
        <Link
          key={e.cle}
          href={e.href}
          aria-current={courante === e.cle ? 'page' : undefined}
          className={`relative grid min-h-14 place-items-center content-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] focus-visible:outline-none focus-visible:shadow-focus ${
            courante === e.cle ? 'text-coral-dark dark:text-coral-light' : 'text-muted'
          }`}
        >
          {courante === e.cle && <span aria-hidden="true" className="absolute inset-x-[30%] top-0 h-0.5 bg-coral" />}
          <span className="relative">
            <Icone cle={e.cle} />
            <CountChip count={compteur(e.cle)} className="absolute -right-5 -top-1.5" />
          </span>
          {e.libelle}
        </Link>
      ))}
    </nav>
  );
}
