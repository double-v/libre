/**
 * ProfileGlance (#413) — « Ce qui permet d'être choisi·e » : trois tuiles,
 * coral = à faire, vert = fait, chacune mène à sa section. Aucun chiffre.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileGlance from '../ProfileGlance';

const empty = { photos: [], relationshipType: [], lastGeolocAt: null, cityLabel: null };

describe('<ProfileGlance />', () => {
  it('trois tuiles à faire sur un profil vide, chacune vers sa section', () => {
    render(<ProfileGlance profile={empty} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '#profile-section-photos', '#profile-section-seeking', '#profile-section-position',
    ]);
    expect(links.every((l) => l.getAttribute('data-state') === 'todo')).toBe(true);
    expect(screen.getByText('Une photo')).toBeInTheDocument();
    expect(screen.getByText('Ce que je cherche')).toBeInTheDocument();
    expect(screen.getByText('Où je suis')).toBeInTheDocument();
  });

  it('une tuile passe « fait » quand l’élément existe — une ville vaut une position', () => {
    render(<ProfileGlance profile={{ ...empty, photos: ['a'], cityLabel: 'Nantes (44)' }} />);
    const states = screen.getAllByRole('link').map((l) => l.getAttribute('data-state'));
    expect(states).toEqual(['done', 'todo', 'done']);
  });

  it('tout fait → la ligne d’en-tête change et rien ne compte', () => {
    render(<ProfileGlance profile={{ ...empty, photos: ['a'], relationshipType: ['libre'], lastGeolocAt: new Date() }} />);
    expect(screen.getByText(/Ton profil peut être choisi/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d+\s*(\/|%)/);
  });
});
