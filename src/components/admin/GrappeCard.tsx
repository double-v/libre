'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import AdminProfilCard, { type DecisionProfil, type ProfilRow } from '@/components/AdminProfilCard';
import ComparaisonComptes, { VARIANTE_NIVEAU, type CompteVue } from '@/components/admin/ComparaisonComptes';
import { LIBELLES_NIVEAU } from '@/lib/fraude/libelles';

export type CompteGrappeVue = CompteVue &
  Omit<ProfilRow, 'userId' | 'inscritLe'> & { dernierSignal: string | null };

export interface GrappeVue {
  id: string;
  comptes: CompteGrappeVue[];
  raisons: string[];
  mentions: string[];
  doublon: { orphelinId: string; gardeId: string } | null;
  niveau: CompteVue['niveau'];
}

interface Props {
  g: GrappeVue;
  onDecision: (userId: string, d: DecisionProfil) => Promise<void>;
  onRien: (userIds: string[]) => Promise<void>;
  onDoublon: (orphelinId: string, gardeId: string) => Promise<void>;
}

const titre = (g: GrappeVue) => {
  if (g.comptes.length === 1) return 'Un compte seul';
  if (g.doublon) return 'Deux comptes, un appareil';
  return `${g.comptes.length} comptes liés`;
};

/**
 * Une grappe de la page Indices (spec 011, US2), d'après le prototype validé
 * le 2026-10-13 : la raison du soupçon, les comptes côte à côte, le geste
 * rapide sur un doublon, et le dossier qui garde toutes les décisions de
 * l'ancienne file « Profils à vérifier ».
 */
export default function GrappeCard({ g, onDecision, onRien, onDoublon }: Props) {
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const orphelin = g.doublon ? g.comptes.find((c) => c.id === g.doublon!.orphelinId) : undefined;
  const plusieurs = g.comptes.length > 1;

  async function agir(f: () => Promise<void>) {
    setOccupe(true);
    try {
      await f();
    } finally {
      setOccupe(false);
      setConfirmer(false);
    }
  }

  return (
    <Card as="section" variant="profile" aria-labelledby={`grappe-${g.id}`} className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <h2 id={`grappe-${g.id}`} className="text-base font-semibold text-content">{titre(g)}</h2>
        <div className="flex flex-wrap gap-1.5">
          {g.doublon && <Tag size="sm" variant="accent">Doublon probable</Tag>}
          <Tag size="sm" variant={VARIANTE_NIVEAU[g.niveau]}>{LIBELLES_NIVEAU[g.niveau]}</Tag>
          <Tag size="sm">{g.comptes.length} compte{plusieurs ? 's' : ''}</Tag>
        </div>
      </div>

      <ul className="flex list-none flex-col gap-1.5 rounded-2xl bg-sunken px-4 py-3 text-sm">
        {g.raisons.map((r) => (
          <li key={r} className="grid grid-cols-[1.1rem_minmax(0,1fr)] gap-1.5">
            <span aria-hidden className="font-bold text-coral">›</span>
            <span>{r}</span>
          </li>
        ))}
        {g.mentions.map((m) => (
          <li key={m} className="grid grid-cols-[1.1rem_minmax(0,1fr)] gap-1.5 text-[13px] text-muted">
            <span aria-hidden className="font-bold text-coral">›</span>
            <span>{m}</span>
          </li>
        ))}
      </ul>

      <ComparaisonComptes comptes={g.comptes} orphelinId={g.doublon?.orphelinId} />

      {g.doublon && orphelin && (
        confirmer ? (
          <div role="group" aria-label="Confirmer la suppression" className="flex flex-col gap-2.5 rounded-2xl border border-coral bg-sunken px-4 py-3.5 text-sm">
            <p className="font-semibold">Supprimer {orphelin.displayName} ?</p>
            <p>
              Le compte et ses données sont effacés. L’autre compte reste tel quel et son dossier est clos.
              L’action est inscrite au journal, sur le compte gardé, avec le motif « doublon ».
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" loading={occupe} disabled={occupe} onClick={() => void agir(() => onDoublon(g.doublon!.orphelinId, g.doublon!.gardeId))}>
                Oui, supprimer
              </Button>
              <Button type="button" variant="secondary" disabled={occupe} onClick={() => setConfirmer(false)}>Annuler</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => setConfirmer(true)}>Supprimer le compte jamais confirmé</Button>
            <span className="text-xs text-muted">Vérifie d’abord que {orphelin.displayName} n’a ni photo ni activité.</span>
          </div>
        )
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" loading={occupe && !confirmer} disabled={occupe} onClick={() => void agir(() => onRien(g.comptes.map((c) => c.id)))}>
          Rien à signaler pour {plusieurs ? 'ces comptes' : 'ce compte'}
        </Button>
      </div>

      <details className="border-t border-hairline pt-2.5">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-coral-dark dark:text-coral-light">
          Ouvrir le dossier et décider compte par compte
        </summary>
        <div className="mt-2 space-y-3">
          {g.comptes.map((c) => (
            <AdminProfilCard
              key={c.id}
              p={{ ...c, userId: c.id, inscritLe: c.createdAt }}
              onDecision={(d) => onDecision(c.id, d)}
            />
          ))}
        </div>
      </details>
    </Card>
  );
}
