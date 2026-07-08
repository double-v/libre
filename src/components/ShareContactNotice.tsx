/**
 * Badge système affiché dans le fil de conversation quand quelqu'un propose
 * d'échanger ses réseaux (issue #207). Remplace l'affichage du JSON brut
 * `{"type":"share-contact",...}` par un message lisible, centré, chaleureux.
 *
 * Tokens : univers coral/blush (accent chaleureux du chat, cf. DESIGN.md),
 * jamais de gris brut. Dark mode dédié. Pas d'animation (rien à neutraliser
 * pour prefers-reduced-motion).
 */
interface ShareContactNoticeProps {
  /** true si c'est l'utilisateur courant qui a proposé l'échange. */
  isSent: boolean;
  /** Nom affiché de l'autre personne (pour la copie destinataire). */
  otherName: string;
}

export default function ShareContactNotice({ isSent, otherName }: ShareContactNoticeProps) {
  const label = isSent
    ? 'Tu as proposé d’échanger vos réseaux'
    : `${otherName} aimerait échanger vos réseaux`;

  return (
    <div className="flex justify-center py-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blush px-3 py-1.5 text-xs font-medium text-coral-dark dark:bg-coral/10 dark:text-coral-light">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span>{label}</span>
      </span>
    </div>
  );
}
