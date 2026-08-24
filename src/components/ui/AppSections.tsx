import type { SVGProps } from 'react';

/**
 * AppSections — les quatre sections de l'app connectée, source unique (#347, épic #273).
 *
 * Elles se rendent à **deux endroits** selon le breakpoint : la bottom tab bar
 * sous `md` (`(main)/layout.tsx`), la barre du haut à partir de `md` (`SiteNav`,
 * variante connectée). Les deux n'existent jamais ensemble — un seul landmark de
 * navigation par breakpoint — mais elles décrivent la même destination, donc la
 * liste et ses glyphes vivent ici plutôt qu'en double dans les deux surfaces.
 *
 * `Découvrir` a un glyphe plein à l'état actif (le cœur se remplit) ; les trois
 * autres gardent leur trait. C'est le comportement de la tab bar d'origine,
 * conservé tel quel.
 */
export interface AppSection {
  href: string;
  label: string;
  Icon: (props: { active?: boolean } & SVGProps<SVGSVGElement>) => React.ReactElement;
}

function HeartSection({ active = false, ...props }: { active?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function ChatSection(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function PeopleSection(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function PersonSection(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export const APP_SECTIONS: readonly AppSection[] = [
  { href: '/discover', label: 'Découvrir', Icon: HeartSection },
  { href: '/messages', label: 'Messages', Icon: ChatSection },
  { href: '/square', label: 'La Place', Icon: PeopleSection },
  { href: '/profile', label: 'Profil', Icon: PersonSection },
];

/**
 * Une section est active sur sa propre route et sur ses sous-routes
 * (`/messages` reste actif dans `/messages/xyz`).
 */
export function isSectionActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}
