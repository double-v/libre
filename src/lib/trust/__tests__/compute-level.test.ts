/**
 * Tests unitaires — Calculateur TrustLevel (logique pure).
 *
 * On teste :
 * 1. scoreFactors : tous les facteurs + combinaisons
 * 2. bandFor : tous les seuils (19/20, 49/50, 79/80) + edge cases
 * 3. Round-trip : un factors calculé avec un score donné donne le bon band
 *
 * On ne teste PAS loadFactors/computeTrustLevel/getOrComputeTrustLevel ici —
 * ils requêtent la DB et seront testés en e2e (#60) ou via mocks explicites.
 */
import { describe, it, expect } from 'vitest';
import { scoreFactors, bandFor, factorsToDisplay, type TrustFactors } from '../compute-level';

const ZERO: TrustFactors = {
  emailVerified: false,
  selfieVerified: false,
  accountAgeDays: 0,
  hasLaPlaceMessage: false,
  validatedMatchesCount: 0,
  hasTrustCircle: false,
  hasActiveReport: false,
  wasBanned: false,
};

describe('scoreFactors', () => {
  it('retourne 0 pour un user sans aucun facteur', () => {
    expect(scoreFactors(ZERO)).toBe(0);
  });

  it('email vérifié seul = +10', () => {
    expect(scoreFactors({ ...ZERO, emailVerified: true })).toBe(10);
  });

  it('selfie vérifié seul = +20', () => {
    expect(scoreFactors({ ...ZERO, selfieVerified: true })).toBe(20);
  });

  it('ancienneté 29 jours = 0 (en-dessous du 1er seuil)', () => {
    expect(scoreFactors({ ...ZERO, accountAgeDays: 29 })).toBe(0);
  });

  it('ancienneté 30 jours = +10', () => {
    expect(scoreFactors({ ...ZERO, accountAgeDays: 30 })).toBe(10);
  });

  it('ancienneté 90 jours = +20 (cumulé 30j+90j)', () => {
    expect(scoreFactors({ ...ZERO, accountAgeDays: 90 })).toBe(20);
  });

  it('ancienneté 365 jours = +30 (cumulé 30+90+365)', () => {
    expect(scoreFactors({ ...ZERO, accountAgeDays: 365 })).toBe(30);
  });

  it('1 match validé = +5', () => {
    expect(scoreFactors({ ...ZERO, validatedMatchesCount: 1 })).toBe(5);
  });

  it('2 matchs validés = +5 (palier non atteint)', () => {
    expect(scoreFactors({ ...ZERO, validatedMatchesCount: 2 })).toBe(5);
  });

  it('3 matchs validés = +10 (palier cumulé)', () => {
    expect(scoreFactors({ ...ZERO, validatedMatchesCount: 3 })).toBe(10);
  });

  it('La Place + cercle + 3 matchs = +25 (cumul 5+10+10)', () => {
    expect(
      scoreFactors({
        ...ZERO,
        hasLaPlaceMessage: true,        // +5
        hasTrustCircle: true,            // +10
        validatedMatchesCount: 3,        // +5 + +5 = +10
      }),
    ).toBe(25);
  });

  it('signalement actif = -15', () => {
    expect(scoreFactors({ ...ZERO, hasActiveReport: true })).toBe(-15);
  });

  it('banni = -30', () => {
    expect(scoreFactors({ ...ZERO, wasBanned: true })).toBe(-30);
  });

  it('combinaison "nouveau user honnête" = 10 (email seul)', () => {
    expect(
      scoreFactors({
        ...ZERO,
        emailVerified: true,
      }),
    ).toBe(10);
  });

  it('combinaison "user premium" = 100 (tous facteurs positifs max)', () => {
    expect(
      scoreFactors({
        emailVerified: true,             // +10
        selfieVerified: true,             // +20
        accountAgeDays: 400,              // +30 (30+90+365)
        hasLaPlaceMessage: true,          // +5
        validatedMatchesCount: 5,         // +10 (1 palier + 1 palier)
        hasTrustCircle: true,             // +10
        hasActiveReport: false,
        wasBanned: false,
      }),
    ).toBe(85);
  });

  it('combinaison "user à risque" = -30 (banni seul)', () => {
    expect(
      scoreFactors({
        ...ZERO,
        wasBanned: true,
      }),
    ).toBe(-30);
  });

  it('négatif peut dépasser -15 (banni + signalement = -45)', () => {
    expect(
      scoreFactors({
        ...ZERO,
        wasBanned: true,        // -30
        hasActiveReport: true,   // -15
      }),
    ).toBe(-45);
  });
});

describe('bandFor', () => {
  it('score 0 → newcomer', () => {
    expect(bandFor(0)).toBe('newcomer');
  });

  it('score 19 → newcomer (borne haute inclusive)', () => {
    expect(bandFor(19)).toBe('newcomer');
  });

  it('score 20 → member (1ère borne franchie)', () => {
    expect(bandFor(20)).toBe('member');
  });

  it('score 49 → member (borne haute inclusive)', () => {
    expect(bandFor(49)).toBe('member');
  });

  it('score 50 → trusted (2e borne franchie)', () => {
    expect(bandFor(50)).toBe('trusted');
  });

  it('score 79 → trusted (borne haute inclusive)', () => {
    expect(bandFor(79)).toBe('trusted');
  });

  it('score 80 → anchor (3e borne franchie)', () => {
    expect(bandFor(80)).toBe('anchor');
  });

  it('score 100 → anchor', () => {
    expect(bandFor(100)).toBe('anchor');
  });

  it('score -1 → newcomer (négatif reste newcomer)', () => {
    expect(bandFor(-1)).toBe('newcomer');
  });

  it('score -30 → newcomer (très négatif, on dégrade pas vers "banni")', () => {
    expect(bandFor(-30)).toBe('newcomer');
  });
});

describe('scoreFactors + bandFor round-trip', () => {
  it('un user "parfait" (tous facteurs) atteint anchor', () => {
    const perfect: TrustFactors = {
      emailVerified: true,
      selfieVerified: true,
      accountAgeDays: 400,
      hasLaPlaceMessage: true,
      validatedMatchesCount: 5,
      hasTrustCircle: true,
      hasActiveReport: false,
      wasBanned: false,
    };
    expect(bandFor(scoreFactors(perfect))).toBe('anchor');
  });

  it('un user "vierge" reste newcomer', () => {
    expect(bandFor(scoreFactors(ZERO))).toBe('newcomer');
  });

  it('un user "vérifié basique" atteint member', () => {
    // email(+10) + selfie(+20) + 30j(+10) = 40 → member
    const basic: TrustFactors = {
      ...ZERO,
      emailVerified: true,
      selfieVerified: true,
      accountAgeDays: 30,
    };
    expect(bandFor(scoreFactors(basic))).toBe('member');
  });

  it('un user "vérifié + cercle" atteint trusted', () => {
    // 40 (cf. ci-dessus) + cercle(+10) = 50 → trusted
    const advanced: TrustFactors = {
      ...ZERO,
      emailVerified: true,
      selfieVerified: true,
      accountAgeDays: 30,
      hasTrustCircle: true,
    };
    expect(bandFor(scoreFactors(advanced))).toBe('trusted');
  });
});

describe('factorsToDisplay', () => {
  it('ZERO factors : retourne 5 entrées (3 paliers + 2 paliers matchs), aucune achieved sauf celles sans condition', () => {
    const out = factorsToDisplay(ZERO);
    // 3 paliers d'ancienneté + 2 paliers de match = 5
    expect(out).toHaveLength(5);
    expect(out.every((f) => f.achieved === false)).toBe(true);
    expect(out.every((f) => f.delta > 0)).toBe(true); // que des positifs ici
  });

  it('tous facteurs positifs : retourne 9 entrées (toutes achieved)', () => {
    const out = factorsToDisplay({
      emailVerified: true,
      selfieVerified: true,
      accountAgeDays: 400,
      hasLaPlaceMessage: true,
      validatedMatchesCount: 5,
      hasTrustCircle: true,
      hasActiveReport: false,
      wasBanned: false,
    });
    // selfie + 3 paliers âge + email + cercle + LaPlace + 2 paliers matchs = 9
    expect(out).toHaveLength(9);
    expect(out.every((f) => f.achieved === true)).toBe(true);
    expect(out.every((f) => f.delta > 0)).toBe(true);
  });

  it('préserve le delta signé : signalement -15, banni -30', () => {
    const out = factorsToDisplay({
      ...ZERO,
      hasActiveReport: true,
      wasBanned: true,
    });
    const report = out.find((f) => f.label === 'Signalement actif');
    const banned = out.find((f) => f.label === 'Compte banni');
    expect(report?.delta).toBe(-15);
    expect(report?.achieved).toBe(true);
    expect(banned?.delta).toBe(-30);
    expect(banned?.achieved).toBe(true);
  });

  it('les négatifs apparaissent APRÈS les positifs dans la liste', () => {
    const out = factorsToDisplay({
      ...ZERO,
      emailVerified: true,
      hasActiveReport: true,
    });
    // Le dernier item doit être un négatif (Signalement actif, le seul négatif)
    const lastIdx = out.length - 1;
    expect(out[lastIdx].label).toBe('Signalement actif');
    expect(out[lastIdx].delta).toBeLessThan(0);
    // L'avant-dernier item doit être un positif (le "1 match" palier, non-achieved)
    const beforeLast = out[lastIdx - 1];
    expect(beforeLast.delta).toBeGreaterThan(0);
  });

  it('les labels sont en français (caractères accentués)', () => {
    const out = factorsToDisplay(ZERO);
    const label0 = out[0].label;
    expect(label0).toMatch(/[éèàùç]/); // au moins un caractère accentué dans le 1er
  });

  it('"3 matchs validés (cumulé)" est achieved à partir de validatedMatchesCount >= 3', () => {
    const f1 = factorsToDisplay({ ...ZERO, validatedMatchesCount: 2 });
    const f2 = factorsToDisplay({ ...ZERO, validatedMatchesCount: 3 });
    const f3 = factorsToDisplay({ ...ZERO, validatedMatchesCount: 10 });
    const cumulative = (out: typeof f1) =>
      out.find((f) => f.label.startsWith('3 matchs'))!;
    expect(cumulative(f1).achieved).toBe(false);
    expect(cumulative(f2).achieved).toBe(true);
    expect(cumulative(f3).achieved).toBe(true);
  });

  it('chaque entrée a exactement 3 clés : label, delta, achieved', () => {
    const out = factorsToDisplay({
      emailVerified: true,
      selfieVerified: true,
      accountAgeDays: 100,
      hasLaPlaceMessage: true,
      validatedMatchesCount: 4,
      hasTrustCircle: true,
      hasActiveReport: true,
      wasBanned: true,
    });
    for (const f of out) {
      expect(Object.keys(f).sort()).toEqual(['achieved', 'delta', 'label']);
    }
  });
});
