/**
 * #425 — la politique nomme la vraie base légale des données de vie sexuelle.
 *
 * Orientation, genre et pratiques étaient rangés sous « exécution du
 * contrat » : l'art. 9 exige un consentement explicite, et la page doit le
 * dire, avec le retrait et son effet.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Confidentialite from '@/app/(legal)/confidentialite/page';

describe('page Confidentialité — art. 9', () => {
  it('fonde orientation, genre et pratiques sur le consentement explicite (art. 9(2)(a))', () => {
    render(<Confidentialite />);
    expect(screen.getByText('Art. 9(2)(a)')).toBeInTheDocument();
    expect(screen.getByText(/Orientation sexuelle, identité de genre, pratiques/)).toBeInTheDocument();
  });

  it('dit où retirer ce consentement et que le retrait efface les champs', () => {
    render(<Confidentialite />);
    expect(screen.getByText(/Données sensibles/)).toBeInTheDocument();
    expect(screen.getByText(/Ces champs sont effacés aussitôt/)).toBeInTheDocument();
  });
});
