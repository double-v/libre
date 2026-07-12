import type { HTMLAttributes, ReactNode } from 'react';

export type ShellWidth = 'content' | 'reading' | 'app';

export type ShellElement = 'div' | 'main' | 'section' | 'article';

export interface SiteShellProps extends HTMLAttributes<HTMLElement> {
  /**
   * Échelle de largeurs centralisée (#277 / DESIGN.md § Shell unifié).
   * - `content` (~1080px) : pages contenu larges (home, sections marketing).
   * - `reading` (~720px)  : texte long centré (manifesto, légal).
   * - `app`     (512px)   : app connectée mobile-first (feed, messages, profil).
   * Défaut : `content` (densité douce — les pages contenu respirent large).
   */
  width?: ShellWidth;
  /** Balise sémantique. Défaut `div`. */
  as?: ShellElement;
  children: ReactNode;
}

// Source de vérité unique des largeurs : les utilitaires proviennent des tokens
// --container-* de globals.css (@theme). Aucune valeur inline (cf. CLAUDE.md).
const widthClasses: Record<ShellWidth, string> = {
  content: 'max-w-content',
  reading: 'max-w-reading',
  app: 'max-w-lg',
};

/**
 * SiteShell — conteneur central partagé (épic #273, shell unifié).
 *
 * Une colonne centrée (`mx-auto`), pleine largeur sous le max, avec gouttières
 * responsives (`px-4 sm:px-6`), plafonnée par l'échelle de largeurs centralisée.
 * Remplace les `mx-auto max-w-* px-*` ad hoc dispersés (448/512/672/768/1080).
 *
 * Les zones le consomment au fil de la migration (#278 manifesto, #279 légal,
 * #280 app, #281 auth/admin) au lieu de recoder leur propre largeur.
 *
 * `className` est *additif* (ex. `py-12`, alignement) — il ne surcharge pas les
 * largeurs/gouttières de l'échelle (utiliser `width` pour ça).
 */
export default function SiteShell({
  width = 'content',
  as = 'div',
  className = '',
  children,
  ...rest
}: SiteShellProps) {
  const merged = ['mx-auto w-full px-4 sm:px-6', widthClasses[width], className]
    .filter(Boolean)
    .join(' ');

  const Element = as;
  return (
    <Element className={merged} {...rest}>
      {children}
    </Element>
  );
}
