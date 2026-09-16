/**
 * NotificationDot — pastille de présence, jamais un compteur (DESIGN.md).
 *
 * Dit « il y a quelque chose de nouveau ici » sans dire combien : c'est la seule
 * forme de badge autorisée côté membre (charte PRODUCT.md, spec 003 FR-006).
 * Pas de texte, pas d'animation — rien à clamper sous `prefers-reduced-motion`.
 * L'`aria-label` est obligatoire : une pastille muette serait une information
 * réservée aux voyants.
 */
export interface NotificationDotProps {
  'aria-label': string;
  /** Aligné au texte (liste) plutôt que posé en haut à droite de l'icône parente. */
  inline?: boolean;
  className?: string;
}

const base = 'h-2 w-2 rounded-full bg-coral';

export default function NotificationDot({ 'aria-label': label, inline = false, className = '' }: NotificationDotProps) {
  const placement = inline ? 'inline-block align-middle' : 'absolute -top-0.5 -right-0.5';
  return <span role="status" aria-label={label} className={`${base} ${placement} ${className}`.trim()} />;
}
