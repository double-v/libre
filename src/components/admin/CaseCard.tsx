import type { ReactNode } from 'react';
import CaseTag from '@/components/ui/CaseTag';
import type { Gravite, TypeCas } from '@/lib/moderation/cas';
import { LIBELLE_CAS } from './MembreRow';

const FILET: Record<Gravite, string> = {
  bad: 'border-l-red-700 dark:border-l-red-400',
  warn: 'border-l-amber-700 dark:border-l-amber-400',
  info: 'border-l-blue-700 dark:border-l-blue-300',
};

/**
 * Un cas à trancher dans la fiche membre (spec 012, US4 ; DESIGN.md « Hub
 * Membres ») : étiquette et titre, âge, corps propre au type, gestes, puis
 * le repère d'une phrase (FR-020). Le contenu de membre passe toujours par
 * React, jamais en HTML brut (FR-S15).
 */
export default function CaseCard({
  type,
  gravite,
  titre,
  age,
  repere,
  gestes,
  children,
}: {
  type: TypeCas;
  gravite: Gravite;
  titre: string;
  age: string;
  repere: string;
  gestes: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={`grid min-w-0 content-start gap-2.5 rounded-card border border-l-4 border-hairline bg-surface p-3.5 ${FILET[gravite]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <CaseTag variant={gravite}>{LIBELLE_CAS[type]}</CaseTag>
          <h3 className="text-base font-semibold text-content">{titre}</h3>
        </span>
        <span className="font-mono text-xs text-muted">{age}</span>
      </div>
      {children}
      <div className="flex flex-wrap gap-2">{gestes}</div>
      <div className="border-t border-dashed border-hairline pt-2 text-xs text-muted">
        <b className="text-content">Repère.</b> {repere}
      </div>
    </article>
  );
}
