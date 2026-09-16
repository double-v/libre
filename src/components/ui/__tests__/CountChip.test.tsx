/**
 * Tests — CountChip (DESIGN.md § CountChip, #389/#391).
 *
 * Compteur de file de travail, admin uniquement. Zéro = rien à afficher (pas de
 * « 0 » ni de pill vide) ; au-delà de 99 on plafonne, une file admin n'a pas
 * besoin d'un chiffre exact à quatre chiffres pour dire « beaucoup ».
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountChip from '../CountChip';

describe('<CountChip />', () => {
  it('rend le nombre avec un libellé « N en attente »', () => {
    render(<CountChip count={3} />);
    const chip = screen.getByLabelText('3 en attente');
    expect(chip.textContent).toBe('3');
  });

  it('ne rend rien pour zéro', () => {
    const { container } = render(<CountChip count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('plafonne à 99+', () => {
    render(<CountChip count={250} />);
    expect(screen.getByLabelText('250 en attente').textContent).toBe('99+');
  });

  it('tokens seulement, aucune animation', () => {
    render(<CountChip count={1} />);
    const cls = screen.getByLabelText('1 en attente').className;
    expect(cls).toMatch(/bg-coral/);
    expect(cls).not.toMatch(/animate-/);
  });
});
