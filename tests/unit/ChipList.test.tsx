import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChipList from '@/components/ChipList';

describe('ChipList', () => {
  it('renders items as chips', () => {
    render(<ChipList items={['Cinéma', 'Rando', 'Cuisine']} />);
    expect(screen.getByText('Cinéma')).toBeInTheDocument();
    expect(screen.getByText('Rando')).toBeInTheDocument();
    expect(screen.getByText('Cuisine')).toBeInTheDocument();
  });

  it('shows "Non renseigné" when items empty', () => {
    render(<ChipList items={[]} />);
    expect(screen.getByText('Non renseigné')).toBeInTheDocument();
  });

  it('practices variant applies sand bg class to chips', () => {
    const { container } = render(
      <ChipList items={['Yoga']} variant="practices" />,
    );
    const chip = container.querySelector('span[class*="bg-sand"]');
    expect(chip).toBeInTheDocument();
    expect(chip?.textContent).toBe('Yoga');
  });
});