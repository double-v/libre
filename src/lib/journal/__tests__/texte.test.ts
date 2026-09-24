/**
 * Texte restreint du journal (spec 007, R2).
 *
 * Le corps d'une publication est saisi par un admin et servi sur une page
 * publique : il ne doit jamais pouvoir injecter de balisage. L'analyseur ne
 * produit qu'un arbre typé — le rendu React échappe tout le reste.
 */
import { describe, it, expect } from 'vitest';
import { analyser, extrait } from '../texte';

describe('analyser — blocs', () => {
  it('une ligne vide sépare les paragraphes ; les lignes d’un paragraphe se joignent', () => {
    expect(analyser('Bonjour\nà toutes et tous.\n\nDeuxième.')).toEqual([
      { type: 'paragraphe', enfants: [{ type: 'texte', valeur: 'Bonjour à toutes et tous.' }] },
      { type: 'paragraphe', enfants: [{ type: 'texte', valeur: 'Deuxième.' }] },
    ]);
  });

  it('listes à puces et numérotées ; une liste « imbriquée » est aplatie', () => {
    const blocs = analyser('- un\n- deux\n  - trois\n\n1. premier\n2. second');
    expect(blocs).toEqual([
      { type: 'liste', ordonnee: false, items: [[{ type: 'texte', valeur: 'un' }], [{ type: 'texte', valeur: 'deux' }], [{ type: 'texte', valeur: 'trois' }]] },
      { type: 'liste', ordonnee: true, items: [[{ type: 'texte', valeur: 'premier' }], [{ type: 'texte', valeur: 'second' }]] },
    ]);
  });

  it('texte vide ou blanc → aucun bloc ; fins de ligne Windows acceptées', () => {
    expect(analyser('   \n\n ')).toEqual([]);
    expect(analyser('a\r\n\r\nb')).toHaveLength(2);
  });
});

describe('analyser — en ligne', () => {
  const enLigne = (t: string) => (analyser(t)[0] as { enfants: unknown[] }).enfants;

  it('gras, italique et lien', () => {
    expect(enLigne('Du **gras**, de l’*italique* et [le manifeste](/manifesto).')).toEqual([
      { type: 'texte', valeur: 'Du ' },
      { type: 'gras', enfants: [{ type: 'texte', valeur: 'gras' }] },
      { type: 'texte', valeur: ', de l’' },
      { type: 'italique', enfants: [{ type: 'texte', valeur: 'italique' }] },
      { type: 'texte', valeur: ' et ' },
      { type: 'lien', url: '/manifesto', externe: false, enfants: [{ type: 'texte', valeur: 'le manifeste' }] },
      { type: 'texte', valeur: '.' },
    ]);
  });

  it('lien https externe marqué comme tel', () => {
    expect(enLigne('[aide](https://www.service-public.fr/x)')).toEqual([
      { type: 'lien', url: 'https://www.service-public.fr/x', externe: true, enfants: [{ type: 'texte', valeur: 'aide' }] },
    ]);
  });

  it.each([
    '[clic](javascript:alert(1))',
    '[x](data:text/html,<b>)',
    '[x](http://non-chiffre.example)',
    '[x](//protocole-relatif.example)',
  ])('schéma refusé → rendu en texte tel quel : %s', (t) => {
    const enfants = enLigne(t);
    expect(enfants.every((e) => (e as { type: string }).type === 'texte')).toBe(true);
    expect(enfants.map((e) => (e as { valeur: string }).valeur).join('')).toBe(t);
  });

  it('le balisage HTML reste du texte', () => {
    expect(enLigne('<script>alert(1)</script> <b>x</b>')).toEqual([
      { type: 'texte', valeur: '<script>alert(1)</script> <b>x</b>' },
    ]);
  });

  it('marqueurs non fermés : restent du texte', () => {
    expect(enLigne('2 * 3 = 6 et **pas fermé')).toEqual([{ type: 'texte', valeur: '2 * 3 = 6 et **pas fermé' }]);
  });

  it('un mot de 300 caractères passe intact (le rendu, lui, casse la ligne)', () => {
    const mot = 'a'.repeat(300);
    expect(enLigne(mot)).toEqual([{ type: 'texte', valeur: mot }]);
  });
});

describe('extrait', () => {
  it('texte brut du premier bloc, sans marqueurs', () => {
    expect(extrait('Du **gras** et [un lien](/x).\n\nSuite.')).toBe('Du gras et un lien.');
  });

  it('coupe au mot et ajoute une ellipse au-delà du maximum', () => {
    const e = extrait('mot '.repeat(100), 30);
    expect(e.length).toBeLessThanOrEqual(31);
    expect(e.endsWith('…')).toBe(true);
    expect(e).not.toMatch(/\s…$/);
  });

  it('une liste en tête donne ses éléments séparés', () => {
    expect(extrait('- un\n- deux')).toBe('un · deux');
  });
});
