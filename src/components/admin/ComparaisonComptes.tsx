import Link from 'next/link';
import Tag, { type TagVariant } from '@/components/ui/Tag';
import { LIBELLES_NIVEAU, LIBELLES_SIGNAL } from '@/lib/fraude/libelles';

/** Un compte d'une grappe, tel que `GET /api/admin/indices` le sérialise. */
export interface CompteVue {
  id: string;
  displayName: string;
  createdAt: string;
  emailConfirme: boolean;
  niveau: 'fiable' | 'a_surveiller' | 'douteux';
  types: string[];
  email: string;
  aPhoto: boolean;
  photos: string[];
  lastSeenAt: string | null;
  etatVerification: 'aucune' | 'invite' | 'retrait' | 'verifie';
}

export const VARIANTE_NIVEAU: Record<CompteVue['niveau'], TagVariant> = {
  douteux: 'refused',
  a_surveiller: 'pending',
  fiable: 'default',
};

const ETAT: Record<Exclude<CompteVue['etatVerification'], 'aucune'>, [string, TagVariant]> = {
  invite: ['Invité au selfie', 'pending'],
  retrait: ['En retrait', 'refused'],
  verifie: ['Vérifié', 'verified'],
};

const quand = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function derniereVisite(iso: string | null): string {
  if (!iso) return 'jamais';
  // `lastSeenAt` est un jour (minuit UTC) : on compte en jours de calendrier.
  const aujourdhui = new Date();
  const jour = Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), aujourdhui.getUTCDate());
  const jours = Math.round((jour - new Date(iso).getTime()) / 86_400_000);
  if (jours <= 0) return 'aujourd’hui';
  if (jours === 1) return 'hier';
  return `il y a ${jours} jours`;
}

/**
 * Les comptes d'une grappe côte à côte (spec 011, US2) : de quoi comparer
 * sans ouvrir deux fiches. Le compte probablement en trop d'un doublon a une
 * bordure en pointillé.
 */
export default function ComparaisonComptes({ comptes, orphelinId }: { comptes: CompteVue[]; orphelinId?: string | null }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
      {comptes.map((c) => {
        const orphelin = c.id === orphelinId;
        return (
          <article
            key={c.id}
            aria-label={c.displayName}
            className={`flex min-w-0 flex-col gap-2.5 rounded-2xl border p-3.5 ${orphelin ? 'border-dashed border-coral-light' : 'border-hairline'}`}
          >
            <div className="flex items-center gap-2.5">
              {c.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniature admin servie par le proxy photo
                <img src={c.photos[0]} alt="" className="h-10 w-10 flex-none rounded-full object-cover" />
              ) : (
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-fill-subtle text-center text-[10px] leading-tight text-muted">sans photo</span>
              )}
              <div className="min-w-0">
                <Link href={`/admin/users/${c.id}`} className="break-words font-semibold text-content hover:underline">
                  {c.displayName}
                </Link>
                {orphelin && <p className="text-xs text-muted">probablement le compte en trop</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Tag size="sm" variant={VARIANTE_NIVEAU[c.niveau]}>{LIBELLES_NIVEAU[c.niveau]}</Tag>
              {c.etatVerification !== 'aucune' && (
                <Tag size="sm" variant={ETAT[c.etatVerification][1]}>{ETAT[c.etatVerification][0]}</Tag>
              )}
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
              <dt className="text-muted">Inscription</dt>
              <dd className="tabular-nums">{quand(c.createdAt)}</dd>
              <dt className="text-muted">Adresse</dt>
              <dd className={c.emailConfirme ? 'text-success' : 'text-error'}>{c.emailConfirme ? 'confirmée' : 'jamais confirmée'}</dd>
              <dt className="text-muted">Photo</dt>
              <dd>{c.aPhoto ? 'oui' : 'non'}</dd>
              <dt className="text-muted">Dernière visite</dt>
              <dd>{derniereVisite(c.lastSeenAt)}</dd>
            </dl>
            <p className="border-t border-hairline pt-2 text-xs text-muted">
              Indices :{' '}
              <span className="font-medium text-content">
                {[...new Set(c.types)].map((t) => LIBELLES_SIGNAL[t] ?? t).join(' · ')}
              </span>
            </p>
          </article>
        );
      })}
    </div>
  );
}
