import Link from 'next/link';
import { dateLongue } from '@/lib/journal/dates';

/**
 * Une entrée de la liste publique du journal (spec 007, US1 ; maquette T014,
 * écran 1). Toute la carte est le lien : une seule cible, large.
 */
export default function CarteJournal({ slug, titre, extrait, publieeAt }: {
  slug: string;
  titre: string;
  extrait: string;
  publieeAt: Date;
}) {
  return (
    <Link
      href={`/journal/${slug}`}
      className="block rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral motion-reduce:transition-none"
    >
      <time dateTime={publieeAt.toISOString()} className="text-sm text-muted">{dateLongue(publieeAt)}</time>
      <h2 className="mt-1 mb-1.5 break-words text-xl font-bold leading-snug text-content">{titre}</h2>
      <span className="block text-base leading-relaxed text-muted">{extrait}</span>
      <span className="mt-2.5 inline-block text-sm font-semibold text-coral dark:text-coral-light">Lire la suite</span>
    </Link>
  );
}
