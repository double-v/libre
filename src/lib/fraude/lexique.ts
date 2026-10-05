import { enregistrerSignal } from './signaux';

/**
 * Lexique de l'arnaque (spec 010, research R4). Le cas du 2026-09-24 se payait
 * en coupons prépayés achetés au bureau de tabac ; ce vocabulaire n'a presque
 * aucun usage honnête dans une bio de rencontre. Liste fixe, modifiée par PR,
 * comme `contact.ts`.
 *
 * Contrairement au contact externe, **aucun refus** à l'écriture : « coupon »
 * ou « tarif » peuvent être innocents hors contexte. Le terme lève un signal,
 * un humain (ou le selfie) tranche.
 */
export interface TermeRepere {
  /** Forme canonique, sert de clé de déduplication. */
  terme: string;
  extrait: string;
}

/**
 * Chaque terme s'écrit sans accent, mots séparés par une espace. Le motif
 * tolère les séparateurs intercalés (« p.c.s », « neo-surf », « trans cash ») et
 * le pluriel, mais exige des mots entiers : « escortée » n'est pas « escort ».
 */
const TERMES: ReadonlyArray<{ terme: string; formes: string[]; pluriel?: boolean }> = [
  { terme: 'pcs', formes: ['pcs'] },
  { terme: 'transcash', formes: ['transcash'] },
  { terme: 'neosurf', formes: ['neosurf'] },
  { terme: 'paysafecard', formes: ['paysafecard'] },
  { terme: 'coupon', formes: ['coupon'], pluriel: true },
  { terme: 'carte prepayee', formes: ['carte prepayee'], pluriel: true },
  { terme: 'rencontre remuneree', formes: ['rencontre remuneree'], pluriel: true },
  { terme: 'rencontre tarifee', formes: ['rencontre tarifee'], pluriel: true },
  { terme: 'tarif', formes: ['tarif'], pluriel: true },
  { terme: 'sugar', formes: ['sugar daddy', 'sugar baby', 'sugar mommy', 'sugar mummy'] },
  { terme: 'escort', formes: ['escort', 'escorte girl', 'escort girl'] },
];

const SEP = '[\\s.\\-_*·]{0,2}';

function motif(forme: string, pluriel: boolean): string {
  // Lettres d'un même mot : séparateurs tolérés ; entre deux mots, au moins
  // une espace ou un séparateur. Pluriel accordé à chaque mot (« rencontres
  // rémunérées »).
  const mots = forme.split(' ').map((m) => [...m].join(SEP) + (pluriel ? '[sx]?' : ''));
  return mots.join('[\\s.\\-_]+');
}

const MOTIFS = TERMES.map((t) => ({
  terme: t.terme,
  re: new RegExp(`(?<![a-z0-9])(?:${t.formes.map((f) => motif(f, !!t.pluriel)).join('|')})(?![a-z0-9])`, 'g'),
}));

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const EXTRAIT_MAX = 200;

function extraitAutour(texte: string, debut: number, fin: number): string {
  const marge = Math.max(0, Math.floor((EXTRAIT_MAX - (fin - debut)) / 2));
  return texte.slice(Math.max(0, debut - marge), fin + marge).slice(0, EXTRAIT_MAX).trim();
}

/** Un résultat par terme canonique, dans l'ordre de la liste. */
export function detecterLexique(texte: string): TermeRepere[] {
  if (!texte) return [];
  const norme = normaliser(texte);
  const reperes: TermeRepere[] = [];
  for (const { terme, re } of MOTIFS) {
    re.lastIndex = 0;
    const m = re.exec(norme);
    if (m) reperes.push({ terme, extrait: extraitAutour(norme, m.index, m.index + m[0].length) });
  }
  return reperes;
}

/**
 * Vocabulaire d'arnaque (spec 010, FR-004) : un signal fort par terme, jamais
 * de refus — « coupon » ou « tarif » peuvent être innocents ; un humain ou le
 * selfie tranche. Best-effort.
 */
export async function signalerLexique(userId: string, texte: string, options: { inviter?: boolean } = {}): Promise<void> {
  try {
    for (const { terme, extrait } of detecterLexique(texte)) {
      await enregistrerSignal({ userId, type: 'lexique_arnaque', force: 'fort', cle: terme, extrait }, options);
    }
  } catch (err) {
    console.warn('fraude.lexique.failed', { message: (err as Error)?.message?.slice(0, 80) });
  }
}
