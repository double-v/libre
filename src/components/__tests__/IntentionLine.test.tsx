/**
 * Tests — ligne d'intention de la fiche (spec 008, #452/#453).
 *
 * Trois états, dérivés de la réponse serveur : visible, voilée pour la
 * lectrice (invitation), rien de renseigné (rien du tout).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IntentionLine from '../IntentionLine';
import { MIRROR_COPY } from '@/lib/onboarding';

describe('<IntentionLine />', () => {
  it('affiche les intentions, en capitale, séparées', () => {
    render(<IntentionLine relationshipType={['sérieux', 'je verrai en chemin']} />);
    expect(screen.getByText('Sérieux · Je verrai en chemin')).toBeInTheDocument();
  });

  it('voilée : invitation et lien vers le choix de sa propre intention, sans valeur', () => {
    render(<IntentionLine veiled />);
    expect(screen.getByText(MIRROR_COPY.intentionProfile)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Préciser' });
    expect(link).toHaveAttribute('href', '/profile#profile-section-seeking');
  });

  it('rien de renseigné : rien du tout', () => {
    const { container } = render(<IntentionLine relationshipType={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
