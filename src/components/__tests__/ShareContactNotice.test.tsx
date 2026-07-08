/**
 * Tests composant — ShareContactNotice (issue #207).
 *
 * Régression du bug : un partage de réseaux ne doit JAMAIS s'afficher en JSON
 * brut ({"type":"share-contact",...}). On rend un badge système lisible, en
 * français, avec les tokens design (blush/coral), et une copie différente selon
 * qu'on est l'émetteur ou le destinataire.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShareContactNotice from '../ShareContactNotice';

describe('<ShareContactNotice />', () => {
  it('destinataire : mentionne le nom de l’autre, propose l’échange', () => {
    render(<ShareContactNotice isSent={false} otherName="Camille" />);
    expect(screen.getByText(/Camille/)).toBeInTheDocument();
    expect(screen.getByText(/réseaux/i)).toBeInTheDocument();
  });

  it('émetteur : copie à la première personne (« Tu »)', () => {
    render(<ShareContactNotice isSent otherName="Camille" />);
    expect(screen.getByText(/^Tu/)).toBeInTheDocument();
  });

  it('n’affiche JAMAIS le JSON brut', () => {
    const { container } = render(<ShareContactNotice isSent={false} otherName="Camille" />);
    expect(container.textContent).not.toContain('share-contact');
    expect(container.textContent).not.toContain('{');
  });

  it('utilise les tokens design (blush/coral), pas de gris brut', () => {
    const { container } = render(<ShareContactNotice isSent={false} otherName="Camille" />);
    const html = container.innerHTML;
    expect(html).toMatch(/bg-blush/);
    expect(html).not.toMatch(/bg-gray-\d/);
  });
});
