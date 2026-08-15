'use client';

import { useState } from 'react';
import { photoUrl } from '@/lib/photos';

export type SensitivePhotoSize = 'avatar' | 'tile' | 'hero' | 'fill';

export interface SensitivePhotoProps {
  /** Clé R2 de la photo. */
  photoKey: string;
  alt: string;
  size?: SensitivePhotoSize;
  /**
   * La photo arrive-t-elle floutée pour ce lecteur ? Calculé **côté serveur**
   * (cf. `veiledPhotoKeys`) : le composant ne devine rien, il pose le voile
   * exactement là où le proxy servira le dérivé.
   */
  veiled?: boolean;
  /** Pastille de niveau, montrée au propriétaire sur ses propres photos. */
  badge?: string;
  /**
   * Propose l'action « Voir ». Faux sur les vignettes trop petites pour porter
   * une cible tactile : elles restent floutées, et c'est la grande image
   * qu'elles sélectionnent qui offre la révélation.
   */
  revealable?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<SensitivePhotoSize, string> = {
  avatar: 'h-12 w-12 rounded-full',
  tile: 'aspect-square w-full rounded-lg',
  hero: 'aspect-[4/5] w-full rounded-xl',
  // Le parent impose les dimensions (et l'arrondi via `className`).
  fill: 'h-full w-full',
};

const BUTTON_CLASSES: Record<SensitivePhotoSize, string> = {
  // À 48 px, une cible de 44 px ne rentre pas : la pastille reste lisible mais
  // la vraie zone cliquable est la carte, qui ouvre la fiche — c'est là que la
  // révélation a de la place (cf. DESIGN.md).
  avatar: 'px-1.5 py-0.5 text-[10px]',
  tile: 'min-h-[44px] px-4 text-sm',
  hero: 'min-h-[44px] px-4 text-sm',
  fill: 'min-h-[44px] px-4 text-sm',
};

/**
 * Photo classée sensible : surface floutée + action « Voir » (#330).
 *
 * Le flou n'est **pas** un `filter: blur()` : il vient du serveur, qui sert un
 * dérivé stocké tant que le lecteur n'a pas demandé l'original. Un flou CSS
 * laisserait l'image nette arriver dans le navigateur, donc lisible dans
 * l'onglet réseau — la garantie ne serait qu'un décor.
 *
 * Révéler n'engage rien : le clic ajoute `?reveal=1` à la requête suivante et
 * ne modifie pas le réglage de la personne. Voir une photo n'est pas consentir
 * à toutes les suivantes.
 */
export default function SensitivePhoto({
  photoKey,
  alt,
  size = 'tile',
  veiled = false,
  badge,
  revealable = true,
  className = '',
}: SensitivePhotoProps) {
  const [revealed, setRevealed] = useState(false);
  const showVeil = veiled && !revealed;

  const src = revealed ? `${photoUrl(photoKey)}?reveal=1` : photoUrl(photoKey);

  return (
    <div
      className={`relative overflow-hidden bg-fill-subtle ${SIZE_CLASSES[size]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- le proxy redirige
          vers une URL R2 signée à TTL court, que le cache de next/image mettrait
          en défaut (même raison que AdminUserPhotos). */}
      <img src={src} alt={showVeil ? `${alt} (floutée)` : alt} className="h-full w-full object-cover" />

      {showVeil && revealable && (
        <span className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              // La carte parente est cliquable (ouverture de la fiche) : sans
              // ça, révéler naviguerait aussitôt ailleurs.
              e.stopPropagation();
              setRevealed(true);
            }}
            aria-label={`Voir la photo de ${alt}`}
            // Contrastes en dur et non en tokens de surface : le fond est une
            // photo floutée, claire ou sombre selon l'image — un bouton en
            // `bg-surface` deviendrait illisible sur la moitié des cas.
            className={`rounded-full border border-white/55 bg-ink/55 font-semibold text-white backdrop-blur-[2px] transition-colors duration-[var(--motion-fast)] hover:bg-ink/70 focus-visible:outline-none focus-visible:shadow-focus ${BUTTON_CLASSES[size]}`}
          >
            Voir
          </button>
        </span>
      )}

      {badge && (
        <span className="absolute bottom-2 left-2 rounded-full bg-ink/60 px-2 py-0.5 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}
