/**
 * Test de non-régression sur la page Confidentialité (#368 / corollaire #328).
 *
 * La page doit refléter la posture réelle de la messagerie : E2E par défaut,
 * service ne peut pas lire actuellement, vault activable avec notification.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfidentialitePage from '../confidentialite/page';

describe('ConfidentialitePage — posture messagerie', () => {
  it('indique que les messages sont chiffrés de bout en bout par défaut', () => {
    render(<ConfidentialitePage />);
    expect(screen.getByText(/chiffrés de bout en bout par défaut/i)).toBeInTheDocument();
  });

  it('indique que le serveur ne peut pas lire les messages actuellement', () => {
    render(<ConfidentialitePage />);
    expect(screen.getByText(/serveur ne peut pas les lire actuellement/i)).toBeInTheDocument();
  });

  it("mentionne la possibilité d'activation du vault pour les conversations futures", () => {
    render(<ConfidentialitePage />);
    expect(screen.getByText(/dépôt sécurisé \(vault\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/notification préalable/i).length).toBeGreaterThanOrEqual(1);
  });

  it('ne promet pas un E2E absolu sans exception', () => {
    render(<ConfidentialitePage />);
    expect(screen.queryByText(/personne d\'autre ne peut les lire/i)).toBeNull();
    expect(screen.queryByText(/impossible à lire/i)).toBeNull();
  });
});
