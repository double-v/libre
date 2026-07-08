/**
 * Tests — page « Comment marche la confiance » (issue #162).
 *
 * Page explicative statique : on verrouille qu'elle présente bien les 4 niveaux,
 * les facteurs de score clés (miroir de compute-level.ts), le Cercle, et un lien
 * retour vers /settings/trust — en français, avec les tokens design.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrustHowItWorksPage from '../page';

describe('<TrustHowItWorksPage />', () => {
  it('présente les 4 niveaux de confiance', () => {
    render(<TrustHowItWorksPage />);
    for (const label of ['Nouveau', 'Membre', 'Fiable', 'Ancre']) {
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    }
  });

  it('affiche les facteurs de score clés (miroir de compute-level)', () => {
    render(<TrustHowItWorksPage />);
    expect(screen.getByText('+20')).toBeInTheDocument(); // selfie
    expect(screen.getByText('+10 / +10 / +10')).toBeInTheDocument(); // ancienneté
    // Les malus sont mentionnés dans le paragraphe (signalement / banni).
    expect(screen.getByText(/signalement actif/i)).toBeInTheDocument();
    expect(screen.getByText(/−30|−15/)).toBeInTheDocument();
  });

  it('explique le Cercle de Confiance', () => {
    render(<TrustHowItWorksPage />);
    expect(screen.getByText(/Cercle de Confiance/)).toBeInTheDocument();
    expect(screen.getByText(/contacts de confiance/i)).toBeInTheDocument();
  });

  it('propose un lien retour vers /settings/trust', () => {
    render(<TrustHowItWorksPage />);
    const link = screen.getByRole('link', { name: /mon niveau et mon Cercle/i });
    expect(link).toHaveAttribute('href', '/settings/trust');
  });

  it('utilise les tokens design (blush/coral), pas de gris brut de fond', () => {
    const { container } = render(<TrustHowItWorksPage />);
    expect(container.innerHTML).toMatch(/bg-blush/);
    expect(container.innerHTML).not.toMatch(/bg-gray-\d00\b/);
  });
});
