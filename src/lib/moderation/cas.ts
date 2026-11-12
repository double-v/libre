/**
 * Cas de modération du hub Membres (spec 012, US3, data-model.md).
 *
 * Un cas est une vue dérivée des éléments en attente d'un membre, jamais
 * stockée en double : la liste les calcule en SQL, mais la gravité, l'ordre
 * d'urgence et les filtres acceptés se décident ici, une seule fois. La
 * requête de `GET /api/admin/membres` lit ces constantes au lieu de les
 * réécrire ; ce module est pur pour être importé côté client.
 */

export const TYPES_CAS = ['report', 'verif', 'photo', 'reponse', 'relecture', 'indice'] as const;
export type TypeCas = (typeof TYPES_CAS)[number];
export type Gravite = 'bad' | 'warn' | 'info';

/** Signalement grave ; selfie, photo, réponse et relecture à juger ; indice pour information. */
export const GRAVITE: Record<TypeCas, Gravite> = {
  report: 'bad',
  verif: 'warn',
  photo: 'warn',
  reponse: 'warn',
  relecture: 'warn',
  indice: 'info',
};

export const RANG_GRAVITE: Record<Gravite, number> = { bad: 0, warn: 1, info: 2 };
/** Rang d'un membre sans cas : après tous les autres. */
export const RANG_SANS_CAS = 9;

export interface Cas {
  type: TypeCas;
  id: string;
  depuis: Date;
}

/**
 * Urgence d'un membre (FR-015) : le rang de son cas le plus grave, et la date
 * du plus ancien cas **de ce rang** (un vieil indice ne fait pas remonter un
 * signalement récent parmi les signalements).
 */
export function urgence(cas: ReadonlyArray<Cas>): { rang: number; depuis: Date | null } {
  let rang = RANG_SANS_CAS;
  let depuis: Date | null = null;
  for (const c of cas) {
    const r = RANG_GRAVITE[GRAVITE[c.type]];
    if (r < rang) {
      rang = r;
      depuis = c.depuis;
    } else if (r === rang && depuis && c.depuis < depuis) {
      depuis = c.depuis;
    }
  }
  return { rang, depuis };
}

/**
 * Ordre d'urgence : rang, puis le plus ancien d'abord, puis l'identifiant
 * (pagination stable). Un membre sans cas se date de son inscription.
 */
export function comparerUrgence(
  a: { id: string; createdAt: Date; cas: ReadonlyArray<Cas> },
  b: { id: string; createdAt: Date; cas: ReadonlyArray<Cas> },
): number {
  const ua = urgence(a.cas);
  const ub = urgence(b.cas);
  if (ua.rang !== ub.rang) return ua.rang - ub.rang;
  const ta = (ua.depuis ?? a.createdAt).getTime();
  const tb = (ub.depuis ?? b.createdAt).getTime();
  if (ta !== tb) return ta - tb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export const FILTRES = [
  { cle: 'atraiter', libelle: 'À traiter' },
  { cle: 'verif', libelle: 'Selfies' },
  { cle: 'report', libelle: 'Signalés' },
  { cle: 'photo', libelle: 'Photos' },
  { cle: 'reponse', libelle: 'Réponses' },
  { cle: 'indice', libelle: 'Indices' },
  { cle: 'douteux', libelle: 'Douteux' },
  { cle: 'verifies', libelle: 'Vérifiés' },
  { cle: 'masques', libelle: 'Masqués' },
  { cle: 'bannis', libelle: 'Bannis' },
  { cle: 'nonconf', libelle: 'Non confirmés' },
  { cle: 'tous', libelle: 'Tous' },
] as const;
export type Filtre = (typeof FILTRES)[number]['cle'];

/** Les filtres de travail portent un nombre de cas ; les autres, aucun (FR-014). */
export const FILTRES_TRAVAIL: ReadonlySet<Filtre> = new Set(['atraiter', 'verif', 'report', 'photo', 'reponse', 'indice']);
export type Compteurs = Record<'atraiter' | 'verif' | 'report' | 'photo' | 'reponse' | 'indice', number>;

export const TRIS = [
  { cle: 'urgence', libelle: 'Trier par urgence' },
  { cle: 'recent', libelle: 'Inscription récente' },
  { cle: 'fiabilite', libelle: 'Fiabilité' },
] as const;
export type Tri = (typeof TRIS)[number]['cle'];

// `some` sur une liste plutôt que `in` sur un objet : `__proto__` ou
// `toString` ne doivent jamais passer pour un filtre.
export const estFiltre = (v: string): v is Filtre => FILTRES.some((f) => f.cle === v);
export const estTri = (v: string): v is Tri => TRIS.some((t) => t.cle === v);

/**
 * Curseur de pagination (FR-017, FR-S14) : la clé de tri de la dernière
 * ligne rendue, en JSON base64url. Opaque pour le client, mais **jamais de
 * confiance** : chaque champ est revalidé, un champ en trop ou d'un autre tri
 * rend `null` (400 côté route), et les valeurs ne vont en SQL que comme
 * paramètres.
 */
export type Curseur =
  | { tri: 'urgence'; rang: number; temps: string; id: string }
  | { tri: 'recent'; temps: string; id: string }
  | { tri: 'fiabilite'; rang: number; n: number; temps: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CHAMPS: Record<Tri, string[]> = {
  urgence: ['id', 'rang', 'temps', 'tri'],
  recent: ['id', 'temps', 'tri'],
  fiabilite: ['id', 'n', 'rang', 'temps', 'tri'],
};

export function encoderCurseur(c: Curseur): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

const entier = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

export function decoderCurseur(brut: string, tri: Tri): Curseur | null {
  if (!brut || brut.length > 300 || !/^[A-Za-z0-9_-]+$/.test(brut)) return null;
  let v: unknown;
  try {
    v = JSON.parse(Buffer.from(brut, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (o.tri !== tri) return null;
  if (Object.keys(o).sort().join(',') !== CHAMPS[tri].join(',')) return null;
  if (typeof o.id !== 'string' || !UUID.test(o.id)) return null;
  if (typeof o.temps !== 'string' || !ISO.test(o.temps) || Number.isNaN(Date.parse(o.temps))) return null;
  if (tri === 'urgence' && !entier(o.rang, RANG_SANS_CAS)) return null;
  if (tri === 'fiabilite' && (!entier(o.rang, 2) || !entier(o.n, 100_000))) return null;
  return o as unknown as Curseur;
}

/** Échappe `\`, `%` et `_` pour un `ILIKE … ESCAPE '\'` : la recherche reste littérale. */
export function echapperRecherche(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}
