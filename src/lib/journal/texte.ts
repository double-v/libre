/**
 * Texte restreint du journal « Où en est Libre » (spec 007, R2).
 *
 * Le corps d'une publication est saisi par un admin et servi sur une page
 * publique et indexée. Plutôt qu'un markdown complet suivi d'un nettoyage
 * (deux dépendances, et une surface qu'on ne maîtrise pas), on reconnaît cinq
 * constructions et on produit un **arbre typé** : le rendu React échappe tout
 * le reste, donc aucun balisage saisi ne peut s'exécuter. Rien ici ne produit
 * de HTML.
 *
 * Syntaxe : ligne vide = paragraphe ; `- ` ou `* ` = puce ; `1. ` = numéro ;
 * `**gras**`, `*italique*`, `[texte](url)`.
 */

export type EnLigne =
  | { type: 'texte'; valeur: string }
  | { type: 'gras'; enfants: EnLigne[] }
  | { type: 'italique'; enfants: EnLigne[] }
  | { type: 'lien'; url: string; externe: boolean; enfants: EnLigne[] };

export type Bloc =
  | { type: 'paragraphe'; enfants: EnLigne[] }
  | { type: 'liste'; ordonnee: boolean; items: EnLigne[][] };

const PUCE = /^\s*[-*]\s+(.*)$/;
const NUMERO = /^\s*\d+[.)]\s+(.*)$/;

/**
 * Seuls `https://` et un chemin interne (`/…`, pas `//…`) font un lien. Tout
 * autre schéma — `javascript:`, `data:`, `http:` — reste du texte : c'est la
 * seule porte par laquelle un corps pourrait devenir actif.
 */
function urlAcceptee(url: string): boolean {
  return /^https:\/\/[^\s]+$/.test(url) || /^\/(?!\/)[^\s]*$/.test(url);
}

const MOTIFS = [
  { type: 'lien', re: /\[([^\]\n]+)\]\(([^)\s]+)\)/ },
  { type: 'gras', re: /\*\*(\S(?:.*?\S)?)\*\*/ },
  { type: 'italique', re: /\*([^*\s](?:[^*]*?[^*\s])?)\*/ },
] as const;

function pousserTexte(sortie: EnLigne[], valeur: string) {
  if (!valeur) return;
  const dernier = sortie[sortie.length - 1];
  if (dernier?.type === 'texte') dernier.valeur += valeur;
  else sortie.push({ type: 'texte', valeur });
}

function analyserEnLigne(texte: string): EnLigne[] {
  const sortie: EnLigne[] = [];
  let reste = texte;
  while (reste) {
    // Le motif qui commence le plus tôt l'emporte ; à égalité, l'ordre de MOTIFS.
    let meilleur: { type: (typeof MOTIFS)[number]['type']; m: RegExpExecArray } | null = null;
    for (const { type, re } of MOTIFS) {
      const m = re.exec(reste);
      if (m && (!meilleur || m.index < meilleur.m.index)) meilleur = { type, m };
    }
    if (!meilleur) {
      pousserTexte(sortie, reste);
      break;
    }
    const { type, m } = meilleur;
    pousserTexte(sortie, reste.slice(0, m.index));
    if (type === 'lien') {
      const url = m[2];
      if (urlAcceptee(url)) {
        sortie.push({ type: 'lien', url, externe: url.startsWith('https://'), enfants: analyserEnLigne(m[1]) });
      } else {
        pousserTexte(sortie, m[0]);
      }
    } else {
      sortie.push({ type, enfants: analyserEnLigne(m[1]) });
    }
    reste = reste.slice(m.index + m[0].length);
  }
  return sortie;
}

export function analyser(corps: string): Bloc[] {
  const blocs: Bloc[] = [];
  let paragraphe: string[] | null = null;
  let liste: { ordonnee: boolean; items: string[] } | null = null;

  const fermer = () => {
    if (paragraphe) blocs.push({ type: 'paragraphe', enfants: analyserEnLigne(paragraphe.join(' ')) });
    if (liste) blocs.push({ type: 'liste', ordonnee: liste.ordonnee, items: liste.items.map(analyserEnLigne) });
    paragraphe = null;
    liste = null;
  };

  for (const brute of corps.replace(/\r\n?/g, '\n').split('\n')) {
    const ligne = brute.trim();
    if (!ligne) {
      fermer();
      continue;
    }
    const puce = PUCE.exec(brute);
    const numero = puce ? null : NUMERO.exec(brute);
    if (puce || numero) {
      const ordonnee = Boolean(numero);
      if (!liste || liste.ordonnee !== ordonnee) {
        fermer();
        liste = { ordonnee, items: [] };
      }
      liste.items.push((puce ?? numero)![1].trim());
      continue;
    }
    if (liste) fermer();
    (paragraphe ??= []).push(ligne);
  }
  fermer();
  return blocs;
}

function texteBrut(enfants: EnLigne[]): string {
  return enfants.map((e) => (e.type === 'texte' ? e.valeur : texteBrut(e.enfants))).join('');
}

/**
 * Extrait en texte brut du premier bloc, pour la liste publique et la
 * description de partage. Coupé au mot, jamais au milieu.
 */
export function extrait(corps: string, max = 200): string {
  const premier = analyser(corps)[0];
  if (!premier) return '';
  const brut = (premier.type === 'paragraphe'
    ? texteBrut(premier.enfants)
    : premier.items.map(texteBrut).join(' · ')
  ).replace(/\s+/g, ' ').trim();
  if (brut.length <= max) return brut;
  let coupe = brut.slice(0, max);
  const espace = coupe.lastIndexOf(' ');
  if (espace > 0) coupe = coupe.slice(0, espace);
  return coupe.replace(/[\s,;:.·–-]+$/, '') + '…';
}
