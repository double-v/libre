/**
 * Garde de non-régression — ce que l'interface a le droit de promettre (#337).
 *
 * Depuis l'escrow (#198), le service détient de quoi déchiffrer les messages.
 * Toute formulation qui affirme le contraire — « de bout en bout », « nous ne
 * pouvons pas les lire », « seuls l'expéditeur et le destinataire » — décrit une
 * garantie qui n'existe plus.
 *
 * La charte est explicite là-dessus (principe III, corollaire acquis en #328) :
 * une promesse affichée doit être adossée à du code. Une phrase qui décrit une
 * garantie inexistante est un **défaut de sécurité**, pas une maladresse de
 * copie. Ce test échoue donc à la CI, avant qu'une telle phrase n'atteigne
 * quiconque.
 *
 * Si l'application redevient un jour réellement zéro-knowledge, c'est ce test
 * qu'on supprime — en connaissance de cause, pas par inadvertance.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');

/** Formulations interdites, en minuscules, apostrophes normalisées. */
const PROMESSES_INTERDITES = [
  'bout en bout',
  'end-to-end',
  'ne peut pas les lire',
  'ne peut pas lire vos messages',
  'on ne les lit pas. on ne peut pas',
  "seuls l'expediteur et le destinataire",
  'personne d\'autre ne peut les lire',
];

function fichiersSources(dir: string): string[] {
  const out: string[] = [];
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    const complet = path.join(dir, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === '__tests__' || entree.name === 'generated') continue;
      out.push(...fichiersSources(complet));
    } else if (/\.tsx?$/.test(entree.name)) {
      out.push(complet);
    }
  }
  return out;
}

/**
 * Retire commentaires de bloc et de ligne — même patron que
 * `lobby-confinement.test.ts` (#282). On ne juge que ce qui atteint l'écran :
 * « end-to-end » dans un commentaire décrivant un flux de code n'a rien à voir
 * avec une promesse de confidentialité.
 */
function sansCommentaires(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Normalise pour attraper `&apos;`, les apostrophes typographiques et la casse. */
function normalise(src: string): string {
  return src
    .replace(/&apos;|&#39;|’/g, "'")
    .replace(/[éè]/g, 'e')
    .toLowerCase();
}

describe('promesses de chiffrement (#337)', () => {
  it("aucun écran ne promet une confidentialité que le code ne tient pas", () => {
    const fautifs: string[] = [];

    for (const fichier of fichiersSources(SRC)) {
      const contenu = normalise(sansCommentaires(readFileSync(fichier, 'utf8')));
      for (const promesse of PROMESSES_INTERDITES) {
        if (contenu.includes(normalise(promesse))) {
          fautifs.push(`${path.relative(SRC, fichier)} → « ${promesse} »`);
        }
      }
    }

    expect(fautifs).toEqual([]);
  });
});
