/**
 * Indice de fiabilité (spec 010, research R8). Un niveau se **dérive** des
 * signaux non tranchés ; il n'est jamais stocké, donc jamais désynchronisé
 * d'une décision de modérateur. Lu par l'admin seulement (garde
 * `signaux-never-leak`).
 */
export type NiveauFiabilite = 'fiable' | 'a_surveiller' | 'douteux';

/**
 * Indices de contexte : chacun a une explication banale (appareil partagé dans
 * un couple, voyage, personne efficace). Ils ne pèsent qu'à trois de types
 * différents (FR-011, FR-014).
 */
export const TYPES_CONTEXTE: ReadonlySet<string> = new Set([
  'appareil_partage',
  'inscriptions_groupees',
  'fuseau_incoherent',
  'profil_express',
]);

export interface SignalDate {
  type: string;
  force: string;
  createdAt: Date;
}

/** Signaux postérieurs à la dernière décision du modérateur. */
export function signauxRecents<T extends SignalDate>(signaux: ReadonlyArray<T>, decidedAt: Date | null): T[] {
  return signaux.filter((s) => !decidedAt || s.createdAt > decidedAt);
}

/** Un fort, ou trois faibles de types différents (FR-014). */
export function douteSerieux(recents: ReadonlyArray<Pick<SignalDate, 'type' | 'force'>>): boolean {
  if (recents.some((s) => s.force === 'fort')) return true;
  const typesFaibles = new Set(recents.filter((s) => s.force !== 'fort').map((s) => s.type));
  return typesFaibles.size >= 3;
}

const ORDRE: NiveauFiabilite[] = ['fiable', 'a_surveiller', 'douteux'];

/**
 * Le badge vérifié fait baisser d'un cran (FR-013) : il prouve un visage, pas
 * une intention — un compte vérifié qui accumule des forts reste visible.
 */
export function niveauFiabilite(recents: ReadonlyArray<Pick<SignalDate, 'type' | 'force'>>, isVerified: boolean): NiveauFiabilite {
  const brut = douteSerieux(recents) ? 2 : recents.length > 0 ? 1 : 0;
  return ORDRE[Math.max(0, brut - (isVerified ? 1 : 0))];
}

export interface FiabiliteCompte {
  niveau: NiveauFiabilite;
  /** Signaux non tranchés : départage les comptes d'un même niveau. */
  signauxRecents: number;
}

export const RANG_NIVEAU: Record<NiveauFiabilite, number> = { douteux: 2, a_surveiller: 1, fiable: 0 };

/**
 * Niveau de chaque compte qui porte au moins un signal ; les autres sont
 * « fiables » par défaut. Calculé en mémoire : à l'échelle de Libre (quelques
 * centaines de comptes), une colonne dérivée coûterait plus qu'elle ne gagne
 * et finirait désynchronisée d'une décision.
 */
export function fiabiliteParCompte(
  signaux: ReadonlyArray<SignalDate & { userId: string }>,
  decisions: ReadonlyMap<string, Date>,
  verifies: ReadonlySet<string>,
): Map<string, FiabiliteCompte> {
  const parCompte = new Map<string, SignalDate[]>();
  for (const s of signaux) {
    const liste = parCompte.get(s.userId) ?? [];
    liste.push(s);
    parCompte.set(s.userId, liste);
  }
  const resultat = new Map<string, FiabiliteCompte>();
  for (const [userId, liste] of parCompte) {
    const recents = signauxRecents(liste, decisions.get(userId) ?? null);
    resultat.set(userId, { niveau: niveauFiabilite(recents, verifies.has(userId)), signauxRecents: recents.length });
  }
  return resultat;
}
