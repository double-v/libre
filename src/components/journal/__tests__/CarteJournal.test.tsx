/**
 * CarteJournal (spec 007, US1) — une entrée de la liste publique.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CarteJournal from '../CarteJournal';

describe('<CarteJournal />', () => {
  it('date longue en français, titre, extrait, lien vers la publication', () => {
    render(<CarteJournal slug="merci" titre="Plus de 100 : merci !" extrait="Libre a passé le cap." publieeAt={new Date('2026-09-28T22:30:00Z')} />);
    const lien = screen.getByRole('link');
    expect(lien).toHaveAttribute('href', '/journal/merci');
    expect(screen.getByRole('heading', { name: 'Plus de 100 : merci !' })).toBeInTheDocument();
    expect(screen.getByText('Libre a passé le cap.')).toBeInTheDocument();
    // 22 h 30 UTC = le 29 à Paris : la date affichée est celle des lecteurs.
    const date = screen.getByText('29 septembre 2026');
    expect(date.tagName).toBe('TIME');
    expect(date).toHaveAttribute('datetime', '2026-09-28T22:30:00.000Z');
  });
});
