import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileSection from '@/components/ProfileSection';

describe('ProfileSection', () => {
  it('renders title and children', () => {
    render(
      <ProfileSection title="À propos">
        <p>Contenu de la section</p>
      </ProfileSection>,
    );

    expect(screen.getByText('À propos')).toBeInTheDocument();
    expect(screen.getByText('Contenu de la section')).toBeInTheDocument();
  });

  it('shows pencil button when onEdit provided and not editing', () => {
    const onEdit = vi.fn();
    render(
      <ProfileSection title="À propos" onEdit={onEdit}>
        <p>Contenu</p>
      </ProfileSection>,
    );

    const button = screen.getByLabelText('Modifier À propos');
    expect(button).toBeInTheDocument();
  });

  it('hides pencil button when editing', () => {
    const onEdit = vi.fn();
    render(
      <ProfileSection title="À propos" onEdit={onEdit} editing>
        <p>Contenu</p>
      </ProfileSection>,
    );

    expect(screen.queryByLabelText('Modifier À propos')).not.toBeInTheDocument();
  });

  it('hides pencil when no onEdit', () => {
    render(
      <ProfileSection title="À propos">
        <p>Contenu</p>
      </ProfileSection>,
    );

    expect(screen.queryByLabelText('Modifier À propos')).not.toBeInTheDocument();
  });

  it('applies blush surface class on the section element', () => {
    const { container } = render(
      <ProfileSection title="À propos" surface="blush">
        <p>Contenu</p>
      </ProfileSection>,
    );

    const section = container.querySelector('section');
    expect(section?.className).toContain('bg-blush');
  });

  it('applies sand surface class on the section element', () => {
    const { container } = render(
      <ProfileSection title="À propos" surface="sand">
        <p>Contenu</p>
      </ProfileSection>,
    );

    const section = container.querySelector('section');
    expect(section?.className).toContain('bg-sand');
  });
});