'use client';

import CaseTag, { type CaseTagVariant } from '@/components/ui/CaseTag';
import SeverityStripe from '@/components/ui/SeverityStripe';
import type { MembreListe, StatutMembre } from '@/lib/moderation/membres';
import type { NiveauFiabilite } from '@/lib/fraude/fiabilite';
import type { TypeCas } from '@/lib/moderation/cas';
import { duree, ilYa, vuLe } from '@/lib/moderation/temps';

export const LIBELLE_CAS: Record<TypeCas, string> = {
  report: 'Signalement',
  verif: 'Selfie',
  photo: 'Photo',
  reponse: 'Réponse',
  relecture: 'Relecture',
  indice: 'Indice',
};

/** Étiquette de statut ; un compte actif n'en porte pas. */
export function StatutTag({ statut }: { statut: StatutMembre }) {
  if (statut === 'banni') return <CaseTag variant="bad">Banni</CaseTag>;
  if (statut === 'masque') return <CaseTag>Masqué</CaseTag>;
  if (statut === 'non_confirme') return <CaseTag>Non confirmé</CaseTag>;
  return null;
}

/** Étiquette de fiabilité ; un compte fiable n'en porte pas. */
export function FiabiliteTag({ niveau }: { niveau: NiveauFiabilite }) {
  if (niveau === 'douteux') return <CaseTag variant="bad">Douteux</CaseTag>;
  if (niveau === 'a_surveiller') return <CaseTag variant="warn">À surveiller</CaseTag>;
  return null;
}

/** Avatar rond : la photo principale, ou l'initiale sur fond doux. */
export function Avatar({ src, pseudo, taille = 40 }: { src: string | null; pseudo: string; taille?: 40 | 56 }) {
  const dim = taille === 56 ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- proxy des photos, dérogation admin tracée
    return <img src={src} alt="" className={`${dim} shrink-0 rounded-full bg-sunken object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${dim} grid shrink-0 place-items-center rounded-full bg-sunken font-semibold text-muted`}>
      {pseudo.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/**
 * Une ligne de la liste Membres (spec 012, US3 ; DESIGN.md « Hub Membres »).
 * Les cas d'un même type se regroupent en une étiquette (« Signalement ×3 »).
 */
export default function MembreRow({
  m,
  courant,
  onOuvrir,
  maintenant,
}: {
  m: MembreListe;
  courant: boolean;
  onOuvrir: (id: string) => void;
  maintenant: Date;
}) {
  const parType = new Map<TypeCas, { n: number; variant: CaseTagVariant }>();
  for (const c of m.cas) {
    const e = parType.get(c.type);
    parType.set(c.type, { n: (e?.n ?? 0) + 1, variant: c.gravite });
  }
  const premier = m.cas[0] ?? null;

  return (
    <button
      type="button"
      onClick={() => onOuvrir(m.id)}
      aria-current={courant ? 'true' : undefined}
      className={`grid min-h-16 w-full grid-cols-[4px_40px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-hairline py-2.5 pl-0 pr-3 text-left last:border-b-0 hover:bg-sunken/60 focus-visible:outline-none focus-visible:shadow-focus ${courant ? 'bg-sunken' : 'bg-transparent'}`}
    >
      <SeverityStripe gravite={premier?.gravite ?? null} />
      <Avatar src={m.avatar} pseudo={m.pseudo} />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-content">
          <span className="truncate">{m.pseudo}</span>
          {m.verifie && <span className="text-xs font-semibold text-green-700 dark:text-green-400" aria-label="vérifié">✓</span>}
        </span>
        <span className="block text-xs text-muted">Inscrit {ilYa(m.inscritAt, maintenant)} · {vuLe(m.vuLe, maintenant)}</span>
        {(parType.size > 0 || m.statut !== 'actif' || m.fiabilite !== 'fiable') && (
          <span className="mt-1 flex flex-wrap gap-1">
            {[...parType].map(([type, { n, variant }]) => (
              <CaseTag key={type} variant={variant}>{LIBELLE_CAS[type]}{n > 1 ? ` ×${n}` : ''}</CaseTag>
            ))}
            <StatutTag statut={m.statut} />
            <FiabiliteTag niveau={m.fiabilite} />
          </span>
        )}
      </span>
      <span className="text-[11px] font-medium text-muted">{premier ? duree(premier.depuis, maintenant) : ''}</span>
    </button>
  );
}
