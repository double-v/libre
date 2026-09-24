/**
 * #418 — interrupteurs de fonctionnalités, partie pure.
 * Le défaut est « rien ne change » : listes vides ⇒ chaque fonctionnalité à
 * son défaut. Depuis la spec 007 (R4), certaines sont **coupées par défaut**
 * (`journal_comments`) et ne s'allument que par la seconde liste.
 */
import { describe, it, expect } from 'vitest';
import { featuresDepuisConfig, configDepuisFeatures, estFeature, DEFAUTS, FEATURES } from '@/lib/features';

describe('features (#418, spec 007)', () => {
  it('listes vides ou absentes ⇒ les défauts : trois activées, commentaires du journal coupés', () => {
    expect(DEFAUTS).toEqual({ checkin: true, crossings: true, square: true, journal_comments: false });
    expect(featuresDepuisConfig([], [])).toEqual(DEFAUTS);
    expect(featuresDepuisConfig(undefined, undefined)).toEqual(DEFAUTS);
    expect(featuresDepuisConfig(null, null)).toEqual(DEFAUTS);
  });
  it('coupe exactement ce qui est listé, ignore l’inconnu', () => {
    expect(featuresDepuisConfig(['square', 'nimportequoi'], [])).toEqual({ ...DEFAUTS, square: false });
  });
  it('une fonctionnalité coupée par défaut ne s’allume que par la liste des activées', () => {
    expect(featuresDepuisConfig(['journal_comments'], [])).toEqual(DEFAUTS);
    expect(featuresDepuisConfig([], ['journal_comments'])).toEqual({ ...DEFAUTS, journal_comments: true });
    // Une fonctionnalité active par défaut ne se rallume pas par cette liste : elle n'a rien à y faire.
    expect(featuresDepuisConfig(['square'], ['square'])).toEqual({ ...DEFAUTS, square: false });
  });
  it('aller-retour stable vers les deux listes à stocker', () => {
    const f = { checkin: false, crossings: true, square: false, journal_comments: true };
    const c = configDepuisFeatures(f);
    expect(c).toEqual({ featuresDisabled: ['checkin', 'square'], featuresEnabled: ['journal_comments'] });
    expect(featuresDepuisConfig(c.featuresDisabled, c.featuresEnabled)).toEqual(f);
    expect(configDepuisFeatures(DEFAUTS)).toEqual({ featuresDisabled: [], featuresEnabled: [] });
  });
  it('estFeature ne laisse passer que les noms connus', () => {
    expect(FEATURES).toContain('journal_comments');
    expect(estFeature('checkin')).toBe(true);
    expect(estFeature('journal_comments')).toBe(true);
    expect(estFeature('place')).toBe(false);
    expect(estFeature(42)).toBe(false);
  });
});
