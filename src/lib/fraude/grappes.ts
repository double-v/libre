import { LIBELLES_SIGNAL, MENTION_LEGITIME } from './libelles';
import { RANG_NIVEAU, type NiveauFiabilite } from './fiabilite';

/**
 * Grappes d'indices (spec 011, US2). Des comptes reliés par un indice de lien
 * — même appareil, même connexion à l'inscription, même photo, même bio —
 * se lisent ensemble : le modérateur compare au lieu d'ouvrir deux fiches.
 *
 * Tout est **dérivé** des indices existants à la lecture, rien n'est stocké
 * (même choix que le niveau de fiabilité, spec 010) : une grappe ne peut pas
 * se désynchroniser de ses indices. Fonctions pures, testées en tableau.
 */

export type SorteLien = 'appareil' | 'connexion' | 'photo' | 'texte';

/** Type de signal qui relie deux comptes → sorte de lien. */
export const SORTE_PAR_SIGNAL: Readonly<Record<string, SorteLien>> = {
  appareil_partage: 'appareil',
  photo_reutilisee: 'photo',
  texte_reutilise: 'texte',
};

export interface Lien {
  de: string;
  vers: string;
  sorte: SorteLien;
}

export interface CompteIndice {
  id: string;
  displayName: string;
  createdAt: Date;
  emailConfirme: boolean;
  niveau: NiveauFiabilite;
  /** Types des signaux non tranchés, dans l'ordre du plus récent. */
  types: string[];
  dernierSignal: Date | null;
}

export interface Grappe<C extends CompteIndice = CompteIndice> {
  /** Plus petit identifiant : stable tant que la grappe l'est. */
  id: string;
  comptes: C[];
  liens: Lien[];
  raisons: string[];
  /** Phrase « peut être légitime » des liens de contexte. */
  mentions: string[];
  doublon: { orphelinId: string; gardeId: string } | null;
  niveau: NiveauFiabilite;
  plusRecent: Date | null;
}

/** Union-find : chaque composante connexe est une grappe. */
export function construireGrappes<C extends CompteIndice>(comptes: readonly C[], liens: readonly Lien[]): Grappe<C>[] {
  const parId = new Map(comptes.map((c) => [c.id, c]));
  const parent = new Map(comptes.map((c) => [c.id, c.id]));
  const racine = (id: string): string => {
    let r = id;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(id, r);
    return r;
  };
  // Un lien vers un compte absent (supprimé, banni, dossier clos) ne regroupe rien.
  const utiles = dedoublonner(liens.filter((l) => l.de !== l.vers && parId.has(l.de) && parId.has(l.vers)));
  for (const l of utiles) {
    const a = racine(l.de);
    const b = racine(l.vers);
    if (a !== b) parent.set(a < b ? b : a, a < b ? a : b);
  }

  const groupes = new Map<string, C[]>();
  for (const c of comptes) {
    const r = racine(c.id);
    groupes.set(r, [...(groupes.get(r) ?? []), c]);
  }

  return [...groupes.values()]
    .map((membres) => {
      const ids = new Set(membres.map((m) => m.id));
      const tries = [...membres].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const liensGrappe = utiles.filter((l) => ids.has(l.de));
      const grappe: Grappe<C> = {
        id: [...ids].sort()[0],
        comptes: tries,
        liens: liensGrappe,
        raisons: [],
        mentions: [],
        doublon: doublonProbable(tries, liensGrappe),
        niveau: tries.reduce<NiveauFiabilite>((n, c) => (RANG_NIVEAU[c.niveau] > RANG_NIVEAU[n] ? c.niveau : n), 'fiable'),
        plusRecent: tries.reduce<Date | null>((d, c) => (c.dernierSignal && (!d || c.dernierSignal > d) ? c.dernierSignal : d), null),
      };
      grappe.raisons = raisonsGrappe(grappe);
      grappe.mentions = mentionsGrappe(grappe);
      return grappe;
    })
    .sort((a, b) => RANG_NIVEAU[b.niveau] - RANG_NIVEAU[a.niveau] || (b.plusRecent?.getTime() ?? 0) - (a.plusRecent?.getTime() ?? 0));
}

/** Un lien symétrique (écrit des deux côtés) ne compte qu'une fois. */
function dedoublonner(liens: readonly Lien[]): Lien[] {
  const vus = new Set<string>();
  return liens.filter((l) => {
    const cle = [l.sorte, ...[l.de, l.vers].sort()].join('|');
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

/**
 * Doublon probable (R4) : deux comptes, un même appareil, un seul a confirmé
 * son adresse. Le cas typique est la faute de frappe dans l'e-mail : le
 * premier compte n'a jamais reçu son lien, la personne en a créé un second.
 */
export function doublonProbable(comptes: readonly CompteIndice[], liens: readonly Lien[]): Grappe['doublon'] {
  if (comptes.length !== 2) return null;
  if (!liens.some((l) => l.sorte === 'appareil')) return null;
  const [a, b] = comptes;
  if (a.emailConfirme === b.emailConfirme) return null;
  return a.emailConfirme ? { orphelinId: b.id, gardeId: a.id } : { orphelinId: a.id, gardeId: b.id };
}

/** « 6 minutes », « 2 heures », « 3 jours » — l'écart lisible entre deux inscriptions. */
export function ecartLisible(ms: number): string {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const heures = Math.round(minutes / 60);
  if (heures < 48) return `${heures} heure${heures > 1 ? 's' : ''}`;
  const jours = Math.round(heures / 24);
  return `${jours} jours`;
}

const nomsDe = (noms: string[]): string =>
  noms.length <= 1 ? (noms[0] ?? '') : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;

/** Les raisons du soupçon, en phrases complètes, des liens vers les indices isolés. */
export function raisonsGrappe(g: Pick<Grappe, 'comptes' | 'liens' | 'doublon'>): string[] {
  const nom = new Map(g.comptes.map((c) => [c.id, c.displayName]));
  const cree = new Map(g.comptes.map((c) => [c.id, c.createdAt]));
  const raisons: string[] = [];

  for (const l of g.liens.filter((x) => x.sorte !== 'connexion')) {
    const paire = nomsDe([nom.get(l.de)!, nom.get(l.vers)!]);
    if (l.sorte === 'appareil') {
      const ecart = ecartLisible(cree.get(l.de)!.getTime() - cree.get(l.vers)!.getTime());
      raisons.push(`${paire} ont été créés sur le même appareil, à ${ecart} d’écart.`);
    } else if (l.sorte === 'photo') {
      raisons.push(`La même photo apparaît sur les profils de ${paire}.`);
    } else {
      raisons.push(`${paire} ont la même bio.`);
    }
  }

  const parConnexion = new Set(g.liens.filter((l) => l.sorte === 'connexion').flatMap((l) => [l.de, l.vers]));
  if (parConnexion.size > 1) {
    const dates = [...parConnexion].map((id) => cree.get(id)!.getTime());
    const ecart = ecartLisible(Math.max(...dates) - Math.min(...dates));
    raisons.push(`${parConnexion.size} comptes se sont inscrits depuis la même connexion en ${ecart}.`);
  }

  if (g.doublon) {
    raisons.push(`${nom.get(g.doublon.orphelinId)} n’a jamais confirmé son adresse e-mail : c’est probablement une faute de frappe à l’inscription.`);
  }

  // Les indices qui ne relient rien : nommés compte par compte.
  const relies = new Set(Object.keys(SORTE_PAR_SIGNAL).concat('inscriptions_groupees'));
  for (const c of g.comptes) {
    const isoles = [...new Set(c.types.filter((t) => !relies.has(t)))];
    if (isoles.length > 0) {
      raisons.push(`${c.displayName} : ${isoles.map((t) => (LIBELLES_SIGNAL[t] ?? t).toLowerCase()).join(', ')}.`);
    }
  }
  return raisons;
}

function mentionsGrappe(g: Pick<Grappe, 'liens'>): string[] {
  const sortes = new Set(g.liens.map((l) => l.sorte));
  const mentions: string[] = [];
  if (sortes.has('appareil')) mentions.push(MENTION_LEGITIME.appareil_partage);
  if (sortes.has('connexion')) mentions.push(MENTION_LEGITIME.inscriptions_groupees);
  return mentions;
}
