/**
 * ProfileSection — picto, badge d'état, résumé replié, ancre sur la section (#413).
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileSection from '@/components/ProfileSection';

describe('ProfileSection — lecture d’un coup d’œil (#413)', () => {
  it('badge « À compléter » coral et bordure coral quand status=todo', () => {
    const { container } = render(<ProfileSection title="Photos" status="todo" sectionId="photos"><p>x</p></ProfileSection>);
    expect(screen.getByTestId('section-status')).toHaveTextContent('À compléter');
    expect(container.querySelector('section')).toHaveAttribute('data-status', 'todo');
    expect(container.querySelector('section')).toHaveClass('border-coral/45');
  });

  it('libellé todo personnalisable, « Réglé » et « Facultatif » en gris', () => {
    const { rerender } = render(<ProfileSection title="Position" status="todo" todoLabel="À indiquer"><p>x</p></ProfileSection>);
    expect(screen.getByTestId('section-status')).toHaveTextContent('À indiquer');
    rerender(<ProfileSection title="P" status="set"><p>x</p></ProfileSection>);
    expect(screen.getByTestId('section-status')).toHaveTextContent('Réglé');
    rerender(<ProfileSection title="P" status="optional"><p>x</p></ProfileSection>);
    expect(screen.getByTestId('section-status')).toHaveTextContent('Facultatif');
  });

  it('repliée, montre le résumé ; dépliée, le contenu — l’ancre reste sur la section', () => {
    const { container } = render(
      <ProfileSection title="Pratiques" sectionId="practices" defaultOpen={false} summary="Aucune pratique · visibles par mes matches">
        <p>contenu détaillé</p>
      </ProfileSection>,
    );
    expect(screen.getByText('Aucune pratique · visibles par mes matches')).toBeInTheDocument();
    expect(screen.queryByText('contenu détaillé')).toBeNull();
    expect(container.querySelector('#profile-section-practices')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('contenu détaillé')).toBeInTheDocument();
    expect(screen.queryByText('Aucune pratique · visibles par mes matches')).toBeNull();
  });

  it('rend le picto à côté du titre, masqué aux lecteurs d’écran', () => {
    render(<ProfileSection title="Bio" icon={<svg data-testid="ico" aria-hidden="true" />}><p>x</p></ProfileSection>);
    expect(screen.getByTestId('ico')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bio' })).toBeInTheDocument();
  });
});
