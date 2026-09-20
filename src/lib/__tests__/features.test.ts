/**
 * #418 — interrupteurs de fonctionnalités, partie pure.
 * Le défaut est « rien ne change » : liste vide ⇒ tout actif.
 */
import { describe, it, expect } from 'vitest';
import { featuresDepuisConfig, configDepuisFeatures, estFeature, TOUTES_ACTIVEES } from '@/lib/features';

describe('features (#418)', () => {
  it('liste vide ou absente ⇒ tout est actif', () => {
    expect(featuresDepuisConfig([])).toEqual(TOUTES_ACTIVEES);
    expect(featuresDepuisConfig(undefined)).toEqual(TOUTES_ACTIVEES);
    expect(featuresDepuisConfig(null)).toEqual(TOUTES_ACTIVEES);
  });
  it('coupe exactement ce qui est listé, ignore l’inconnu', () => {
    expect(featuresDepuisConfig(['square', 'nimportequoi'])).toEqual({ checkin: true, crossings: true, square: false });
  });
  it('aller-retour stable vers la liste à stocker', () => {
    const f = { checkin: false, crossings: true, square: false };
    expect(configDepuisFeatures(f)).toEqual(['checkin', 'square']);
    expect(featuresDepuisConfig(configDepuisFeatures(f))).toEqual(f);
  });
  it('estFeature ne laisse passer que les trois noms', () => {
    expect(estFeature('checkin')).toBe(true);
    expect(estFeature('place')).toBe(false);
    expect(estFeature(42)).toBe(false);
  });
});
