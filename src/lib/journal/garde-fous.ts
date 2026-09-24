import { createHash } from 'crypto';
import { REGLES_EDITORIALES } from './regles';

/**
 * Contrôle éditorial du journal (spec 007, US3 ; research R3).
 *
 * Rejoué **par le serveur** à chaque publication : ce que l'écran a coché ne
 * vaut rien tant que le serveur n'a pas refait le calcul sur le texte qu'il
 * s'apprête à publier. Module serveur (`crypto`) : l'écran obtient les alertes
 * par la route de contrôle, jamais en important ce fichier.
 */

export interface Alerte {
  regle: string;
  motif: string;
  description: string;
  extrait: string;
  bloquante: boolean;
  /**
   * Identifie l'alerte **pour cet extrait-là** : modifier l'extrait change
   * l'empreinte, donc une levée ne survit pas à une retouche (FR-019). Ne
   * dépend ni du titre ni de la position, pour qu'un ajout ailleurs dans le
   * texte ne fasse pas relever ce qui l'a déjà été.
   */
  empreinte: string;
}

function empreinte(regle: string, motif: string, extrait: string): string {
  return createHash('sha256').update(`${regle}\u0000${motif}\u0000${extrait}`).digest('hex').slice(0, 16);
}

export function controler(titre: string, corps: string): Alerte[] {
  const texte = `${titre}\n${corps}`;
  const alertes: Alerte[] = [];
  const vues = new Set<string>();
  // Un e-mail contient un @ : sans cette exclusion, sa partie locale
  // ressortirait aussi en « identifiant », doublon qui brouille l'écran.
  const courriels = new Set<string>();

  for (const regle of REGLES_EDITORIALES) {
    for (const motif of regle.motifs) {
      for (const extrait of motif.trouver(texte)) {
        if (motif.id === 'courriel') courriels.add(extrait);
        if (motif.id === 'identifiant' && [...courriels].some((c) => c.includes(extrait))) continue;
        const e = empreinte(regle.id, motif.id, extrait);
        if (vues.has(e)) continue;
        vues.add(e);
        alertes.push({ regle: regle.id, motif: motif.id, description: motif.description, extrait, bloquante: motif.bloquant, empreinte: e });
      }
    }
  }
  return alertes;
}

export type Verification =
  | { ok: true; reglesLevees: string[] }
  | { ok: false; motif: 'bloquante' | 'non-levee' | 'regles-non-relues'; alertes: Alerte[] };

/**
 * Verdict de publication. Ordre des refus : une alerte bloquante d'abord (rien
 * ne la lève), puis une levable non levée, puis la case des règles — pour que
 * le message dise d'abord ce qui ne se résout qu'en réécrivant.
 */
export function verifierPublication(entree: {
  titre: string;
  corps: string;
  levees: readonly string[];
  reglesRelues: boolean;
}): Verification {
  const alertes = controler(entree.titre, entree.corps);
  if (alertes.some((a) => a.bloquante)) return { ok: false, motif: 'bloquante', alertes };
  const levees = new Set(entree.levees);
  if (alertes.some((a) => !levees.has(a.empreinte))) return { ok: false, motif: 'non-levee', alertes };
  if (entree.reglesRelues !== true) return { ok: false, motif: 'regles-non-relues', alertes };
  return { ok: true, reglesLevees: [...new Set(alertes.map((a) => a.regle))].sort() };
}
