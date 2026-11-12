import type { Gravite } from '@/lib/moderation/cas';

const COULEUR: Record<Gravite, string> = {
  bad: 'bg-red-700 dark:bg-red-400',
  warn: 'bg-amber-700 dark:bg-amber-400',
  info: 'bg-blue-700 dark:bg-blue-300',
};

/**
 * Bande de gravité du hub Membres (spec 012, DESIGN.md « Hub Membres »).
 * Décorative : la gravité est toujours dite aussi par un `CaseTag`.
 */
export default function SeverityStripe({ gravite, className = '' }: { gravite: Gravite | null; className?: string }) {
  return <span aria-hidden="true" className={`block w-1 self-stretch rounded-r-[3px] ${gravite ? COULEUR[gravite] : 'bg-transparent'} ${className}`} />;
}
