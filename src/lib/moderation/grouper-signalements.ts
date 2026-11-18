import type { CasFiche } from './fiche';

/**
 * Signalements regroupés par motif (#568 ; DESIGN.md « Signalements
 * regroupés »). La fiche montre une carte par motif, et un geste tranche tous
 * les signalements **affichés** de ce groupe.
 *
 * Module pur, importé par un composant client : il ne doit jamais importer la
 * base (`@/lib/db`), sinon `pg` part dans le paquet du navigateur.
 */

type CasSignalement = Extract<CasFiche, { type: 'report' }>;
export type GroupeSignalements = { type: 'groupe'; motif: string; signalements: CasSignalement[] };
export type CasAffiche = Exclude<CasFiche, { type: 'report' }> | GroupeSignalements;

/**
 * Réunit les signalements d'un même motif à la place du premier d'entre eux ;
 * les autres cas gardent leur ordre. Dans un groupe, le plus ancien d'abord.
 */
export function grouperSignalements(cas: CasFiche[]): CasAffiche[] {
  const sortie: CasAffiche[] = [];
  const parMotif = new Map<string, GroupeSignalements>();
  for (const c of cas) {
    if (c.type !== 'report') {
      sortie.push(c);
      continue;
    }
    let groupe = parMotif.get(c.motif);
    if (!groupe) {
      groupe = { type: 'groupe', motif: c.motif, signalements: [] };
      parMotif.set(c.motif, groupe);
      sortie.push(groupe);
    }
    groupe.signalements.push(c);
  }
  for (const g of parMotif.values()) g.signalements.sort((a, b) => a.depuis.localeCompare(b.depuis));
  return sortie;
}
