/**
 * Repérer un contact externe dans un texte (spec 006, research R3) : pseudo,
 * bio, ou texte lu sur une photo. Le cas réel du 2026-09-24 portait un
 * identifiant Telegram écrit sur la photo, pour sortir la conversation de
 * l'app avant tout match — là où l'arnaque commence.
 *
 * Deux forces : **fort** (un moyen de contact utilisable) refuse l'écriture
 * et compte pour la file ; **faible** (une messagerie nommée, un e-mail) lève
 * seulement un signal. Les faux positifs coûtent cher à l'écriture — un vrai
 * membre bloqué sur sa bio —, d'où des motifs forts étroits.
 */
export type TypeContact = 'identifiant' | 'lien' | 'messagerie' | 'telephone' | 'email' | 'messagerie_nommee';

export interface ContactRepere {
  type: TypeContact;
  extrait: string;
  force: 'faible' | 'fort';
}

/** « signal » est un mot courant ; « tg » trop court pour être sûr. */
const MESSAGERIES = 'snapchat|snap|telegram|whatsapp|instagram|insta|onlyfans|kik|mym';

function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const LIEN = '(?:t\\.me|wa\\.me|snapchat\\.com\\/add|[o0]nlyfans\\.com|instagram\\.com)\\/';

const MOTIFS: Array<{ type: TypeContact; force: 'fort' | 'faible'; re: RegExp; compact?: boolean }> = [
  // Liens, sur le texte dont les espaces autour de « . » et « / » sont
  // retirés : « t.me/lola75 pour la suite » garde un extrait exact.
  { type: 'lien', force: 'fort', re: new RegExp(`${LIEN}[a-z0-9_.]*[a-z0-9_]`, 'g') },
  // Lien maquillé lettre par lettre (« t . m e / x y z ») : texte sans aucun
  // espace, seulement si rien n'a été trouvé — l'extrait y déborderait.
  { type: 'lien', force: 'fort', compact: true, re: new RegExp(`${LIEN}[a-z0-9_.]{1,30}`, 'g') },
  // Téléphone français : 0 ou +33, puis 9 chiffres, séparateurs libres.
  { type: 'telephone', force: 'fort', re: /(?:\+33|0033|\b0)\s*[1-9](?:[\s.-]*\d){8}\b/g },
  // International : + suivi de 8 à 15 chiffres.
  { type: 'telephone', force: 'fort', re: /\+\d(?:[\s.-]*\d){7,14}\b/g },
  // Nom de messagerie suivi d'un identifiant crédible : après « : » ou « @ »,
  // ou contenant un chiffre, un point ou un souligné (« telegram lola75 »).
  // Sans cette exigence, « telegram mais pas trop » bloquerait une bio.
  {
    type: 'messagerie',
    force: 'fort',
    re: new RegExp(`\\b(?:${MESSAGERIES})\\b\\s*(?:[:=-]\\s*@?[a-z0-9_.]{3,}|@[a-z0-9_.]{3,}|[a-z_.]*[0-9_.][a-z0-9_.]*)`, 'g'),
  },
  // @identifiant isolé (pas un e-mail : rien d'alphanumérique juste avant).
  { type: 'identifiant', force: 'fort', re: /(?<![a-z0-9_.])@[a-z0-9_.]{3,}/g },
  { type: 'email', force: 'faible', re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g },
  { type: 'messagerie_nommee', force: 'faible', re: new RegExp(`\\b(?:${MESSAGERIES})\\b`, 'g') },
];

export function detecterContact(texte: string): ContactRepere[] {
  const normal = normaliser(texte).replace(/\s*([./])\s*/g, '$1');
  const compact = normal.replace(/\s+/g, '');
  const reperes: ContactRepere[] = [];
  // Zones déjà couvertes par un motif, pour ne pas compter deux fois
  // « telegram : @lola » (messagerie + identifiant) ni l'e-mail comme @.
  const couvert: Array<[number, number]> = [];
  const chevauche = (a: number, b: number) => couvert.some(([x, y]) => a < y && b > x);

  for (const m of MOTIFS) {
    if (m.compact && reperes.some((c) => c.type === 'lien')) continue;
    const source = m.compact ? compact : normal;
    for (const r of source.matchAll(m.re)) {
      const debut = r.index ?? 0;
      const fin = debut + r[0].length;
      if (!m.compact) {
        if (chevauche(debut, fin)) continue;
        couvert.push([debut, fin]);
      }
      const extrait = r[0].trim();
      if (reperes.some((c) => c.extrait === extrait)) continue;
      // Un contact faible n'ajoute rien quand un fort est déjà là.
      if (m.force === 'faible' && reperes.some((c) => c.force === 'fort')) continue;
      reperes.push({ type: m.type, extrait, force: m.force });
    }
  }
  return reperes;
}

/** Le premier contact fort, s'il y en a un : c'est lui qui refuse l'écriture. */
export function contactFort(texte: string): ContactRepere | null {
  return detecterContact(texte).find((c) => c.force === 'fort') ?? null;
}
