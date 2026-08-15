/**
 * Tests — décision de service d'une photo sensible (#330).
 *
 * C'est la fonction qui décide si l'octet original quitte le serveur : elle est
 * testée d'abord, et sur le **sens de l'échec** autant que sur le cas nominal.
 */
import { describe, it, expect } from 'vitest';
import {
  canSeeOriginal,
  blurredKeyFor,
  DEFAULT_SENSITIVITY_THRESHOLD,
  isSensitivityLevel,
  isSensitivityThreshold,
} from '../photo-sensitivity';

const VISITEUR = { isOwner: false, isAdmin: false, reveal: false };

describe('canSeeOriginal — photo non classée', () => {
  it('ne change rien au comportement d\'avant la feature', () => {
    for (const level of [null, undefined, '']) {
      expect(canSeeOriginal({ ...VISITEUR, level, viewerThreshold: 'none' })).toBe(true);
    }
  });
});

describe('canSeeOriginal — seuil du lecteur', () => {
  it('refuse tout contenu classé au seuil par défaut', () => {
    expect(DEFAULT_SENSITIVITY_THRESHOLD).toBe('none');
    expect(canSeeOriginal({ ...VISITEUR, level: 'suggestive', viewerThreshold: 'none' })).toBe(false);
    expect(canSeeOriginal({ ...VISITEUR, level: 'explicit', viewerThreshold: 'none' })).toBe(false);
  });

  it('ouvre le suggestif sans ouvrir l\'explicite', () => {
    expect(canSeeOriginal({ ...VISITEUR, level: 'suggestive', viewerThreshold: 'suggestive' })).toBe(true);
    expect(canSeeOriginal({ ...VISITEUR, level: 'explicit', viewerThreshold: 'suggestive' })).toBe(false);
  });

  it('ouvre tout au seuil maximal', () => {
    expect(canSeeOriginal({ ...VISITEUR, level: 'suggestive', viewerThreshold: 'explicit' })).toBe(true);
    expect(canSeeOriginal({ ...VISITEUR, level: 'explicit', viewerThreshold: 'explicit' })).toBe(true);
  });
});

describe('canSeeOriginal — propriétaire et admin', () => {
  it('laisse toujours voir ses propres photos, quel que soit son seuil', () => {
    expect(canSeeOriginal({
      level: 'explicit', viewerThreshold: 'none', isOwner: true, isAdmin: false, reveal: false,
    })).toBe(true);
  });

  it('laisse l\'admin voir l\'original : il ne peut pas modérer ce qu\'il ne voit pas', () => {
    expect(canSeeOriginal({
      level: 'explicit', viewerThreshold: 'none', isOwner: false, isAdmin: true, reveal: false,
    })).toBe(true);
  });
});

describe('canSeeOriginal — le clic « Voir »', () => {
  it('révèle même quand le seuil du lecteur dit non (le flou est une porte)', () => {
    expect(canSeeOriginal({
      level: 'explicit', viewerThreshold: 'none', isOwner: false, isAdmin: false, reveal: true,
    })).toBe(true);
  });

  it('sans le geste, rien ne part — c\'est la propriété qui compte', () => {
    expect(canSeeOriginal({
      level: 'explicit', viewerThreshold: 'none', isOwner: false, isAdmin: false, reveal: false,
    })).toBe(false);
  });
});

describe('canSeeOriginal — valeurs inattendues', () => {
  it('traite un niveau inconnu comme le plus fort', () => {
    // Donnée héritée ou écrite à la main : elle ne doit pas ouvrir une brèche.
    expect(canSeeOriginal({ ...VISITEUR, level: 'nimportequoi', viewerThreshold: 'suggestive' })).toBe(false);
    expect(canSeeOriginal({ ...VISITEUR, level: 'nimportequoi', viewerThreshold: 'explicit' })).toBe(true);
  });

  it('traite un seuil inconnu comme le refus', () => {
    for (const viewerThreshold of ['tout', 'EXPLICIT', null, undefined, '']) {
      expect(canSeeOriginal({ ...VISITEUR, level: 'suggestive', viewerThreshold })).toBe(false);
    }
  });
});

describe('blurredKeyFor', () => {
  it('insère le marqueur avant l\'extension', () => {
    expect(blurredKeyFor('abc/1234.jpg')).toBe('abc/1234.blur.jpg');
    expect(blurredKeyFor('abc/1234.webp')).toBe('abc/1234.blur.webp');
  });

  it('reste utilisable sur une clé sans extension', () => {
    expect(blurredKeyFor('abc/1234')).toBe('abc/1234.blur');
  });

  it('ne se laisse pas berner par un point dans le dossier', () => {
    expect(blurredKeyFor('a.b/1234.jpg')).toBe('a.b/1234.blur.jpg');
  });
});

describe('gardes de type', () => {
  it('reconnaît les niveaux et seuils valides, et rien d\'autre', () => {
    expect(isSensitivityLevel('suggestive')).toBe(true);
    expect(isSensitivityLevel('none')).toBe(false);
    expect(isSensitivityThreshold('none')).toBe(true);
    expect(isSensitivityThreshold('nimportequoi')).toBe(false);
  });
});
