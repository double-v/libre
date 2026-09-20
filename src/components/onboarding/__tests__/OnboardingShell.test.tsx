/**
 * Tests — cadre commun du parcours d'accueil (spec 005).
 * « Plus tard » est toujours là, jamais désactivé : aucune étape ne bloque.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingShell from '../OnboardingShell';

describe('<OnboardingShell />', () => {
  it('rend titre, lead, eyebrow et les trois segments avec l’étape courante', () => {
    const { container } = render(
      <OnboardingShell step={1} eyebrow="Bienvenue, Noor" title="Ce que tu cherches" lead="Les autres sauront." onLater={() => {}}>
        <p>contenu</p>
      </OnboardingShell>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Ce que tu cherches' })).toBeInTheDocument();
    expect(screen.getByText('Les autres sauront.')).toBeInTheDocument();
    expect(screen.getByText('Bienvenue, Noor')).toBeInTheDocument();
    const segments = container.querySelectorAll('[data-testid="onboarding-progress"] > i');
    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveAttribute('data-state', 'done');
    expect(segments[1]).toHaveAttribute('data-state', 'on');
    expect(segments[2]).toHaveAttribute('data-state', 'todo');
    // La progression se sent, elle ne se compte pas.
    expect(container.querySelector('[data-testid="onboarding-progress"]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText(/sur 3/)).toBeNull();
  });

  it('« Plus tard » est présent, jamais désactivé, et appelle onLater', () => {
    const onLater = vi.fn();
    render(<OnboardingShell step={0} title="T" lead="L" onLater={onLater} primary={{ label: 'Continuer', onClick: () => {}, disabled: true }}><p /></OnboardingShell>);
    const later = screen.getByRole('button', { name: 'Plus tard' });
    expect(later).not.toBeDisabled();
    fireEvent.click(later);
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('sans step (écran push), aucun segment', () => {
    const { container } = render(<OnboardingShell title="T" lead="L" onLater={() => {}}><p /></OnboardingShell>);
    expect(container.querySelector('[data-testid="onboarding-progress"]')).toBeNull();
  });
});
