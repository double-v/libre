/**
 * Règles pures du code manuscrit (spec 012, US1/US2) : tirage, forme, et
 * droit au nouvel essai. Ce qui touche la base (révocation, consommation
 * concurrente) est testé sur un vrai PostgreSQL :
 * tests/integration/verification-code.test.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  ATTENTE_APRES_REFUS_MS, CHIFFRES_CODE, droitTirage, estFormeCode, genererCode,
} from '../code';

describe('genererCode', () => {
  it('quatre chiffres, tous dans 2–9, avec le vrai hasard', () => {
    const vus = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const c = genererCode();
      expect(c).toMatch(/^[2-9]{4}$/);
      for (const ch of c) vus.add(ch);
    }
    // Chaque chiffre autorisé sort, et seulement eux : ni 0 ni 1.
    expect([...vus].sort().join('')).toBe(CHIFFRES_CODE);
  });

  it('chaque position suit le tirage reçu (pas de position figée)', () => {
    const suite = [0, 7, 3, 5];
    let i = 0;
    expect(genererCode(() => suite[i++])).toBe('2957');
  });
});

describe('estFormeCode', () => {
  it.each(['2345', '9999', '7358'])('%s accepté', (c) => expect(estFormeCode(c)).toBe(true));
  it.each(['1234', '0234', '234', '23456', ' 2345', '2345\n', '23a5', '', null, 2345, ['2345'], { code: '2345' }])(
    '%o refusé',
    (c) => expect(estFormeCode(c)).toBe(false),
  );
});

describe('droitTirage — nouvel essai après refus (FR-012)', () => {
  const T = new Date('2026-11-12T12:00:00Z');
  const il_y_a = (ms: number) => new Date(T.getTime() - ms);
  const refus = (ms: number) => ({ status: 'rejected', resolvedAt: il_y_a(ms) });
  const H = 3600 * 1000;

  it('aucune demande : tirage ouvert, première tentative', () => {
    expect(droitTirage([], T)).toEqual({ ok: true, tentative: 1 });
  });

  it.each([1, 2])('%i refus : tirage immédiat', (n) => {
    const d = Array.from({ length: n }, (_, i) => refus((i + 1) * H));
    expect(droitTirage(d, T)).toEqual({ ok: true, tentative: n + 1 });
  });

  it('trois refus : attente de 24 h depuis le plus récent', () => {
    const r = droitTirage([refus(1 * H), refus(5 * H), refus(30 * H)], T);
    expect(r).toEqual({ ok: false, tentative: 4, reessaiAt: new Date(il_y_a(H).getTime() + ATTENTE_APRES_REFUS_MS) });
  });

  it('24 h pile après le troisième refus : tirage ouvert', () => {
    expect(droitTirage([refus(24 * H), refus(25 * H), refus(26 * H)], T).ok).toBe(true);
  });

  it('24 h moins une milliseconde : encore fermé', () => {
    expect(droitTirage([refus(24 * H - 1), refus(25 * H), refus(26 * H)], T).ok).toBe(false);
  });

  it('une validation intercalée remet le compteur à zéro', () => {
    const d = [refus(1 * H), refus(2 * H), { status: 'approved', resolvedAt: il_y_a(3 * H) }, refus(4 * H)];
    expect(droitTirage(d, T)).toEqual({ ok: true, tentative: 3 });
  });

  it('quatrième refus après l’attente : nouvelle attente, depuis ce refus-là', () => {
    const d = [refus(2 * H), refus(30 * H), refus(31 * H), refus(32 * H)];
    const r = droitTirage(d, T);
    expect(r.ok).toBe(false);
    expect(r.tentative).toBe(5);
  });

  it('un refus sans date de décision ne rouvre pas le tirage', () => {
    const d = [{ status: 'rejected', resolvedAt: null }, refus(2 * H), refus(3 * H)];
    expect(droitTirage(d, T).ok).toBe(false);
  });
});
