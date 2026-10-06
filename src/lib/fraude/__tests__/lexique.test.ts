import { describe, it, expect } from 'vitest';
import { detecterLexique } from '../lexique';

describe('detecterLexique (spec 010, FR-004)', () => {
  it.each([
    ['paiement par coupon PCS', ['coupon', 'pcs']],
    ['envoie-moi un P.C.S', ['pcs']],
    ['Trans Cash ou Neo-Surf', ['transcash', 'neosurf']],
    ['Rencontres rémunérées uniquement', ['rencontre remuneree']],
    ['rencontre tarifée, discrétion', ['rencontre tarifee']],
    ['Sugar daddy bienvenu', ['sugar']],
    ['je cherche une sugar baby', ['sugar']],
    ['Mes tarifs en privé', ['tarif']],
    ['carte prépayée paysafecard', ['carte prepayee', 'paysafecard']],
    ['escort indépendante', ['escort']],
  ])('repère « %s »', (texte, termes) => {
    expect(detecterLexique(texte).map((r) => r.terme).sort()).toEqual([...termes].sort());
  });

  it.each([
    'J’aime les voyages et le café',
    'je recharge mes batteries à la mer',
    'une grille tarifaire claire',
    'la rencontre de deux mondes',
    'du sucre dans mon café',
    'escortée par mon chien',
    'speedy, upcs, topcs',
  ])('ne repère rien dans « %s »', (texte) => {
    expect(detecterLexique(texte)).toEqual([]);
  });

  it('un même terme répété ne compte qu’une fois', () => {
    expect(detecterLexique('coupon coupon COUPONS')).toHaveLength(1);
  });

  it('rend un extrait court, jamais la bio entière', () => {
    const r = detecterLexique(`${'a'.repeat(500)} neosurf ${'b'.repeat(500)}`);
    expect(r[0].extrait.length).toBeLessThanOrEqual(200);
    expect(r[0].extrait).toContain('neosurf');
  });
});
