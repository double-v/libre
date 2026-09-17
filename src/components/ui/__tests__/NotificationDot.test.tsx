/**
 * Tests — NotificationDot (DESIGN.md § NotificationDot, #389).
 *
 * Une pastille de présence, jamais un compteur : pas de texte, pas de nombre,
 * pas d'animation. L'`aria-label` est obligatoire — une pastille muette pour un
 * lecteur d'écran serait une information réservée aux voyants.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationDot from '../NotificationDot';

describe('<NotificationDot />', () => {
  it('rend un status avec son libellé accessible et aucun texte visible', () => {
    render(<NotificationDot aria-label="Nouveaux messages" />);
    const dot = screen.getByRole('status', { name: 'Nouveaux messages' });
    expect(dot.textContent).toBe('');
  });

  it('est absolu par défaut, inline sur demande', () => {
    const { rerender } = render(<NotificationDot aria-label="x" />);
    expect(screen.getByRole('status').className).toMatch(/absolute/);
    rerender(<NotificationDot aria-label="x" inline />);
    expect(screen.getByRole('status').className).not.toMatch(/absolute/);
    expect(screen.getByRole('status').className).toMatch(/inline-block/);
  });

  it("n'a aucune animation, et n'utilise que des tokens (bg-coral)", () => {
    render(<NotificationDot aria-label="x" />);
    const cls = screen.getByRole('status').className;
    expect(cls).not.toMatch(/animate-/);
    expect(cls).toMatch(/bg-coral/);
    expect(cls).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});
