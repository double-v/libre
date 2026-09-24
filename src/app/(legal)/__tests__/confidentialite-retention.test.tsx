/**
 * #427 — §5 et la purge lisent la même liste.
 *
 * Une durée promise sans purge, ou purgée sans promesse, ne peut plus exister
 * sans casser ce test : la page rend chaque règle de `REGLES_RETENTION`, avec
 * sa durée telle quelle. Les données jamais purgées par une règle (compte,
 * messages, jeton e-mail sans état) restent des lignes fixes.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Confidentialite from '@/app/(legal)/confidentialite/page';
import { REGLES_RETENTION } from '@/lib/retention/regles';

describe('page Confidentialité — durées de conservation', () => {
  it('rend chaque règle de rétention avec sa durée', () => {
    render(<Confidentialite />);
    for (const r of REGLES_RETENTION) {
      const ligne = document.querySelector(`[data-retention="${r.id}"]`);
      expect(ligne, r.id).not.toBeNull();
      expect(ligne!.textContent).toContain(r.donnees);
      expect(ligne!.textContent).toContain(r.duree);
    }
  });

  it('couvre les positions horodatées (croisements, check-ins) et la trace du consentement', () => {
    render(<Confidentialite />);
    expect(screen.getByText(/Croisements/)).toBeInTheDocument();
    expect(screen.getByText(/Check-ins de sécurité/)).toBeInTheDocument();
    expect(screen.getByText(/Trace technique du consentement/)).toBeInTheDocument();
  });

  it('messages : ne promet plus de « suppression de la conversation », geste qui n’existe pas (#202)', () => {
    render(<Confidentialite />);
    const ligne = screen.getByText('Messages (chiffrés E2E)').closest('tr')!;
    expect(ligne.textContent).not.toMatch(/suppression[^.]*de la conversation/);
    expect(ligne.textContent).toMatch(/blocage/);
    expect(ligne.textContent).toMatch(/suppression du compte/);
  });
});
