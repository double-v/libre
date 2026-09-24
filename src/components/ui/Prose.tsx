import type { ReactNode } from 'react';

/**
 * Prose — conteneur de texte long lisible (DESIGN.md § Prose, spec 007).
 *
 * Ne rend **aucun HTML** : il met en forme des enfants React déjà échappés.
 * Le rythme des paragraphes vient de la règle globale `p { margin-bottom }`
 * (non layerisée, elle l'emporte sur tout utilitaire) : on ne la double pas
 * d'un `gap`. `break-words` : un mot ou une URL trop long casse la ligne
 * plutôt que la page.
 */
export default function Prose({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`break-words text-base leading-relaxed text-content sm:text-lg ${className}`}>{children}</div>;
}
