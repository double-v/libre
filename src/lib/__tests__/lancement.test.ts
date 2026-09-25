import { describe, it, expect } from 'vitest';
import { LAUNCH_COPY } from '../lancement';

/** Tous les textes, le rayon rendu avec une valeur neutre pour l'inspecter. */
const textes = Object.entries(LAUNCH_COPY).map(([cle, v]) => [cle, typeof v === 'function' ? v(0) : v] as const);

describe('LAUNCH_COPY (#346)', () => {
  it('ne porte aucun chiffre en dur — un compteur qui stagne décourage', () => {
    for (const [cle, texte] of textes) {
      const sansRayon = cle === 'videRayon' ? texte.replace('0 km', ' km') : texte;
      expect(sansRayon, cle).not.toMatch(/\d/);
    }
  });

  it('écrit des phrases complètes, terminées par une ponctuation', () => {
    for (const [cle, texte] of textes) {
      if (cle === 'titre' || cle.startsWith('cta')) continue;
      expect(texte, cle).toMatch(/[.!?]$/);
    }
  });

  it('ne s’excuse pas et ne survend pas', () => {
    for (const [cle, texte] of textes) {
      expect(texte, cle).not.toMatch(/désolé|pardon|bêta|IRL|incroyable|!/i);
    }
  });
});
