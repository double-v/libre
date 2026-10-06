'use client';

import Link from 'next/link';
import Tag from '@/components/ui/Tag';
import { LIBELLES_NIVEAU, LIBELLES_SIGNAL, MENTION_LEGITIME } from '@/lib/fraude/libelles';

/**
 * Indice de fiabilité côté admin (spec 010, US3). Le niveau se lit d'un coup
 * d'œil ; la liste des indices dit pourquoi, sans pondération cachée. Les
 * indices de contexte rappellent qu'ils peuvent être légitimes : un indice
 * n'est jamais une preuve. Surfaces admin seulement.
 */
export type Niveau = 'fiable' | 'a_surveiller' | 'douteux';

const VARIANTE: Record<Niveau, 'default' | 'pending' | 'refused'> = {
  fiable: 'default',
  a_surveiller: 'pending',
  douteux: 'refused',
};

export function NiveauFiabiliteTag({ niveau }: { niveau: Niveau }) {
  return (
    <Tag variant={VARIANTE[niveau]} size="sm" data-niveau={niveau}>
      {LIBELLES_NIVEAU[niveau]}
    </Tag>
  );
}

export interface IndiceFiabilite {
  type: string;
  force: string;
  date: string;
  extrait: string | null;
  autreUserId: string | null;
  legitimePossible: boolean;
}

const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

export function AdminIndicesFiabilite({
  niveau,
  invitation,
  indices,
}: {
  niveau: Niveau;
  invitation: { depuis: string } | null;
  indices: IndiceFiabilite[];
}) {
  return (
    <section aria-labelledby="fiabilite-titre" className="mb-6 rounded-xl border border-hairline p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="fiabilite-titre" className="text-lg font-semibold text-content">Indice de fiabilité</h2>
        <NiveauFiabiliteTag niveau={niveau} />
      </div>
      {invitation && (
        <p className="mb-3 text-sm text-muted">
          Invité automatiquement à se faire vérifier le {date(invitation.depuis)}. Le profil reste visible ; la mise en retrait reste ta décision.
        </p>
      )}
      {indices.length === 0 ? (
        <p className="text-sm text-muted">Aucun indice en attente : rien ne pèse sur ce compte.</p>
      ) : (
        <ul className="grid gap-2">
          {indices.map((s, i) => (
            <li key={i} className="rounded-xl bg-sunken px-3 py-2.5 text-sm text-content">
              <div className="flex flex-wrap items-center gap-2">
                <Tag variant={s.force === 'fort' ? 'refused' : 'pending'} size="sm">
                  {s.force === 'fort' ? 'Indice fort' : 'Indice faible'}
                </Tag>
                <span className="font-medium">{LIBELLES_SIGNAL[s.type] ?? s.type}</span>
              </div>
              {s.extrait && <p className="mt-1.5 break-words font-mono text-xs text-content">« {s.extrait} »</p>}
              {s.legitimePossible && <p className="mt-1.5 text-xs text-muted">{MENTION_LEGITIME[s.type] ?? 'Peut être légitime.'}</p>}
              {s.autreUserId && (
                <Link href={`/admin/users/${s.autreUserId}`} className="mt-1.5 inline-block text-xs font-semibold text-coral-dark underline underline-offset-2 hover:no-underline dark:text-coral-light">
                  Voir l’autre compte
                </Link>
              )}
              <p className="mt-1 text-xs text-muted">Le {date(s.date)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
