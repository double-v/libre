import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';
import { MIRROR_COPY, SEEKING_HREF } from '@/lib/onboarding';

/** « je verrai en chemin » → « Je verrai en chemin », comme les chips de choix. */
function label(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Ce que cherche la personne lue, sous son nom dans la fiche (spec 008).
 *
 * L'état vient du serveur, qui a déjà décidé (`intentionFor`) : la valeur
 * voilée n'existe pas côté client. On distingue « voilé pour toi » (invitation
 * à dire la sienne) de « rien de renseigné » (rien : il n'y a rien à dévoiler).
 */
export default function IntentionLine({
  relationshipType,
  veiled = false,
}: {
  relationshipType?: string[] | null;
  veiled?: boolean;
}) {
  if (veiled) {
    return (
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-sm text-muted">
        {/* Signale « il y a une réponse ici » sans la montrer. */}
        <span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-16 rounded-full bg-fill-subtle" />
        <span>{MIRROR_COPY.intentionProfile}</span>
        <Link href={SEEKING_HREF} className={buttonClassName('ghost', 'md', 'px-1')}>
          Préciser
        </Link>
      </div>
    );
  }
  if (!relationshipType || relationshipType.length === 0) return null;
  return <p className="mt-0.5 text-sm text-muted">{relationshipType.map(label).join(' · ')}</p>;
}
