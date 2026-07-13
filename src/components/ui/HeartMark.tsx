import type { SVGProps } from 'react';

/**
 * HeartMark — glyphe cœur, **logo de référence unique** de la marque Libre
 * (#294, épic #273). Reprend le cœur de la home (`lobby-nav`) et remplace
 * l'ancien « cœur-soleil à rayons » qui vivait en double dans `SiteNav`,
 * `TopNav` et `Logo`. Source de vérité unique du glyphe de marque.
 *
 * `fill="currentColor"` → theme-aware : hérite de la couleur du parent
 * (`text-coral` dans les navs ; `#fff` sur la pastille coral du lobby). Aucune
 * valeur inline (cf. CLAUDE.md). Décoratif par défaut (`aria-hidden`) — le libellé
 * accessible vit sur le lien parent (« Accueil Libre »). Taille via `className`
 * (`h-8 w-8`…) ou attributs `width`/`height` (props SVG transmises).
 */
export default function HeartMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M12 21s-7.5-4.6-10-9.3C.4 8.1 2 4 6 4c2.2 0 3.8 1.3 6 3.7C14.2 5.3 15.8 4 18 4c4 0 5.6 4.1 4 7.7C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
