import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicProfilePreview from '@/components/PublicProfilePreview';

const baseProfile = {
  displayName: 'Camille',
  age: 28,
  bio: 'Cherche un binôme pour des randos.',
  photos: ['photo1.jpg', 'photo2.jpg'],
  interests: ['rando', 'cinema'],
  isVerified: true,
  distanceKm: 1.2,
};

describe('PublicProfilePreview', () => {
  it('renders the display name and age prominently', () => {
    render(<PublicProfilePreview {...baseProfile} />);
    // The header should be a heading (h2 or h3) for screen readers
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toMatch(/Camille.*28/);
  });

  it('shows the bio when present', () => {
    render(<PublicProfilePreview {...baseProfile} />);
    expect(screen.getByText(/Cherche un binôme/)).toBeInTheDocument();
  });

  it('hides the bio line when bio is empty (no "Non renseigné" placeholder)', () => {
    render(<PublicProfilePreview {...baseProfile} bio="" />);
    expect(screen.queryByText(/Non renseigné/)).not.toBeInTheDocument();
  });

  it('shows a verification badge when isVerified is true', () => {
    const { container } = render(<PublicProfilePreview {...baseProfile} isVerified />);
    // The badge uses title="Profil vérifié" + text "✓ Vérifié"
    expect(container.querySelector('[title="Profil vérifié"]')).toBeInTheDocument();
  });

  it('hides the verification badge when isVerified is false', () => {
    const { container } = render(<PublicProfilePreview {...baseProfile} isVerified={false} />);
    expect(container.querySelector('[title="Profil vérifié"]')).not.toBeInTheDocument();
  });

  it('shows interest chips when interests are provided', () => {
    render(<PublicProfilePreview {...baseProfile} />);
    expect(screen.getByText('rando')).toBeInTheDocument();
    expect(screen.getByText('cinema')).toBeInTheDocument();
  });

  it('does not render Like/Pass buttons (preview only, no actions)', () => {
    render(<PublicProfilePreview {...baseProfile} />);
    expect(screen.queryByRole('button', { name: /like/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /passer/i })).not.toBeInTheDocument();
  });

  it('shows distance when distanceKm is provided', () => {
    render(<PublicProfilePreview {...baseProfile} distanceKm={1.2} />);
    expect(screen.getByText(/1\.2 km/)).toBeInTheDocument();
  });

  it('has aria-label "Aperçu public de votre profil" for the container', () => {
    const { container } = render(<PublicProfilePreview {...baseProfile} />);
    const region = container.querySelector('[aria-label*="Aperçu public"]');
    expect(region).toBeInTheDocument();
  });
});
