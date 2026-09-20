/**
 * Tests — carte de relance (spec 005, FR-017 à FR-020). Parle du profil de la
 * personne, et d'elle seule : aucun chiffre, aucune référence aux autres.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileNudgeCard from '../ProfileNudgeCard';
import { NUDGE_COPY, type MissingKind } from '@/lib/onboarding';

const kinds = Object.keys(NUDGE_COPY) as MissingKind[];

describe('<ProfileNudgeCard />', () => {
  it.each(kinds)('%s : copie, lien vers la section du profil, aucun chiffre', (kind) => {
    render(<ProfileNudgeCard kind={kind} onDismiss={() => {}} />);
    const card = screen.getByLabelText('Compléter ton profil');
    expect(card).toHaveTextContent(NUDGE_COPY[kind].title);
    expect(card).toHaveTextContent(NUDGE_COPY[kind].body);
    expect(screen.getByRole('link', { name: NUDGE_COPY[kind].cta })).toHaveAttribute('href', NUDGE_COPY[kind].href);
    expect(card.textContent).not.toMatch(/\d/);
  });

  it('« Plus tard » écarte', () => {
    const onDismiss = vi.fn();
    render(<ProfileNudgeCard kind="photo" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
