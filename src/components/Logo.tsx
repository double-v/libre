import Link from 'next/link';

/**
 * Marque « cœur-soleil » de Libre — glyphe seul, sans texte ni lien.
 * `fill="currentColor"` : la couleur est pilotée par le parent (text-coral,
 * text-white sur fond coral, etc.). Rayons affinés (capsules fines) pour un
 * rendu plus élégant que la version d'origine — cf. DESIGN.md § Logo.
 */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="76 36 360 360" className={className} fill="currentColor" aria-hidden="true">
      <rect x="247" y="46" width="18" height="116" rx="9" transform="rotate(-60 256 188)" />
      <rect x="247" y="46" width="18" height="116" rx="9" transform="rotate(-30 256 188)" />
      <rect x="247" y="46" width="18" height="116" rx="9" />
      <rect x="247" y="46" width="18" height="116" rx="9" transform="rotate(30 256 188)" />
      <rect x="247" y="46" width="18" height="116" rx="9" transform="rotate(60 256 188)" />
      <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
    </svg>
  );
}

/**
 * Logo complet : marque + mot « Libre », cliquable. Composant canonique —
 * tout affichage du logo dans l'app passe par ici (jamais de SVG inline).
 */
export default function Logo({
  href = '/',
  showText = true,
  className = '',
  markClassName = 'h-8 w-8',
  label = 'Libre — Retour à l\'accueil',
}: {
  href?: string;
  showText?: boolean;
  className?: string;
  markClassName?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`inline-flex items-center gap-2 text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 rounded-sm ${className}`}
    >
      <LogoMark className={markClassName} />
      {showText && <span className="text-2xl font-bold tracking-tight">Libre</span>}
    </Link>
  );
}
