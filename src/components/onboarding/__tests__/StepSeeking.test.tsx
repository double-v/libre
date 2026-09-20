/**
 * Tests — étape « ce que tu cherches » (spec 005, FR-008) : une saisie, deux
 * cibles — ce que je déclare et ce que je cherche.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StepSeeking from '../StepSeeking';
import { RELATIONSHIP_TYPE_OPTIONS, ORIENTATION_OPTIONS, GENDER_OPTIONS } from '@/lib/taxonomy';

describe('<StepSeeking />', () => {
  it('propose les trois taxonomies du profil, sans « je ne souhaite pas le préciser »', () => {
    render(<StepSeeking onContinue={vi.fn()} onLater={vi.fn()} />);
    // « Autre » existe dans les trois listes : on compte, on ne cherche pas l'unique.
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    for (const opt of RELATIONSHIP_TYPE_OPTIONS) {
      expect(screen.getAllByRole('button', { name: cap(opt) }).length).toBeGreaterThan(0);
    }
    for (const opt of ORIENTATION_OPTIONS) {
      expect(screen.getAllByRole('button', { name: cap(opt) }).length).toBeGreaterThan(0);
    }
    const genders = GENDER_OPTIONS.filter((g) => g.value !== '');
    for (const g of genders) expect(screen.getAllByRole('button', { name: g.label }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Autre' })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Je ne souhaite pas le préciser' })).toBeNull();
  });

  it('« Continuer » envoie le type de relation vers le profil ET les filtres', async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    render(<StepSeeking onContinue={onContinue} onLater={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Libre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Poly' }));
    fireEvent.click(screen.getByRole('button', { name: 'Femme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bi' }));
    // « Autre » de l'orientation (3e liste), pas celui du type de relation.
    fireEvent.click(screen.getAllByRole('button', { name: 'Autre' })[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith({
      relationshipType: ['libre', 'poly'],
      searchRelationshipTypes: ['libre', 'poly'],
      searchGenders: ['femme'],
      searchOrientations: ['bi', 'autre'],
    }));
  });

  it('« Plus tard » n’envoie rien', () => {
    const onContinue = vi.fn();
    const onLater = vi.fn();
    render(<StepSeeking onContinue={onContinue} onLater={onLater} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(onContinue).not.toHaveBeenCalled();
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});
